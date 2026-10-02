---
name: litco-getting-started
description: Connect this agent to Litco (LitKit, LitLex, LitSpace) and check what the connection can reach. Use when Litco tools fail with an auth error, or before first use.
---

# Getting started with Litco

The `litco` MCP server acts as **one person** — whoever created the connection.
It can do only what that person can do in LitKit in the browser, inside what
their firm's admin allows and the products and matters chosen for this
connection. Administration, exports, launching review runs and adding people
are never available to an agent.

## Connect

Pick one:

1. **Sign in from the terminal (no copying):** run
   `node <plugin>/dist/litco-mcp.mjs login --client cursor` (or `--client claude-code`).
   Open the link it prints, check the code, choose products and matters, and approve.
   The token is saved to `~/.config/litco/connection.json` (readable only by you).
2. **Paste a token:** in LitKit open **Settings → Connections**, create a
   connection, and put the token in your environment as
   `LITCO_CONNECTION_TOKEN=lku_…`.
3. **LitLex only, firm key:** `LITCO_API_KEY=lkf_…` from your Firm admin
   reaches case-law research and nothing else.

Set `LITCO_API_BASE_URL` if your firm's LitKit is not `https://app.litco.ai`.

## Check

Call `litco_whoami` first. It returns who the connection acts as, its
products (`litkit`, `litlex`, `litspace`) and the matters it can reach. Use
those matter ids with every other tool.

## When something is refused

- **401** — the connection was revoked, expired, or your firm turned
  connections off or changed your role. Reconnect.
- **403** — outside your permissions, outside this connection's products or
  matters, or a browser-only action. Tell the person; don't retry.

To make this install read-only on your machine, set `LITCO_READ_ONLY=1`.
