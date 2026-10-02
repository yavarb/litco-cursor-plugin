// litco-mcp — the Litco agent connector.
//
//   litco-mcp               run the stdio MCP server (what Cursor / Claude Code start)
//   litco-mcp login [--client cursor|claude-code|grokbot|other] [--name "…"]
//   litco-mcp logout        forget the saved connection token (revoke it in LitKit too)
//   litco-mcp whoami        show who the connection acts as
//
// Env: LITCO_CONNECTION_TOKEN (lku_…) or LITCO_API_KEY (lkf_…, LitLex only),
// LITCO_API_BASE_URL (default https://app.litco.ai), LITCO_READ_ONLY=1.
// stdout belongs to the MCP protocol in server mode: messages go to stderr.

import { hostname } from "node:os";
import {
  ConfigError,
  LitcoClient,
  clearCredential,
  resolveBaseUrl,
  resolveCredential,
} from "./client.js";
import { CLIENT_IDS, login, type ClientId } from "./login.js";
import { serve } from "./mcp-server.js";

const err = (line: string) => process.stderr.write(line + "\n");

function flag(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  const [cmd = "serve", ...rest] = argv[0]?.startsWith("--") ? ["serve", ...argv] : argv;
  try {
    const baseUrl = resolveBaseUrl();
    if (cmd === "login") {
      const client = (flag(rest, "--client") ?? "other") as ClientId;
      if (!CLIENT_IDS.includes(client)) throw new ConfigError(`--client must be one of ${CLIENT_IDS.join(", ")}`);
      const name = flag(rest, "--name") ?? `${client} on ${hostname()}`;
      const r = await login({ baseUrl, clientId: client, clientName: name, log: err });
      err(`Connected (${r.scope}). Token saved to ${r.savedTo}.`);
      return 0;
    }
    if (cmd === "logout") {
      await clearCredential();
      err("Forgot the saved token. Revoke the connection in LitKit → Settings → Connections to stop it everywhere.");
      return 0;
    }
    const credential = await resolveCredential();
    if (!credential) {
      throw new ConfigError(
        "No Litco credential. Set LITCO_CONNECTION_TOKEN (from LitKit → Settings → Connections) or run `litco-mcp login`.",
      );
    }
    const client = new LitcoClient(baseUrl, credential);
    if (cmd === "whoami") {
      err(JSON.stringify(await client.request("/api/me"), null, 2));
      return 0;
    }
    if (cmd !== "serve") throw new ConfigError(`Unknown command: ${cmd}`);
    const readOnly = process.env.LITCO_READ_ONLY === "1" || rest.includes("--read-only");
    await serve(client, { readOnly });
    return -1; // keep running; the transport owns the process
  } catch (e) {
    err(e instanceof Error ? e.message : String(e));
    return 1;
  }
}

const isEntry = process.argv[1] && /litco-mcp(\.mjs)?$|cli\.(ts|js)$/.test(process.argv[1]);
if (isEntry) {
  void main().then((code) => {
    if (code >= 0) process.exit(code);
  });
}
