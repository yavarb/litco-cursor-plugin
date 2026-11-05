# Yavar's standing UI and product rules (LitCo)

These are standing rulings from Yavar (owner). They bind every PR in every LitCo repo (litkit-app, litkit-ios, litkit-mac, litco-console, litco-agent, litlex, marketing). They are enforced by machines:

- **Guards.** Each rule with a guard has a check that exits nonzero and fails the gate. On web that's `scripts/check-yavar-rules.sh` (run by `pnpm lint`) plus the named vitest guards. On iOS it's `scripts/ci/*` (run by `scripts/test.sh`) plus the named XCTest/XCUITest guards.
- **Review.** The Astra exact-head review loads this file from the PR's repo at the PR head. Any violation of any rule, guarded or review-only, is a **P1 blocking FAIL**, unless that PR carries an express waiver for that rule (see "Per-PR waivers" below).
- **Changes.** Only Yavar can change or retire a rule. Add new rulings here with an ID, his words, the date (ET) and the scope. Never weaken a guard to make a PR pass. Fix the PR, or get an express per-PR waiver.
- **Waivers.** Every rule blocks by default. Only an express decision for one PR relaxes a rule, and only that rule on that PR: a `rules-waiver:<RULE-ID>` label (see [Per-PR waivers](#per-pr-waivers)). R3, R12 and R13 are never waivable.

"User-facing" means any text or behavior a customer can see or hear: UI strings, JSX text, labels, placeholders, accessibility labels, toasts, errors, emails, notifications, Ana's visible replies and tool labels, marketing pages, App Store and TestFlight text. Internal identifiers, repo, package and path names (`litkit-*`), comments, logs and tests are not user-facing.

Scope key: **web** = litkit-app (and console/marketing where relevant), **iOS** = litkit-ios (iPhone and iPad; litkit-mac follows the iOS rules), **both** = all of them.

| ID | Rule | Scope | Guard |
|----|------|-------|-------|
| R1 | Surface switches are instant (no swipe, slide, page or matched-geometry transition) and keep the haptic | both | iOS: guard + UI test (Mac). Web: check-yavar-rules R1 |
| R2 | No time-left estimates anywhere | both | web: no-eta-wording.test.ts + check-yavar-rules R2. iOS: check_no_eta.sh |
| R3 | No AI model or provider names, except to the platform admin | both | check-yavar-rules R3; iOS brand-copy guard |
| R4 | Brand is "LitCo" only (never LitKit, LitLex, LitCode or "Litco") | both | branding-copy.test.ts, public-brand-*.test.ts, check-yavar-rules R4; iOS check_brand_copy.sh |
| R5 | Billing is "Billing", never "Tempo" | both | check-yavar-rules R5; iOS check_brand_copy.sh |
| R6 | Every long-press on a file uses the one shared share menu, with "Share link" and "Share externally…" first | both | iOS: one-builder guard + XCUITest per surface. Web: review-only |
| R7 | "Works with your agents", never "bring your own agent/model" | both | check-yavar-rules R7; iOS brand-copy guard |
| R8 | One credit price per action and one firm credit pool number | both | review-only (+ price-table unit test where one exists) |
| R9 | Credits, not dollars, except for the platform admin and plan checkout | both | check-yavar-rules R9 (scoped) + review |
| R10 | iPhone billing links out to LitCo web billing (no in-app purchase) | iOS | iOS: no-StoreKit guard (check_billing_origin.sh) |
| R11 | It's "Ana", never "Ask Ana" or chatbot framing | both | branding-copy.test.ts + check-yavar-rules R11; iOS check_no_ask_ana.sh |
| R12 | No client or matter names in greetings, placeholders, empty states, chips or example prompts | both | check-yavar-rules R12 (interpolation in placeholder props) + review |
| R13 | No real client, matter or person names in product copy or examples | both | check-yavar-rules R13 (deny-list) |
| R14 | No placeholder, stub, "coming soon" or "not connected yet" UI in prod. Hide it until it works | both | check-yavar-rules R14 |
| R15 | iPhone parity: a feature isn't done until it works on web and iPhone | both | review-only |
| R16 | Ana entry points open the user's own private context thread, never #general | both | review-only |
| R17 | Documents opened from Files open in Draft, inside the same app shell, and autosave | both | review-only |
| R18 | Review defaults to the Fast lane, and review descriptions have no contradictions or unexplained jargon | both | review-only |
| R19 | Job cost in credits is visible to everyone on the matter. Short of credits, the job waits and is never lost | both | review-only |
| R20 | Firm invites and trials come from LitCo platform admin, card required by default (per-invite off switch) | web | review-only |
| R21 | Design-partner discounts never appear on the website or in public copy | web | check-yavar-rules R21 (marketing copy) + review |
| R22 | Copy reads like normal human writing: active voice, a clear headline, no bot-speak | both | review-only |
| R23 | No overflow (⋯) menu while the header has room: actions are visible buttons, and only measured lack of space moves the lowest-priority ones into ⋯ | both | web: review-toolbar.priority-overflow.test.tsx + header e2e (Review, Files); other surfaces review-only |

---

## R1 — Instant surface switching, with the haptic
- **Rule:** Every switch between top-level surfaces (Matters · Channels · Files · Review · Research · Draft · Billing · More/Settings, in every pair and direction) is an instant content swap. It never uses a swipe, slide, push, page-style TabView, matched-geometry or cross-fade transition. The selection haptic stays.
- **Yavar:** 2026-10-22 1:49 AM ET. Switching between some surfaces "plays a swipe or slide animation he dislikes. Every surface switch must be an instant swap… Keep the haptic on switch (he likes it)." iPhone 0.18 brought the swipe back, and on 2026-10-22 ~10:11 PM ET he said: "we need to use our brains here."
- **Scope:** both (iPhone, iPad, Mac, web launcher).
- **Guard (iOS, Mac lands it in mac/instant-switch-all):**
  - `scripts/ci/check_instant_surface_switch.sh` fails on `.tabViewStyle(.page`, `PageTabViewStyle`, `matchedGeometryEffect`, `withAnimation`, `.transition(`, or a non-nil `.animation(` in the shared surface switcher or launcher files.
  - A unit or UI test walks every surface pair and asserts the switch makes no navigation push and has no animation (Transaction disablesAnimations).
  - A test asserts the selection haptic fires on switch.
- **Guard (web):** check-yavar-rules R1 fails on `transition-*`/`animate-*` classes, framer-motion `AnimatePresence`/`motion.` (aliases and namespace imports included) or a View Transitions API call (`startViewTransition`) in the launcher and surface-switch files listed as `instantPaths` in `scripts/yavar-rules/config.ts` (`src/components/shell/{surfaces-strip,surface-overlay,top-bar,header-overflow,app-shell}.tsx`, `src/components/ds/app-shell.tsx`, `src/lib/nav/launcher.ts`). CSS files (e.g. `src/components/shell/launcher.css`) are review-only. The existing `e2e/launcher/` suite covers launcher navigation; exhaustive surface-pair behavior and haptics remain review-only on web.

## R2 — No time-left estimates
- **Rule:** Never show "about N min left", "N hours left", "time left", "usually takes", "runs out in", countdowns or any other remaining-time estimate on job progress, ingest, review, billing or any other screen. Servers don't build them either. Show a percent, a count ("312 of 1,000") or an indeterminate state. Absolute dates are fine.
- **Yavar:** 2026-10-21 8:44 PM ET. No "about N min left" estimates on any screen, web or iPhone, and none coming back as server-provided estimates.
- **Scope:** both.
- **Guard:** web `src/lib/__tests__/no-eta-wording.test.ts` plus check-yavar-rules R2 (adds "usually takes", "runs out in", "days left"). iOS `scripts/ci/check_no_eta.sh`.

## R3 — No model names outside platform admin
- **Rule:** Only the platform admin sees actual AI model or provider names. Everyone else, firm owners included, sees tiers only. That rules out Claude, Opus, Sonnet, Haiku, Fable, GPT, o-series, Gemini, Llama, Qwen, GLM, Mistral, DeepSeek, Grok, Anthropic, OpenAI, Google AI, OpenRouter and Bedrock/Vertex in user-facing text.
- **Yavar:** 2026-10-14 1:50 AM ET: "only the platform admin may see the actual AI model names; everyone else, firm owners included, sees only tiers."
- **Scope:** both.
- **Guard:** check-yavar-rules R3 scans string literals, template parts, JSX text and attribute strings in the source list in `scripts/yavar-rules/config.ts` (`src/app`, `src/components` and the src/lib copy builders). It is case-sensitive, so provider keys such as `"openrouter"` are not copy. Platform-admin paths (`platformAdminPaths`: `src/app/(app)/owner/`, `src/app/(app)/admin/models/`, `src/app/(app)/admin/spend/`, `src/app/api/admin/model-config/`) are allow-listed. Inside a shared component, copy in the truthy branch of a configured platform-admin gate (`platformAdminGates`, exact file and gate name: `showModels` in `src/components/litco-usage/charges-table.tsx`) is allow-listed for R3 and R9 only. iOS: `check_brand_copy.sh` covers model names.

## R4 — LitCo is the only brand
- **Rule:** User-facing copy says "LitCo" (company LitCo AI LLC). Never "LitKit", "LitLex", "LitCode" or "Litco" (lower-case c). The research corpus is "LitCo" or "Research". Repo, package and identifier names may keep `litkit-*`.
- **Yavar:** 2026-10-07 (hard rule): "There is no LitKit brand anymore. The only product/brand is LitCo." 2026-10-02: never say LitCode.
- **Scope:** both.
- **Guard:** web `src/test/branding-copy.test.ts`, `src/lib/chat/public-brand-text.test.ts`, `src/lib/chat/public-brand-surfaces.test.ts`, and check-yavar-rules R4 (adds LitLex, LitCode and "Litco" in literals and JSX). iOS `scripts/ci/check_brand_copy.sh`.

## R5 — Billing is never "Tempo"
- **Rule:** The billing product is "Billing", part of LitCo. "Tempo" never appears in user-facing copy, new identifiers, error messages or emails.
- **Yavar:** 2026-10-13 10:56 PM ET: there is no separate Billing app; it's LitCo's Billing tab. The no-"Tempo" rule is in every billing and UI lane brief since then.
- **Scope:** both.
- **Guard:** check-yavar-rules R5 (`\bTempo\b` in literals and JSX). iOS `check_brand_copy.sh`.

## R6 — One shared share menu on every long-press
- **Rule:** Every file surface (Files list and grid, viewer, search results, chat attachments, review documents) uses the ONE shared share-menu builder, so the menus match. A long-press (or context menu) on any file shows "Share link" and "Share externally…" first, then the existing items. The viewer's bar Share menu uses the same builder.
- **Yavar:** 2026-10-22 8:48 PM ET: "Force push should give you sharing options too right?"
- **Scope:** both.
- **Guard:** iOS: a guard that every `.contextMenu` on a file row uses `DocumentShareMenu`, plus an XCUITest per surface asserting the first two items. Web: review-only until a shared context-menu component exists.

## R7 — "Works with your agents"
- **Rule:** Frame the API/MCP as "works with your agents" (connect your own agents alongside Ana). Never write "bring your own agent", "bring your own model", BYOA, BYOM, BYO-LLM or anything that makes it read as an alternative to Ana.
- **Yavar:** 2026-10-22 9:07 PM ET.
- **Scope:** both, marketing included.
- **Guard:** check-yavar-rules R7 (`bring your own (agent|model|AI|LLM)`, `BYO[AM]\b`). iOS brand-copy guard.

## R8 — One credit price per action, one pool number
- **Rule:**
  - An action costs the same credits from the firm's pool whether Ana, a person or the firm's own agent (API/MCP) does it. There's no reduced rate, no model or platform split and no separate Ana-vs-agent line. Plain reads are free under fair use.
  - The firm's credits show as one firm-wide pool number.
- **Yavar:** 2026-10-22 9:07 PM ET (one price). 2026-10-21 11:10 PM ET pricing lock (one pool, shown as one number).
- **Scope:** both.
- **Guard:** review-only. Where a single price table exists, a unit test asserts it has no actor or model dimension.

## R9 — Credits, not dollars (except platform admin)
- **Rule:**
  - Job costs, usage and balances show credits.
  - Dollar amounts appear only to the platform admin and on the plan checkout and Stripe pages.
  - Customers never see "tokens".
- **Yavar:** 2026-10-22 1:57 AM ET: "show everyone on a matter the credits a review/tag job costs (no dollars except to platform admin)."
- **Scope:** both.
- **Guard:** check-yavar-rules R9 fails on dollar literals (`$` followed by digits, `USD`) and the word "tokens" in user-facing text under review, usage, credits and job components. "Under review, usage, credits and job components" means a path segment named review, usage, credit(s) or job(s) (`creditPaths`). Platform admin and plan checkout (`pricingPaths`: `src/app/(app)/settings/plan/`, the admin billing plan and credit-pack files, `src/app/api/admin/billing/checkout/`) are allow-listed, as is the R3 `platformAdminGates` list. Numeric capture substitutions in a regex `.replace` / `.replaceAll` replacement string (e.g. `" $1"`) are not prices and are not flagged; literal prices there still are. Dollars computed at runtime (e.g. a `usd()` formatter) are not lexically visible; review covers the rest.

## R10 — iPhone billing links out to web
- **Rule:** The iPhone and iPad app never sells credits or plans in the app (no StoreKit or Apple in-app purchase). Buying credits, usage and plan changes link out to the LitCo web billing page.
- **Yavar:** 2026-10-22 2:11 AM ET: "On iPhone, link out to the LitCo web billing page for credits."
- **Scope:** iOS.
- **Guard:** iOS `scripts/ci/check_billing_origin.sh`, extended to fail on `import StoreKit`, `SKPaymentQueue`, `Product.purchase`, `.storeProductsTask` or `SubscriptionStoreView`.

## R11 — "Ana", not "Ask Ana"
- **Rule:** The UI and chat say "Ana". Never "Ask Ana", "Chat with Ana" or "chatbot". Frame it as giving Ana a task (e.g. "Give Ana a research task").
- **Yavar:** 2026-10-07: never "Ask Ana" (it's not a chatbot). 2026-10-13 2:58 PM ET: no chatbot framing; "Give Ana a research task".
- **Scope:** both.
- **Guard:** web `src/test/branding-copy.test.ts` plus check-yavar-rules R11 (adds "Chat with Ana" and "chatbot"). iOS `scripts/ci/check_no_ask_ana.sh`.

## R12 — No client or matter names in prompts and placeholders
- **Rule:** Greetings, placeholders, empty states, suggestion chips and example prompts never name the client or matter, not even dynamically. Say "this matter". Ordinary data display (headers, lists) may show names.
- **Yavar:** 2026-10-08 (e.g. Ana's "Ask about Visa…" must say "this matter").
- **Scope:** both.
- **Guard:** check-yavar-rules R12 fails on matter or client name interpolation inside `placeholder=`, suggestion-chip and greeting strings. Review covers the rest.

## R13 — No real names in examples
- **Rule:** Product copy, placeholders and example entries never use real client, matter or person names (e.g. Mansour). Use obviously fictional examples.
- **Yavar:** 2026-10-08.
- **Scope:** both.
- **Guard:** check-yavar-rules R13 checks a deny-list (`scripts/yavar-rules/real-names.txt`, whole words, case-sensitive) against literals and JSX in the configured source list. Names that are also ordinary words stay off the list and are review-only.

## R14 — No placeholder or stub UI in prod
- **Rule:** Never ship placeholder, stub or "not connected yet" UI ("coming soon", "arrives in milestone N", "Ana isn't connected", lorem ipsum). Hide the feature until it works.
- **Yavar:** 2026-10-07.
- **Scope:** both.
- **Guard:** check-yavar-rules R14 (`coming soon`, `arrives in milestone`, `not connected yet`, `isn't connected`, `lorem ipsum` in literals and JSX).

## R15 — iPhone parity
- **Rule:** The iPhone app stays consistent with every web change. A feature isn't done until it works on both.
- **Yavar:** 2026-10-13 11:38 PM ET.
- **Scope:** both.
- **Guard:** review-only. A web PR that changes a user-facing feature must name its iOS counterpart PR, or say why none is needed.

## R16 — Ana entry points open a private context thread
- **Rule:** Every Ana entry point (Research, Files, Draft, etc.) opens the user's own private context thread (e.g. one per opinion in Research). It's never filed under #general or a channel. It moves to a channel only through an explicit Share.
- **Yavar:** 2026-10-07.
- **Scope:** both.
- **Guard:** review-only.

## R17 — Files open in Draft, in the same shell
- **Rule:** Documents opened from Files (Word, Markdown, text) open in Draft. Draft uses the same app shell (header, product tabs, back button, Ana sidebar). It autosaves when you navigate away, or asks if the save can't finish.
- **Yavar:** 2026-10-07.
- **Scope:** both.
- **Guard:** review-only.

## R18 — Fast lane by default, clear review descriptions
- **Rule:** Document review defaults to the Fast lane, including when Ana plans or launches one. Generated review descriptions are clear and never contradictory, with no unexplained jargon like "Standard".
- **Yavar:** 2026-10-08.
- **Scope:** both.
- **Guard:** review-only.

## R19 — Job cost visible, never lost for credits
- **Rule:**
  - Everyone on a matter sees the credits a review/tag job costs.
  - Review & Tag checks credits at start. A short job is kept as "Waiting for credits" with its settings and is never lost. It starts once credits are bought.
  - Permitted users get a link right there to buy credits, see usage or upgrade.
- **Yavar:** 2026-10-22 1:57 AM ET.
- **Scope:** both.
- **Guard:** review-only.

## R20 — Invites and trials from platform admin
- **Rule:** Firm invites and free trials are created in LitCo platform admin, not the Stripe console. A card is required up front by default, with a per-invite off switch.
- **Yavar:** 2026-10-21 9:25 PM ET.
- **Scope:** web (platform admin and console).
- **Guard:** review-only.

## R21 — No design-partner pricing in public copy
- **Rule:** Design-partner discounts are offered privately per invite. They never appear on the website or in public copy.
- **Yavar:** 2026-10-21 11:10 PM ET: "Ok but design partners don't need to be on the website copy."
- **Scope:** web (marketing and public pricing).
- **Guard:** check-yavar-rules R21 ("design partner" in the signed-out pages listed as `publicPaths` in `scripts/yavar-rules/config.ts`; this repo has no marketing or public pricing pages, which live elsewhere) + review.

## R22 — Human copy
- **Rule:** Product, marketing and video copy reads like normal human writing: active voice, a clear headline about what the product does, and no bot-speak, vague "the X" phrasing or placeholder content.
- **Yavar:** 2026-10-22.
- **Scope:** both.
- **Guard:** review-only.

## R23 — No overflow menu while space allows
- **Rule:** A surface header never hides an action in a ⋯ / "More" menu while the header has room for it. Actions are visible, labelled buttons (quiet secondary style, icon + label, keyboard reachable). Only when the header truly runs out of room, measured on the actual container (a ResizeObserver, never a viewport breakpoint guess), do actions give way, lowest priority first: first to icon-only buttons that keep their name and a tooltip, then into ⋯. Widening brings them back. ⋯ holds only genuinely rare items (Reload, Recycle bin-class utilities when space is short, admin-only channel settings); a ⋯ with nothing in it is not rendered. At typical laptop widths (1280, 1440) a primary surface's actions are never in ⋯, with or without the docked Ana rail. (On Review, only 1280 with both the Ana rail and the filter sidebar open, a ~550px list column, may move the last two, Term report and the view switch, into ⋯.)
- **Yavar:** 2026-10-30, after #2561 promoted only Checklist / Activity / Produce / Columns and left Organize, Manage tags and Term report in Review's ⋯: "we have all this space. why are we putting all those options in the ... button menu. I could have sworn I've flagged this to you several times now."
- **Scope:** both. iPhone has no room for a desktop header; it follows the same priority order, and the native bridge header is out of scope.
- **Guard (web):** `src/hooks/use-priority-overflow.ts` is the one measured priority+ mechanism; a header that needs overflow uses it. `src/components/review/review-toolbar.priority-overflow.test.tsx` renders the Review header at the real 1280 / 1440 widths (with and without the Ana rail and the filter sidebar) and fails if any action is in ⋯ there, or if overflow happens out of priority order. `e2e/review-toolbar/after.spec.ts` and `e2e/files-redesign/empty-state.spec.ts` assert the same in a real browser. Other surfaces are review-only.

## Per-PR waivers

Every rule blocks by default. A rule is relaxed only for one PR, and only by an express, recorded decision.

- **Yavar:** 2026-10-29: "i want the rules to be applied unless we decide expressly for that pr to relax them". A global relaxation (#2550, which made nine rules advisory everywhere) was not adopted.
- **The waiver is a label on the PR:** `rules-waiver:<RULE-ID>`, e.g. `rules-waiver:R5`, one label per rule. It waives that rule on that PR only. It waives nothing on any other PR, and no other rule. Labels show in the PR timeline (who added them, when).
- **Add it with the helper**, and only on Yavar's express decision for that PR: `bash scripts/rules-waiver.sh add <pr> <RULE-ID> "<why>"`. It creates the label if it is missing, applies it, and posts a PR comment recording who, why and when. `rm` takes it off the same way (with a comment). `list <pr>` shows a PR's waivers.
- **The gate reads the labels at gate time.** `scripts/gate.sh` passes `YAVAR_RULES_PR` (with the repo and the `main` it tests on) into `.local-gate`, and the rules check reads that PR's labels with `gh`. A label added after a gate ran changes nothing until the PR is gated again: re-run `bash scripts/ship.sh` or `bash scripts/gate.sh <pr>`. If the labels cannot be read, nothing is waived (the rules block). Plain local `pnpm lint` reads no labels and waives nothing new. Only a single gate of the PR (`gate.sh <pr>`, its own test run) reads its labels. A pretest (`gate.sh --pretest`) and a batch (`gate.sh --batch`) run the check with `YAVAR_RULES_PR=none` against the `main` they test on: no label is read and any baseline entry `main` lacks is refused. A PR that needs a waiver therefore fails its pretest and any batch, and is gated alone.
- **Record the waived lines.** Each waived violation prints `WAIVED <rule> for #<pr> (label rules-waiver:<rule>)` with the violation text, then the line to add to `scripts/yavar-rules/baseline.txt`: `<key> # rules-waiver:<rule> #<pr> <why>`. Add it and push. A waived violation that is not recorded still fails, because after the merge it would fail every later PR and local lint on `main`. Under the gate, a baseline entry that is new on the PR is accepted only when it cites that PR and the PR has the matching label. Entries already on `main` stay admitted and print `WAIVED … (recorded in scripts/yavar-rules/baseline.txt)` in every run. Fixing the copy later makes the entry stale, so it is then removed.
- **Review-only rules** follow the same per-PR label: a reviewer treats a `rules-waiver:<RULE-ID>` label on the PR as the express waiver for that rule on that PR, except for the never-waivable rules.
- **Never waivable.** Legal, privacy and security rules cannot be waived by label or by baseline entry: the check prints `REFUSED` and the violation blocks. Change the rule itself (Yavar only) instead. The set is `NON_WAIVABLE` in `scripts/yavar-rules/check.ts` (and `scripts/rules-waiver.sh` refuses to add one). R3 keeps AI model and provider names away from everyone but the platform admin (Yavar, 2026-10-29: R3 must not be waivable; its platform-admin allow-list is the rule's own scope, not a waiver, and is unchanged). R12 and R13 keep client, matter and real person names out of product copy (client confidentiality and personal data).

Never waivable: R3, R12 and R13.

## Web guard implementation paths

- Entry: `scripts/check-yavar-rules.sh`; implementation: `scripts/yavar-rules/check.ts`; lint wiring: `package.json`.
- Explicit source inventory, surface-switch scope and narrow exceptions: `scripts/yavar-rules/config.ts`.
- Shared ETA patterns: `scripts/yavar-rules/no-eta-patterns.ts`, also imported by `src/lib/__tests__/no-eta-wording.test.ts`.
- Real-name deny-list: `scripts/yavar-rules/real-names.txt`; exact existing debt and recorded per-PR waivers: `scripts/yavar-rules/baseline.txt`.
- Per-PR waivers: `judge()` and `NON_WAIVABLE` in `scripts/yavar-rules/check.ts`; the label helper `scripts/rules-waiver.sh`; the gate passes `YAVAR_RULES_PR`, `YAVAR_RULES_REPO` and `YAVAR_RULES_BASE` through `_gate_env` in `scripts/gate.sh`.
- Synthetic regression fixtures: `scripts/yavar-rules/check.test.ts`; scratch-copy mutation proof: `scripts/yavar-rules/mutation-proof.ts`; operating details: `scripts/yavar-rules/README.md`.
- What counts as copy: string literals, template parts, JSX text and attribute strings. Skipped: comments, identifiers, imports, object keys, literal types, `case` labels, `===`/`!==` operands, HTTP header names, `safeLog`/`console` arguments, non-copy JSX attributes (`href`, `id`, `data-*` and the like), and `*.test.*`, `__tests__`, fixtures, e2e and stories.
- Web guards: R1, R2, R3, R4, R5, R7, R9, R11, R12, R13, R14, R21. These lexical/AST checks do not prove runtime behavior or follow indirect data flow; those aspects remain review-only.
- Web review-only: R6, R8, R15–R20, R22. R23 is guarded by named vitest/e2e tests for Review and Files and review-only elsewhere. R10 is iOS-only, outside the web guard. The haptic and exhaustive surface-pair portions of R1 remain review-only on web.
