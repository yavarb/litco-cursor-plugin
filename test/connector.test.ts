import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ApiError,
  ConfigError,
  LitcoClient,
  credentialsPath,
  resolveBaseUrl,
  resolveCredential,
  saveCredential,
  tokenKind,
} from "../src/client.js";
import { login } from "../src/login.js";
import { registerTools } from "../src/mcp-server.js";

const LKU = "lku_" + "A".repeat(43);
const LKF = "lkf_" + "B".repeat(43);

function fakeServer() {
  const names: string[] = [];
  return {
    names,
    server: { registerTool: (name: string) => names.push(name) } as never,
  };
}

describe("credentials", () => {
  it("classifies tokens by shape", () => {
    expect(tokenKind(LKU)).toBe("connection");
    expect(tokenKind(LKF)).toBe("firm_key");
    expect(tokenKind("lkm_" + "C".repeat(43))).toBeNull();
    expect(tokenKind("lku_short")).toBeNull();
  });

  it("prefers LITCO_CONNECTION_TOKEN, then LITCO_API_KEY", async () => {
    expect((await resolveCredential({ LITCO_CONNECTION_TOKEN: LKU, LITCO_API_KEY: LKF }))?.kind).toBe("connection");
    expect((await resolveCredential({ LITCO_API_KEY: LKF, XDG_CONFIG_HOME: "/nonexistent" }))?.kind).toBe("firm_key");
  });

  it("refuses a mislabelled token", async () => {
    await expect(resolveCredential({ LITCO_CONNECTION_TOKEN: LKF })).rejects.toBeInstanceOf(ConfigError);
    await expect(resolveCredential({ LITCO_API_KEY: LKU })).rejects.toBeInstanceOf(ConfigError);
  });

  it("saves the login token 0600 and reads it back", async () => {
    const dir = await mkdtemp(join(tmpdir(), "litco-"));
    const env = { XDG_CONFIG_HOME: dir };
    const path = await saveCredential(LKU, "https://app.litco.ai", env);
    expect(path).toBe(credentialsPath(env));
    expect((await stat(path)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(path, "utf8")).token).toBe(LKU);
    expect((await resolveCredential(env))?.source).toBe("file");
  });

  it("requires https except on localhost", () => {
    expect(resolveBaseUrl({})).toBe("https://app.litco.ai");
    expect(resolveBaseUrl({ LITCO_API_BASE_URL: "http://localhost:3000" })).toBe("http://localhost:3000");
    expect(() => resolveBaseUrl({ LITCO_API_BASE_URL: "http://app.litco.ai" })).toThrow(ConfigError);
  });
});

describe("LitcoClient", () => {
  it("sends only the bearer — never an acting-for header — and refuses redirects", async () => {
    let seen: RequestInit | undefined;
    const client = new LitcoClient("https://app.litco.ai", { kind: "connection", token: LKU, source: "env:LITCO_CONNECTION_TOKEN" }, (async (
      _url: string,
      init: RequestInit,
    ) => {
      seen = init;
      return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
    }) as never);
    await client.request("/api/me");
    const headers = seen?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${LKU}`);
    expect(Object.keys(headers).some((h) => h.startsWith("x-litkit-"))).toBe(false);
    expect(seen?.redirect).toBe("error");
  });

  it("turns a refusal into a plain explanation without echoing the token", async () => {
    const client = new LitcoClient("https://app.litco.ai", { kind: "connection", token: LKU, source: "file" }, (async () =>
      new Response(JSON.stringify({ error: "connection_token_forbidden" }), { status: 403 })) as never);
    const e = (await client.request("/api/admin/users").catch((x: unknown) => x)) as ApiError;
    expect(e).toBeInstanceOf(ApiError);
    expect(e.message).toMatch(/browser-only/);
    expect(e.message).not.toContain(LKU);
  });
});

describe("tool registry", () => {
  const conn = new LitcoClient("https://x.litco.ai", { kind: "connection", token: LKU, source: "file" });
  const firm = new LitcoClient("https://x.litco.ai", { kind: "firm_key", token: LKF, source: "env:LITCO_API_KEY" });

  it("a connection gets LitKit, LitSpace and LitLex — writes included by default", () => {
    const { server, names } = fakeServer();
    const specs = registerTools(server, conn, { readOnly: false });
    expect(names).toContain("litkit_tag_document");
    expect(names).toContain("litkit_post_to_thread");
    expect(names).toContain("litspace_upload_file");
    expect(names).toContain("litlex_search");
    expect(specs.filter((s) => s.write).length).toBeGreaterThan(0);
  });

  it("LITCO_READ_ONLY is a local opt-out that drops only the write tools", () => {
    const { server, names } = fakeServer();
    const specs = registerTools(server, conn, { readOnly: true });
    expect(specs.every((s) => !s.write)).toBe(true);
    expect(names).toContain("litkit_search_documents");
  });

  it("a firm key (lkf_) gets LitLex only", () => {
    const { server, names } = fakeServer();
    registerTools(server, firm, { readOnly: false });
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((n) => n.startsWith("litlex_"))).toBe(true);
  });

  it("never registers an admin, export, launch or credential tool", () => {
    const { server, names } = fakeServer();
    registerTools(server, conn, { readOnly: false });
    expect(names.some((n) => /admin|export|launch|token|invite|member|download/.test(n))).toBe(false);
  });
});

describe("Billing entry tools", () => {
  type Handler = (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }>; isError?: boolean }>;
  function capture(fetchImpl: typeof fetch, readOnly = false) {
    const handlers = new Map<string, Handler>();
    const server = { registerTool: (name: string, _meta: unknown, cb: Handler) => handlers.set(name, cb) } as never;
    const client = new LitcoClient("https://x.litco.ai", { kind: "connection", token: LKU, source: "file" }, fetchImpl);
    registerTools(server, client, { readOnly });
    return handlers;
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("a connection gets every entry tool; read-only keeps only the reads; a firm key gets none", () => {
    const all = capture((async () => json({})) as never);
    for (const n of [
      "billing_list_entries",
      "billing_search_entries",
      "billing_get_entry",
      "billing_create_entry",
      "billing_update_entry",
      "billing_move_entries",
      "billing_copy_entry",
      "billing_delete_entries",
      "billing_undo_change",
    ]) {
      expect(all.has(n), n).toBe(true);
    }
    const ro = capture((async () => json({})) as never, true);
    expect([...ro.keys()].filter((n) => n.startsWith("billing_")).sort()).toEqual([
      "billing_get_entry",
      "billing_list_entries",
      "billing_search_entries",
    ]);
    const { server, names } = fakeServer();
    registerTools(server, new LitcoClient("https://x.litco.ai", { kind: "firm_key", token: LKF, source: "env:LITCO_API_KEY" }), {
      readOnly: false,
    });
    expect(names.some((n) => n.startsWith("billing_"))).toBe(false);
  });

  it("copies an entry as a dry run, then applies with the confirm token (Halvorsen fixture)", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const handlers = capture((async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      calls.push({ url, body });
      if (!body.confirm_token) {
        return json({
          dry_run: true,
          preview: [1, 2, 3, 4, 5].map((d) => ({ before: null, after: { date: `2026-10-0${d + 3}`, hours: "8.0", status: "draft" } })),
          confirm_token: "ct_fixture",
          expires_at: "2026-10-09T12:10:00Z",
          summary: "Create 5 draft time entries on Halvorsen v. Quillmark, Oct 4–8, 8.0h each",
        });
      }
      return json({ change_id: "chg_1", created: 5 });
    }) as never);
    const copy = handlers.get("billing_copy_entry")!;
    const args = { entry_id: "te_today", dates: ["2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"], hours_override: "8.0" };
    const first = await copy(args);
    expect(first.isError).toBeUndefined();
    const preview = JSON.parse(first.content[0]!.text);
    expect(preview.dry_run).toBe(true);
    expect(preview.preview).toHaveLength(5);
    const second = await copy({ ...args, confirm_token: preview.confirm_token });
    expect(JSON.parse(second.content[0]!.text).change_id).toBe("chg_1");
    expect(calls.map((c) => c.url)).toEqual([
      "https://x.litco.ai/api/billing/entries/entry_duplicate",
      "https://x.litco.ai/api/billing/entries/entry_duplicate",
    ]);
    expect((calls[1]!.body as { confirm_token: string }).confirm_token).toBe("ct_fixture");
  });

  it("says plainly when Billing has not been updated, and passes Billing's refusals through", async () => {
    const notYet = capture((async () =>
      json({ type: "billing_not_updated", title: "x", status: 501 }, 501)) as never);
    const r1 = await notYet.get("billing_list_entries")!({});
    expect(r1.isError).toBe(true);
    expect(r1.content[0]!.text).toMatch(/hasn't been updated yet/);

    const locked = capture((async () => json({ title: "This entry is billed and can't be changed.", status: 409 }, 409)) as never);
    const r2 = await locked.get("billing_update_entry")!({ entry_id: "te_1", patch: { hours: "2.0" } });
    expect(r2.content[0]!.text).toBe("This entry is billed and can't be changed.");

    const hidden = capture((async () => json({ title: "Not found", status: 404 }, 404)) as never);
    const r3 = await hidden.get("billing_get_entry")!({ entry_id: "te_other" });
    expect(r3.content[0]!.text).toMatch(/Not found, or not visible to you/);
    expect(r3.content[0]!.text).not.toContain(LKU);
  });
});

describe("login (device flow)", () => {
  it("polls through pending and slow_down, then saves the token", async () => {
    const replies = [
      { status: 200, body: { device_code: "lkud_x", user_code: "BCDF-GHJK", verification_uri_complete: "https://app/connect/agent?code=BCDF-GHJK", interval: 5, expires_in: 600 } },
      { status: 400, body: { error: "authorization_pending" } },
      { status: 400, body: { error: "slow_down", interval: 10 } },
      { status: 200, body: { access_token: LKU, token_type: "Bearer", scope: "litkit litlex", expires_in: 3600 } },
    ];
    const waits: number[] = [];
    const lines: string[] = [];
    let saved = "";
    const r = await login({
      baseUrl: "https://app.litco.ai",
      clientId: "cursor",
      clientName: "Cursor on test",
      log: (l) => lines.push(l),
      fetchImpl: (async () => {
        const next = replies.shift()!;
        return new Response(JSON.stringify(next.body), { status: next.status });
      }) as never,
      sleepImpl: async (ms) => {
        waits.push(ms);
      },
      save: async (t) => {
        saved = t;
        return "/tmp/x";
      },
    });
    expect(saved).toBe(LKU);
    expect(r.scope).toBe("litkit litlex");
    expect(waits).toEqual([5000, 5000, 10000]);
    expect(lines.join("\n")).toContain("BCDF-GHJK");
  });

  it("stops on access_denied", async () => {
    const replies = [
      { status: 200, body: { device_code: "lkud_x", user_code: "B", verification_uri_complete: "u", interval: 1, expires_in: 60 } },
      { status: 400, body: { error: "access_denied" } },
    ];
    await expect(
      login({
        baseUrl: "https://app.litco.ai",
        clientId: "claude-code",
        clientName: "x",
        log: () => {},
        fetchImpl: (async () => {
          const next = replies.shift()!;
          return new Response(JSON.stringify(next.body), { status: next.status });
        }) as never,
        sleepImpl: async () => {},
      }),
    ).rejects.toThrow(/refused/);
  });
});
