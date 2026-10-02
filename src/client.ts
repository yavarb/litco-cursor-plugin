// Credentials and the HTTP client for the Litco API.
//
// Which credential, in order:
//   1. LITCO_CONNECTION_TOKEN — your own connection token (`lku_…`), from
//      Settings → Connections in LitKit, or written by `litco-mcp login`.
//      It acts as YOU: LitKit, LitLex and LitSpace, inside what your firm's
//      admin allows and what you chose when you created it.
//   2. LITCO_API_KEY — a firm API key (`lkf_…`). LitLex research only.
//   3. The credentials file `litco-mcp login` writes
//      (~/.config/litco/connection.json, mode 0600).
//
// The token is sent only as `Authorization: Bearer …` to LITCO_API_BASE_URL
// (https only, except localhost). It is never logged, never written anywhere
// but the 0600 credentials file, and no acting-for header is ever sent: a
// connection token names one person and cannot act for anyone else.

import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export const DEFAULT_BASE_URL = "https://app.litco.ai";
export const USER_AGENT = "litco-agent-connector/0.1.0";

export type CredentialKind = "connection" | "firm_key";

export interface Credential {
  kind: CredentialKind;
  token: string;
  source: "env:LITCO_CONNECTION_TOKEN" | "env:LITCO_API_KEY" | "file";
}

const TOKEN_RE = /^(lku|lkf)_[A-Za-z0-9_-]{43}$/;

export function credentialsPath(env: NodeJS.ProcessEnv = process.env): string {
  const base = env.XDG_CONFIG_HOME?.trim() || join(homedir(), ".config");
  return join(base, "litco", "connection.json");
}

/** Shape-check a token; returns its kind or null. Never echoes the token. */
export function tokenKind(token: string): CredentialKind | null {
  const t = token.trim();
  if (!TOKEN_RE.test(t)) return null;
  return t.startsWith("lku_") ? "connection" : "firm_key";
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function resolveBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = envValue(env.LITCO_API_BASE_URL) ?? DEFAULT_BASE_URL;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigError("LITCO_API_BASE_URL is not a valid URL.");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new ConfigError("LITCO_API_BASE_URL must use https (http is allowed only for localhost).");
  }
  return url.origin;
}

/** An env value the host left as a literal `${VAR}` placeholder counts as unset. */
function envValue(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t && !/^\$\{[A-Za-z0-9_]+\}$/.test(t) ? t : undefined;
}

export async function resolveCredential(env: NodeJS.ProcessEnv = process.env): Promise<Credential | null> {
  const conn = envValue(env.LITCO_CONNECTION_TOKEN);
  if (conn) {
    if (tokenKind(conn) !== "connection") {
      throw new ConfigError("LITCO_CONNECTION_TOKEN must be a connection token starting with lku_.");
    }
    return { kind: "connection", token: conn, source: "env:LITCO_CONNECTION_TOKEN" };
  }
  const key = envValue(env.LITCO_API_KEY);
  if (key) {
    if (tokenKind(key) !== "firm_key") {
      throw new ConfigError("LITCO_API_KEY must be a firm API key starting with lkf_.");
    }
    return { kind: "firm_key", token: key, source: "env:LITCO_API_KEY" };
  }
  try {
    const raw = JSON.parse(await readFile(credentialsPath(env), "utf8")) as { token?: unknown; baseUrl?: unknown };
    if (typeof raw.token === "string" && tokenKind(raw.token) === "connection") {
      return { kind: "connection", token: raw.token, source: "file" };
    }
  } catch {
    // no file — not signed in
  }
  return null;
}

export async function saveCredential(token: string, baseUrl: string, env: NodeJS.ProcessEnv = process.env): Promise<string> {
  if (tokenKind(token) !== "connection") throw new ConfigError("refusing to save a token that is not lku_");
  const path = credentialsPath(env);
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, JSON.stringify({ token, baseUrl, savedAt: new Date().toISOString() }) + "\n", {
    mode: 0o600,
  });
  return path;
}

export async function clearCredential(env: NodeJS.ProcessEnv = process.env): Promise<void> {
  await rm(credentialsPath(env), { force: true });
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Human explanation of a refusal, so the agent can tell its person what to do. */
export function explainStatus(status: number, code: string): string {
  if (status === 401) {
    return "Litco refused the token (unknown, revoked, expired, or no longer allowed by your firm). Create a new connection in LitKit → Settings → Connections, or run `litco-mcp login`.";
  }
  if (status === 403 && (code === "connection_token_forbidden" || code === "firm_api_key_forbidden")) {
    return "A connection cannot use this part of LitKit (administration, exports, launches and adding people are browser-only).";
  }
  if (status === 403) return "You don't have permission for this here, or it's outside the products or matters this connection covers.";
  if (status === 404) return "Not found, or not visible to you.";
  if (status === 429) return "Rate limited — wait a moment and retry.";
  return `Litco returned HTTP ${status}${code ? ` (${code})` : ""}.`;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  json?: unknown;
  form?: FormData;
  /** Return raw text instead of parsing JSON. */
  text?: boolean;
}

export class LitcoClient {
  constructor(
    readonly baseUrl: string,
    private readonly credential: Credential,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  get kind(): CredentialKind {
    return this.credential.kind;
  }

  url(path: string, query?: RequestOptions["query"]): string {
    if (!path.startsWith("/api/")) throw new Error("path must start with /api/");
    const u = new URL(path, this.baseUrl);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, String(v));
    }
    return u.toString();
  }

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.credential.token}`,
      accept: opts.text ? "text/plain, */*" : "application/json",
      "user-agent": USER_AGENT,
    };
    let body: BodyInit | undefined;
    if (opts.json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.json);
    } else if (opts.form) {
      body = opts.form;
    }
    const res = await this.fetchImpl(this.url(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body,
      redirect: "error",
    });
    if (!res.ok) {
      let code = "";
      try {
        const j = (await res.json()) as { error?: unknown };
        code = typeof j.error === "string" ? j.error : "";
      } catch {
        // non-JSON error body
      }
      throw new ApiError(res.status, code, explainStatus(res.status, code));
    }
    if (opts.text) return (await res.text()) as T;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("json")) return (await res.text()) as T;
    return (await res.json()) as T;
  }
}

/** Escape hatch for unauthenticated device-flow calls. */
export async function postForm(
  baseUrl: string,
  path: string,
  params: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetchImpl(new URL(path, baseUrl).toString(), {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": USER_AGENT },
    body: JSON.stringify(params),
    redirect: "error",
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: res.status, body };
}
