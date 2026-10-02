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
