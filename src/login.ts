// `litco-mcp login` — sign in without copying a token (RFC 8628 device flow).
//
// 1. Ask LitKit for a device code and a short user code.
// 2. Show the person the approval link; they approve in their own browser
//    (signed in to LitKit with their second factor) and choose which
//    products and matters this connection may reach.
// 3. Poll until LitKit hands over the connection token (once), then save it
//    to ~/.config/litco/connection.json (mode 0600).

import { postForm, saveCredential } from "./client.js";

export const CLIENT_IDS = ["grokbot", "claude-code", "cursor", "chatgpt", "other"] as const;
export type ClientId = (typeof CLIENT_IDS)[number];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function login(input: {
  baseUrl: string;
  clientId: ClientId;
  clientName: string;
  log: (line: string) => void;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
  save?: (token: string) => Promise<string>;
}): Promise<{ savedTo: string; scope: string; expiresIn: number }> {
  const wait = input.sleepImpl ?? sleep;
  const start = await postForm(
    input.baseUrl,
    "/api/auth/agent/device/code",
    { client_id: input.clientId, client_name: input.clientName },
    input.fetchImpl,
  );
  if (start.status !== 200) {
    const code = String(start.body.error ?? start.status);
    throw new Error(
      code === "not_found"
        ? "Agent connections aren't turned on for this LitKit. Ask your Firm admin."
        : `Could not start sign-in (${code}).`,
    );
  }
  const deviceCode = String(start.body.device_code);
  let interval = Number(start.body.interval ?? 5);
  const expiresAt = Date.now() + Number(start.body.expires_in ?? 600) * 1000;
  input.log(`Open ${String(start.body.verification_uri_complete)}`);
  input.log(`and check the code matches: ${String(start.body.user_code)}`);

  while (Date.now() < expiresAt) {
    await wait(interval * 1000);
    const poll = await postForm(
      input.baseUrl,
      "/api/auth/agent/device/token",
      { grant_type: "urn:ietf:params:oauth:grant-type:device_code", device_code: deviceCode },
      input.fetchImpl,
    );
    if (poll.status === 200 && typeof poll.body.access_token === "string") {
      const savedTo = await (input.save ?? ((t: string) => saveCredential(t, input.baseUrl)))(poll.body.access_token);
      return { savedTo, scope: String(poll.body.scope ?? ""), expiresIn: Number(poll.body.expires_in ?? 0) };
    }
    const err = String(poll.body.error ?? "");
    if (err === "authorization_pending") continue;
    if (err === "slow_down") {
      interval = Number(poll.body.interval ?? interval + 5);
      continue;
    }
    if (err === "access_denied") throw new Error("The connection was refused (or your firm's policy doesn't allow it).");
    if (err === "expired_token") break;
    throw new Error(`Sign-in failed (${err || poll.status}).`);
  }
  throw new Error("The code expired before it was approved. Run `litco-mcp login` again.");
}
