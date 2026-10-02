# Litco agent connector — LitKit, LitLex & LitSpace for Cursor, Claude Code and any MCP agent

This connector lets your AI agent work in **LitKit** (document review), **LitLex** (case law) and **LitSpace** (matter files) **as you**.

It is a small stdio [MCP](https://modelcontextprotocol.io) server that calls the Litco API with your own connection token. Every request is checked on the server against:
- your live roles;
- your firm's agent-connection policy;
- the products and matters you chose when you created the connection.

The agent can do only what you can do in LitKit in the browser. Administration, exports, launching review runs and adding people are browser-only, so no agent can do them. Every action is audited as you, through the connection.

Every agent your Firm admin enables gets the same tools and the same access. There is no per-agent read-only mode on the server, and writes (tag, note, thread post, upload) take effect immediately, as in LitKit.

## Credentials

| Variable | What | Reaches |
|---|---|---|
| `LITCO_CONNECTION_TOKEN` | Your connection token, `lku_…` (LitKit → **Settings → Connections**, or `litco-mcp login`) | LitKit, LitLex and LitSpace, as you, within your firm's policy |
| `LITCO_API_KEY` | A firm API key, `lkf_…`, from your Firm admin | LitLex case-law research only |
| `LITCO_API_BASE_URL` | Your firm's LitKit address (default `https://app.litco.ai`) | — |
| `LITCO_READ_ONLY=1` | Optional. Leaves the write tools out of **this install** | — |

`litco-mcp login` saves the token to `~/.config/litco/connection.json` with mode 0600. Nothing else is written anywhere.

**Never commit a token. Never set a personal `lku_` token in a team-wide plugin setting:** it would make everyone act as you.

## Install

### Cursor
1. Install the **Litco** plugin from the Cursor marketplace, or add this repository as a plugin.
2. In a terminal, run:
   `npx -y github:yavarb/litcode-cursor-plugin login --client cursor`
   (or `node <plugin-dir>/dist/litco-mcp.mjs login --client cursor`).
3. Open the link it prints, check the code, choose products and matters, and approve.
4. Restart the MCP server in Cursor.

### Claude Code
In Claude Code:
```
/plugin marketplace add yavarb/litcode-cursor-plugin
/plugin install litco@litco
```
Then sign in from a terminal:
```bash
npx -y github:yavarb/litcode-cursor-plugin login --client claude-code
```
Or wire the server by hand, without the plugin:
```bash
claude mcp add litco -e LITCO_CONNECTION_TOKEN=lku_… -- node /path/to/dist/litco-mcp.mjs
```

### Any other MCP client
Run `node dist/litco-mcp.mjs` as a stdio server, with `LITCO_CONNECTION_TOKEN` in its environment (or after `login`).

### Grokbot (litco-agent)
Personal mode uses the same token. Set `LITCO_CONNECTION_TOKEN=lku_…` (and `LITCO_API_BASE_URL`). Grokbot then sends `Authorization: Bearer lku_…` and **no** acting-user headers: a connection token names one person and cannot act for anyone else.

## Tools

| Product | Read | Write (direct) |
|---|---|---|
| Identity | `litco_whoami` | — |
| LitKit | `litkit_list_matters`, `litkit_search_documents`, `litkit_get_document`, `litkit_document_text`, `litkit_document_family`, `litkit_list_tags`, `litkit_list_threads`, `litkit_get_thread`, `litkit_list_review_jobs` | `litkit_tag_document`, `litkit_untag_document`, `litkit_save_note`, `litkit_post_to_thread` |
| LitSpace | `litspace_list_files`, `litspace_search`, `litspace_read_file` | `litspace_upload_file` |
| LitLex | `litlex_search`, `litlex_get_opinion`, `litlex_citator`, `litlex_resolve_citations`, `litlex_check_quote`, `litlex_statute` | — |

With a firm key (`lkf_`), only the LitLex tools are registered.

Skills in `skills/` teach the agent the workflows: getting started, LitLex research, LitKit review and LitSpace files.

## Commands

```
litco-mcp                 run the stdio MCP server
litco-mcp login [--client cursor|claude-code|grokbot|other] [--name "…"]
litco-mcp whoami          show who the connection acts as
litco-mcp logout          forget the saved token (revoke it in LitKit too)
```

## Revoking

Revoke a connection in LitKit → **Settings → Connections**. Your Firm admin can revoke any connection, or all of a person's connections, from **Admin → Billing → API keys**.

A connection also stops working by itself in any of these cases:
- it expires (at most a year; your firm may set less);
- your password changes;
- your role no longer allows connections;
- your firm turns connections off.

## Develop

```bash
npm install
npm run typecheck && npm test
npm run build        # bundles src/ → dist/litco-mcp.mjs (committed, so plugin installs need no npm install)
```

## License

Apache-2.0. See [LICENSE](LICENSE).
