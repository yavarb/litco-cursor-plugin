---
name: litco-litlex-research
description: Research case law with LitLex — search opinions, read them, check how later courts treated them, resolve citations and verify quotations. Use for any legal-research question or before citing a case.
---

# LitLex research

Tools: `litlex_search`, `litlex_get_opinion`, `litlex_citator`,
`litlex_resolve_citations`, `litlex_check_quote`, `litlex_statute`.

## Workflow

1. **Search** with `litlex_search` (`q` ≥ 3 characters). Terms-and-connectors
   syntax routes to the boolean lane automatically; force it with
   `mode: "boolean"`. Narrow with `court`, `after`, `before` (YYYY-MM-DD).
2. **Read** the strongest hits with `litlex_get_opinion` before relying on them.
   Quote from the text you read — never from memory.
3. **Check treatment** with `litlex_citator` before citing an opinion as good law.
4. **Verify every citation and quotation** you put in a draft:
   `litlex_resolve_citations` for the cites, `litlex_check_quote` for each
   quotation (≥ 15 characters). Report any that fail rather than "fixing" them.

## Rules

- Never invent a citation, pin cite, or quotation. If LitLex can't find it,
  say so.
- Give the opinion id and citation for every authority you rely on, so the
  person can open it.
