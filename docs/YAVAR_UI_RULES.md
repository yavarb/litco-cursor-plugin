# Yavar's UI and product guidelines (LitCo)

**Canonical source:** `docs/YAVAR_UI_RULES.md` in `litkit-app` is the source copy. Copies in other repos are synced from this file, not maintained independently.

Any agent that receives a new UI, design or judgment ruling from Yavar adds it here in the same PR that implements it, then syncs the copies in litkit-ios, litkit-mac, litkit-marketing and litlex using each consumer repo's `scripts/sync-yavar-rules.sh` (see [Downstream synchronization](#downstream-synchronization)). There is no app-local sync script.

These are Yavar's default calls, not an immutable design spec: they can be changed or traded off. They guide every LitCo repo (litkit-app, litkit-ios, litkit-mac, litco-console, litco-agent, litlex and marketing).

### Owner ruling — guideline framing (2026-10-29 ET)

Verbatim from Yavar's chat with the Chief of Staff agent, supplied for PR #2550:

- **Yavar:** 2026-10-29 1:01 AM ET: "Are all of our ui/ux, design, and judgment calls being recorded somewhere so other agents follow them when they code"
- **Yavar:** 2026-10-29 1:02 AM ET: "Make sure it's in the repository where other agents can see, follow, update"
- **Yavar:** 2026-10-29 1:03 AM ET: "These aren't immutable. We may want to make changes or tradeoffs. They're more guidelines."

**Application and scope:** This ruling authorizes the repository-maintained guideline framing. PR #2550 implements it with FIRM/DEFAULT tiers and advisory DEFAULT review: legal, safety, privacy and security requirements remain FIRM; other calls are DEFAULT guidelines whose explained departures are not a FAIL. These tier names and enforcement mechanics are the implementation of the ruling, not additional verbatim quotes. This replaces the former blanket "Only Yavar can change or retire a rule" policy: agents may document and explain DEFAULT changes or tradeoffs in the implementing PR and update this source; a FIRM change still requires Yavar's explicit recorded ruling. The web guard therefore warns on DEFAULT hits while retaining blocking FIRM and invalid-configuration checks. The reason for the change is to permit documented design tradeoffs without waiving legal, safety, privacy or security requirements.

### How to apply these guidelines

- **Tiers.** Every numbered guideline is marked **FIRM** (legal, safety, privacy or security) or **DEFAULT** (everything else). Existing IDs stay stable. The table is also the web guard's source of tier assignments.
- **Departures and changes.** A PR that departs from a guideline names it and explains why in its PR description. If the call changed, update this file in that PR, retaining the ID and recording the date (ET), a one-line why, scope and source. A rationale alone does not waive a FIRM requirement; a changed FIRM call needs Yavar's explicit ruling recorded here.
- **Review.** Review loads this file at the PR head. An unexplained departure from a DEFAULT gets flagged; an explained one is **not a FAIL**. A FIRM violation **FAILs**, including review-only requirements.
- **Guards.** Web `scripts/check-yavar-rules.sh` (run by `pnpm lint`) reports DEFAULT hits as warnings and keeps FIRM hits failing. Invalid guard configuration still fails. Named tests and iOS `scripts/ci/*` identify additional coverage; a DEFAULT finding is advisory, not by itself a blocking product verdict. Syncing repos must apply the same tier policy to their guards.
- **Dates and sources.** “Since 10/24” means the original date was not found, not a claim that the ruling was issued that day. Local `Source:` paths preserve attribution; proposed designs without explicit owner approval are not rulings. Guidelines describe intended behavior, not proof that a feature has shipped.

"User-facing" means any text or behavior a customer can see or hear: UI strings, JSX text, labels, placeholders, accessibility labels, toasts, errors, emails, notifications, Ana's visible replies and tool labels, marketing pages, App Store and TestFlight text. Internal identifiers, repo, package and path names (`litkit-*`), comments, logs and tests are not user-facing.

Scope key: **web** = litkit-app (and console/marketing where relevant), **iOS** = litkit-ios (iPhone and iPad; litkit-mac follows the iOS guidelines), **both** = all of them.

### Downstream synchronization

The sync script belongs to each consumer repo, not litkit-app. From your task's consumer worktree, run `bash scripts/sync-yavar-rules.sh /absolute/path/to/litkit-app-checkout`, passing the **checkout directory**, not the markdown file. This writes that consumer's `docs/YAVAR_UI_RULES.md` and `docs/YAVAR_UI_RULES.md.sha256`; review and commit both in the consumer's own PR. Do not edit another lane's worktree. If the script is absent from the consumer revision, resolve that dependency first rather than assuming it exists in litkit-app.

For an unmerged canonical change, always pass the explicit app worktree path: the scripts' default sibling `litkit-app` / upstream `main` lookup need not contain the change. These sync scripts have no `--check` mode. Verify byte equality with `cmp docs/YAVAR_UI_RULES.md /absolute/path/to/litkit-app-checkout/docs/YAVAR_UI_RULES.md` from the consumer worktree, check its SHA-256 pin, and record the canonical source revision and consumer revision in the sync PR. The presence of downstream scripts does not mean the copies or guard policies have already been synced; each consumer PR must supply its own evidence.

| ID | Tier | Rule | Scope | Guard |
|----|------|------|-------|-------|
| R1 | DEFAULT | Surface switches are instant (no swipe, slide, page or matched-geometry transition) and keep the haptic | both | iOS: guard + UI test (Mac). Web: check-yavar-rules R1 |
| R2 | DEFAULT | No ETAs or time-left estimates in copy | both | web: no-eta-wording.test.ts + check-yavar-rules R2. iOS: check_no_eta.sh |
| R3 | FIRM | Ana never names her model or vendor; only platform-admin configuration shows underlying names | both | check-yavar-rules R3; iOS brand-copy guard |
| R4 | DEFAULT | Brand is "LitCo" only (never LitKit, LitLex, LitCode or "Litco") | both | branding-copy.test.ts, public-brand-*.test.ts, check-yavar-rules R4; iOS check_brand_copy.sh |
| R5 | DEFAULT | Billing is "Billing", never "Tempo" | both | check-yavar-rules R5; iOS check_brand_copy.sh |
| R6 | DEFAULT | Every long-press on a file uses the one shared share menu, with "Share link" and "Share externally…" first | both | iOS: one-builder guard + XCUITest per surface. Web: review-only |
| R7 | DEFAULT | "Works with your agents", never "bring your own agent/model" | both | check-yavar-rules R7; iOS brand-copy guard |
| R8 | DEFAULT | One credit price per action and one firm credit pool number | both | review-only (+ price-table unit test where one exists) |
| R9 | DEFAULT | Credits, not dollars, including Review cost-so-far, docs table and run cards; exceptions only for platform admin and plan checkout | both | check-yavar-rules R9 (scoped) + review |
| R10 | FIRM | No purchases or web-purchase links or calls to action in iOS; server sets `canBuy=false` on iOS | iOS | iOS: no-StoreKit guard (check_billing_origin.sh); purchase links/CTAs and server capability: review-only |
| R11 | DEFAULT | It's "Ana", never "Ask Ana" or chatbot framing | both | branding-copy.test.ts + check-yavar-rules R11; iOS check_no_ask_ana.sh |
| R12 | FIRM | No client or matter names in greetings, placeholders, empty states, chips or example prompts | both | check-yavar-rules R12 (interpolation in placeholder props) + review |
| R13 | FIRM | No real client, matter or person names in product copy or examples | both | check-yavar-rules R13 (deny-list) |
| R14 | DEFAULT | No placeholder, stub, "coming soon" or "not connected yet" UI in prod. Hide it until it works | both | check-yavar-rules R14 |
| R15 | DEFAULT | iPhone parity: a feature isn't done until it works on web and iPhone | both | review-only |
| R16 | FIRM | Ana entry points open the user's own private context thread, never #general | both | review-only |
| R17 | DEFAULT | Documents opened from Files open in Draft, inside the same app shell, and autosave | both | review-only |
| R18 | DEFAULT | Review defaults to the Fast lane, and review descriptions have no contradictions or unexplained jargon | both | review-only |
| R19 | DEFAULT | Job cost in credits is visible to everyone on the matter. Short of credits, the job waits and is never lost | both | review-only |
| R20 | DEFAULT | Firm invites and trials come from LitCo platform admin, card required by default (per-invite off switch) | web | review-only |
| R21 | DEFAULT | Design-partner discounts never appear on the website or in public copy | web | check-yavar-rules R21 (marketing copy) + review |
| R22 | DEFAULT | Copy reads like normal human writing: active voice, a clear headline, no bot-speak | both | review-only |
| R23 | DEFAULT | File and folder share links open for logged-out and non-customer recipients | both | review-only |
| R24 | DEFAULT | iPhone and iPad ship together | iOS | review-only |
| R25 | FIRM | Account deletion closes access, keeps records and deletes only specified profile data; explain retention before confirmation | both | review-only |
| R26 | FIRM | Never say "guarantee" | both | review-only |
| R27 | DEFAULT | Stock Ana is a live baseline inherited by every firm and user Ana | both | review-only |
| R28 | FIRM | The firm admin accepts Terms for the firm at signup and re-acceptance | both | review-only |
| R29 | DEFAULT | Review filter inputs use UI sans; only Bates body values use monospace | both | review-only |
| R30 | DEFAULT | The Review table belongs in a defined container, not floating on the background | both | review-only |
| R31 | DEFAULT | Keep List / Analyze visible; archived visibility belongs in overflow with a way back to active | both | review-only |
| R32 | DEFAULT | Pine is the default action accent; Indigo is optional | both | review-only |
| R33 | DEFAULT | Review filters do not blur, cover or disable the results table | both | review-only |
| R34 | DEFAULT | No stray focus box over a Files folder glyph | both | review-only |
| R35 | DEFAULT | The iPhone Review grid stays in its frame while scrolling | iOS | review-only |
| R36 | DEFAULT | Compact iPhone Review chrome leaves results visible | both | review-only |
| R37 | DEFAULT | Uploads resume and show transferred-byte progress rather than a stuck zero | both | review-only |
| R38 | DEFAULT | Files puts "Browse folders" at the top, directly under search | both | review-only |
| R39 | DEFAULT | Files reopens the last folder visited | iOS | review-only |
| R40 | DEFAULT | Channels opens to the default matter; product tabs switch in place in web order | iOS | review-only |
| R41 | DEFAULT | Ana's icon is the LitCo logo everywhere | both | review-only |
| R42 | DEFAULT | Review shows credits or omits the figure, never dollar costs; only platform admins see raw cost | both | check-yavar-rules R9 (scoped) + review |

---

## R1 — Instant surface switching, with the haptic
- **Tier:** DEFAULT.
- **Rule:** Every switch between top-level surfaces (Matters · Channels · Files · Review · Research · Draft · Billing · More/Settings, in every pair and direction) is an instant content swap. It never uses a swipe, slide, push, page-style TabView, matched-geometry or cross-fade transition. The selection haptic stays.
- **Yavar:** 2026-10-22 1:49 AM ET. Surface switches must be instant swaps; keep the haptic. Reaffirmed after iPhone 0.18 brought the swipe back, 2026-10-22 ~10:11 PM ET.
- **Why:** Navigation should feel immediate without losing tactile confirmation.
- **Scope:** both (iPhone, iPad, Mac, web launcher).
- **Guard (iOS, Mac lands it in mac/instant-switch-all):**
  - `scripts/ci/check_instant_surface_switch.sh` detects `.tabViewStyle(.page`, `PageTabViewStyle`, `matchedGeometryEffect`, `withAnimation`, `.transition(`, or a non-nil `.animation(` in the shared surface switcher or launcher files.
  - A unit or UI test walks every surface pair and asserts the switch makes no navigation push and has no animation (Transaction disablesAnimations).
  - A test asserts the selection haptic fires on switch.
- **Guard (web):** check-yavar-rules R1 warns on `transition-*`/`animate-*` classes, framer-motion `AnimatePresence`/`motion.` (aliases and namespace imports included) or a View Transitions API call (`startViewTransition`) in the launcher and surface-switch files listed as `instantPaths` in `scripts/yavar-rules/config.ts` (`src/components/shell/{surfaces-strip,surface-overlay,top-bar,header-overflow,app-shell}.tsx`, `src/components/ds/app-shell.tsx`, `src/lib/nav/launcher.ts`). CSS files (e.g. `src/components/shell/launcher.css`) are review-only. The existing `e2e/launcher/` suite covers launcher navigation; exhaustive surface-pair behavior and haptics remain review-only on web.

## R2 — No ETAs or time-left estimates
- **Tier:** DEFAULT.
- **Rule:** No ETAs in copy. Never show "about N min left", "N hours left", "time left", "usually takes", "runs out in", countdowns or any other remaining-time estimate on job progress, ingest, review, billing or any other screen. Servers don't build them either. Show a percent, a count ("312 of 1,000") or an indeterminate state. Absolute dates are fine.
- **Yavar:** 2026-10-21 8:44 PM ET. No "about N min left" estimates on any screen, web or iPhone, and none coming back as server-provided estimates.
- **Why:** Counts and progress are observable; speculative completion times mislead.
- **Scope:** both.
- **Guard:** web `src/lib/__tests__/no-eta-wording.test.ts` plus check-yavar-rules R2 (adds "usually takes", "runs out in", "days left"). iOS `scripts/ci/check_no_eta.sh`.

## R3 — Ana's identity, not her underlying model or vendor
- **Tier:** FIRM.
- **Rule:** Only the platform admin sees actual AI model or provider names. Everyone else, firm owners included, sees tiers only. Ana never names an underlying model or vendor; when asked, Ana says "I'm Ana" and redirects to helping with the task. The platform-admin exception is for administrative displays, not Ana's replies.
- **Yavar:** 2026-10-14 1:50 AM ET (platform-admin-only configuration); 2026-10-28 (Ana never names her model or vendor; asked, she identifies herself as Ana and redirects to helping).
- **Source:** Yavar's 2026-10-29 canonical-guidelines instruction (dated 10/28 ruling); `~/projects/litco/proposals/ANA-STOCK-PROPAGATION.md`, §4, records the identity-rule rollout plan, not proof of completion.
- **Why:** Ana has one product identity and does not expose underlying implementation details in conversation.
- **Scope:** both.
- **Guard:** check-yavar-rules R3 scans string literals, template parts, JSX text and attribute strings in the source list in `scripts/yavar-rules/config.ts` (`src/app`, `src/components` and the src/lib copy builders). It is case-sensitive, so lower-case provider keys are not copy. Platform-admin paths (`platformAdminPaths`: `src/app/(app)/owner/`, `src/app/(app)/admin/models/`, `src/app/(app)/admin/spend/`, `src/app/api/admin/model-config/`) are allow-listed. Inside a shared component, copy in the truthy branch of a configured platform-admin gate (`platformAdminGates`, exact file and gate name: `showModels` in `src/components/litco-usage/charges-table.tsx`) is allow-listed for R3 and R9 only. iOS: `check_brand_copy.sh` covers model names. Dynamic replies and redirects remain review-only.

## R4 — LitCo is the only brand
- **Tier:** DEFAULT.
- **Rule:** User-facing copy says "LitCo" (company LitCo AI LLC). Never "LitKit", "LitLex", "LitCode" or "Litco" (lower-case c). The research corpus is "LitCo" or "Research". Repo, package and identifier names may keep `litkit-*`.
- **Yavar:** 2026-10-07: "There is no LitKit brand anymore. The only product/brand is LitCo." 2026-10-02: never say LitCode.
- **Why:** One product name avoids making internal components look like separate products.
- **Scope:** both.
- **Guard:** web `src/test/branding-copy.test.ts`, `src/lib/chat/public-brand-text.test.ts`, `src/lib/chat/public-brand-surfaces.test.ts`, and check-yavar-rules R4 (adds LitLex, LitCode and "Litco" in literals and JSX). iOS `scripts/ci/check_brand_copy.sh`.

## R5 — Billing is never "Tempo"
- **Tier:** DEFAULT.
- **Rule:** The billing product is "Billing", part of LitCo. "Tempo" never appears in user-facing copy, new identifiers, error messages or emails.
- **Yavar:** 2026-10-13 10:56 PM ET: there is no separate Billing app; it's LitCo's Billing tab. The no-"Tempo" rule is in every billing and UI lane brief since then.
- **Why:** Billing is a LitCo surface, not another product to learn.
- **Scope:** both.
- **Guard:** check-yavar-rules R5 (`\bTempo\b` in literals and JSX). iOS `check_brand_copy.sh`.

## R6 — One shared share menu on every long-press
- **Tier:** DEFAULT.
- **Rule:** Every file surface (Files list and grid, viewer, search results, chat attachments, review documents) uses the ONE shared share-menu builder, so the menus match. A long-press (or context menu) on any file shows "Share link" and "Share externally…" first, then the existing items. The viewer's bar Share menu uses the same builder.
- **Yavar:** 2026-10-22 8:48 PM ET: "Force push should give you sharing options too right?"
- **Why:** Sharing should be discoverable and consistent wherever a file appears.
- **Scope:** both.
- **Guard:** iOS: a guard that every `.contextMenu` on a file row uses `DocumentShareMenu`, plus an XCUITest per surface asserting the first two items. Web: review-only until a shared context-menu component exists.

## R7 — "Works with your agents"
- **Tier:** DEFAULT.
- **Rule:** Frame the API/MCP as "works with your agents" (connect your own agents alongside Ana). Never write "bring your own agent", "bring your own model", BYOA, BYOM, BYO-LLM or anything that makes it read as an alternative to Ana.
- **Yavar:** 2026-10-22 9:07 PM ET.
- **Why:** External agents complement Ana rather than replace the product's identity.
- **Scope:** both, marketing included.
- **Guard:** check-yavar-rules R7 (`bring your own (agent|model|AI|LLM)`, `BYO[AM]\b`). iOS brand-copy guard.

## R8 — One credit price per action, one pool number
- **Tier:** DEFAULT.
- **Rule:**
  - An action costs the same credits from the firm's pool whether Ana, a person or the firm's own agent (API/MCP) does it. There's no reduced rate, no model or platform split and no separate Ana-vs-agent line. Plain reads are free under fair use.
  - The firm's credits show as one firm-wide pool number.
- **Yavar:** 2026-10-22 9:07 PM ET (one price). 2026-10-21 11:10 PM ET pricing lock (one pool, shown as one number).
- **Why:** A single price and balance let firms understand usage without actor-specific accounting.
- **Scope:** both.
- **Guard:** review-only. Where a single price table exists, a unit test asserts it has no actor or model dimension.

## R9 — Credits, not dollars (except platform admin)
- **Tier:** DEFAULT.
- **Rule:**
  - Job costs, usage and balances show credits. On Review this includes the cost-so-far tile, the docs table column and run cards; the 2026-10-28 11:57 PM ET ruling permits dropping the figure instead (R42).
  - Dollar amounts appear only to the platform admin and on the plan checkout and Stripe pages.
  - Customers never see "tokens".
- **Yavar:** 2026-10-22 1:57 AM ET: "show everyone on a matter the credits a review/tag job costs (no dollars except to platform admin)." Review-surface clarification relayed 2026-10-29 12:27 AM ET.
- **Source:** `~/agent-tools/herbert/INBOX.md:1063`, explicitly identifies Yavar's credits-not-dollars ask; Yavar's 2026-10-29 canonical-guidelines instruction names the three Review surfaces.
- **Why:** The displayed cost should use the same unit as the firm's credit balance.
- **Scope:** both.
- **Guard:** check-yavar-rules R9 warns on dollar literals (`$` followed by digits, `USD`) and the word "tokens" in user-facing text under review, usage, credits and job components. "Under review, usage, credits and job components" means a path segment named review, usage, credit(s) or job(s) (`creditPaths`). Platform admin and plan checkout (`pricingPaths`: `src/app/(app)/settings/plan/`, the admin billing plan and credit-pack files, `src/app/api/admin/billing/checkout/`) are allow-listed, as is the R3 `platformAdminGates` list. Numeric capture substitutions in a regex `.replace` / `.replaceAll` replacement string (e.g. `" $1"`) are not prices and are not flagged; literal prices there still are. Dollars computed at runtime (e.g. a `usd()` formatter) are not lexically visible; review covers the rest.

## R10 — No purchases or web-purchase links or calls to action in iOS
- **Tier:** FIRM.
- **Rule:** The iPhone and iPad app has no purchases (no StoreKit or Apple in-app purchase), and no links or calls to action to web purchase. The server sets `canBuy=false` on iOS. Firms buy on the web, but iOS must not direct them there to purchase.
- **Yavar:** 2026-10-28 11:31 PM ET: no links or calls to action to web purchase in iOS (App Store 3.1.1/3.1.3); the server sets `canBuy=false` on iOS. This supersedes the 2026-10-22 2:11 AM ET link-out-for-credits direction.
- **Source:** Yavar's Apple-side ruling relayed by the Mac agent, supplied in the PR #2550 follow-up instruction.
- **Why:** Keep iOS purchasing behavior consistent with App Store 3.1.1/3.1.3 rather than directing people to web purchase.
- **Scope:** iOS, including the server's iOS purchase capability.
- **Guard:** iOS `scripts/ci/check_billing_origin.sh`, extended to fail on `import StoreKit`, `SKPaymentQueue`, `Product.purchase`, `.storeProductsTask` or `SubscriptionStoreView`. Purchase links/calls to action and server `canBuy=false` remain review-only; this entry does not assert runtime enforcement has shipped.

## R11 — "Ana", not "Ask Ana"
- **Tier:** DEFAULT.
- **Rule:** The UI and chat say "Ana". Never "Ask Ana", "Chat with Ana" or "chatbot". Frame it as giving Ana a task (e.g. "Give Ana a research task").
- **Yavar:** 2026-10-07: never "Ask Ana" (it's not a chatbot). 2026-10-13 2:58 PM ET: no chatbot framing; "Give Ana a research task".
- **Why:** Task-oriented language reflects what Ana does rather than a chat widget.
- **Scope:** both.
- **Guard:** web `src/test/branding-copy.test.ts` plus check-yavar-rules R11 (adds "Chat with Ana" and "chatbot"). iOS `scripts/ci/check_no_ask_ana.sh`.

## R12 — No client or matter names in prompts and placeholders
- **Tier:** FIRM.
- **Rule:** Greetings, placeholders, empty states, suggestion chips and example prompts never name the client or matter, not even dynamically. Say "this matter". Ordinary data display (headers, lists) may show names.
- **Yavar:** 2026-10-08: prompts must say "this matter" rather than naming a client.
- **Why:** Incidental prompts should not expose confidential client or matter identities.
- **Scope:** both.
- **Guard:** check-yavar-rules R12 fails on matter or client name interpolation inside `placeholder=`, suggestion-chip and greeting strings. Review covers the rest.

## R13 — No real names in examples
- **Tier:** FIRM.
- **Rule:** Product copy, placeholders and example entries never use real client, matter or person names. Use obviously fictional examples.
- **Yavar:** 2026-10-08.
- **Why:** Examples must not disclose real identities or confidential relationships.
- **Scope:** both.
- **Guard:** check-yavar-rules R13 checks a deny-list (`scripts/yavar-rules/real-names.txt`, whole words, case-sensitive) against literals and JSX in the configured source list. Names that are also ordinary words stay off the list and are review-only.

## R14 — No placeholder or stub UI in prod
- **Tier:** DEFAULT.
- **Rule:** Never ship placeholder, stub or "not connected yet" UI ("coming soon", "arrives in milestone N", "Ana isn't connected", lorem ipsum). Hide the feature until it works.
- **Yavar:** 2026-10-07.
- **Why:** Visible controls should offer usable capabilities, not promises of future work.
- **Scope:** both.
- **Guard:** check-yavar-rules R14 (`coming soon`, `arrives in milestone`, `not connected yet`, `isn't connected`, `lorem ipsum` in literals and JSX).

## R15 — iPhone parity
- **Tier:** DEFAULT.
- **Rule:** The iPhone app stays consistent with every web change. A feature isn't done until it works on both web and iPhone. Web may ship first only while its iPhone counterpart is actively being built and both match before the batch closes; this is a timing allowance, not a parity waiver.
- **Yavar:** 2026-10-13 11:38 PM ET; timing clarification 2026-10-24 3:21 AM ET: "Yes, web can ship before its iPhone counterpart as long as that counterpart is being built and both match before the batch closes."
- **Source:** `~/agent-tools/ds-0b3-accent-setting-m5/INBOX.md:53–54`, explicitly labeled verbatim Yavar ruling.
- **Why:** People should be able to complete the same work regardless of device.
- **Scope:** both.
- **Guard:** review-only. A web PR that changes a user-facing feature must name its iOS counterpart PR, or explain the departure or why none is needed.

## R16 — Ana entry points open a private context thread
- **Tier:** FIRM.
- **Rule:** Every Ana entry point (Research, Files, Draft, etc.) opens the user's own private context thread (e.g. one per opinion in Research). It's never filed under #general or a channel. It moves to a channel only through an explicit Share.
- **Yavar:** 2026-10-07.
- **Why:** Private work must not be disclosed to a channel without an explicit sharing action.
- **Scope:** both.
- **Guard:** review-only.

## R17 — Files open in Draft, in the same shell
- **Tier:** DEFAULT.
- **Rule:** Documents opened from Files (Word, Markdown, text) open in Draft. Draft uses the same app shell (header, product tabs, back button, Ana sidebar). It autosaves when you navigate away, or asks if the save can't finish.
- **Yavar:** 2026-10-07.
- **Why:** Editing should preserve both navigation context and the person's work.
- **Scope:** both.
- **Guard:** review-only.

## R18 — Fast lane by default, clear review descriptions
- **Tier:** DEFAULT.
- **Rule:** Document review defaults to the Fast lane, including when Ana plans or launches one. Generated review descriptions are clear and never contradictory, with no unexplained jargon like "Standard".
- **Yavar:** 2026-10-08.
- **Why:** A useful starting choice and plain descriptions reduce setup ambiguity.
- **Scope:** both.
- **Guard:** review-only.

## R19 — Job cost visible, never lost for credits
- **Tier:** DEFAULT.
- **Rule:**
  - Everyone on a matter sees the credits a review/tag job costs.
  - Review & Tag checks credits at start. A short job is kept as "Waiting for credits" with its settings and is never lost. It starts once credits are bought.
  - On web, permitted users get a link right there to buy credits, see usage or upgrade. On iOS, R10 controls: no web-purchase links or calls to action, and the server sets `canBuy=false`.
- **Yavar:** 2026-10-22 1:57 AM ET; iOS purchase-link direction superseded by the 2026-10-28 11:31 PM ET ruling in R10.
- **Source:** For the iOS correction, Yavar's Apple-side ruling relayed by the Mac agent, supplied in the PR #2550 follow-up instruction (R10).
- **Why:** A funding shortfall should be actionable without throwing away configured work.
- **Scope:** both.
- **Guard:** review-only.

## R20 — Invites and trials from platform admin
- **Tier:** DEFAULT.
- **Rule:** Firm invites and free trials are created in LitCo platform admin, not the Stripe console. A card is required up front by default, with a per-invite off switch.
- **Yavar:** 2026-10-21 9:25 PM ET.
- **Why:** One invitation flow keeps trial terms and exceptions explicit.
- **Scope:** web (platform admin and console).
- **Guard:** review-only.

## R21 — No design-partner pricing in public copy
- **Tier:** DEFAULT.
- **Rule:** Design-partner discounts are offered privately per invite. They never appear on the website or in public copy.
- **Yavar:** 2026-10-21 11:10 PM ET: "Ok but design partners don't need to be on the website copy."
- **Why:** Individually negotiated discounts should not read as public plan terms.
- **Scope:** web (marketing and public pricing).
- **Guard:** check-yavar-rules R21 ("design partner" in the signed-out pages listed as `publicPaths` in `scripts/yavar-rules/config.ts`; this repo has no marketing or public pricing pages, which live elsewhere) + review.

## R22 — Human copy
- **Tier:** DEFAULT.
- **Rule:** Product, marketing and video copy reads like normal human writing: active voice, a clear headline about what the product does, and no bot-speak, vague "the X" phrasing or placeholder content.
- **Yavar:** 2026-10-22.
- **Why:** People should understand the product without decoding internal language.
- **Scope:** both.
- **Guard:** review-only.

## R23 — Share links work for external recipients
- **Tier:** DEFAULT.
- **Rule:** File and folder share links open for logged-out and non-customer recipients without requiring a LitCo account. This does not bypass the link's configured password, expiry, revocation or scope, or grant comment/edit rights beyond the share's permissions.
- **Yavar:** since 10/24 (2026).
- **Why:** A recipient should be able to receive a shared file without becoming a customer.
- **Source:** Yavar's 2026-10-29 canonical-guidelines instruction; no earlier dated owner ruling located.
- **Scope:** both.
- **Guard:** review-only.

## R24 — iPhone and iPad ship together
- **Tier:** DEFAULT.
- **Rule:** iPhone and iPad ship together; iPad is not a deferred follow-up to the iPhone release.
- **Yavar:** 2026-10-28.
- **Why:** Both supported iOS form factors should receive the same release capability.
- **Source:** Yavar's 2026-10-29 canonical-guidelines instruction (dated 10/28 ruling).
- **Scope:** iOS.
- **Guard:** review-only.

## R25 — Account closure and clear retention disclosure
- **Tier:** FIRM.
- **Rule:** Account deletion closes the account, ends its sessions and prevents sign-in. Keep identity, Terms acceptance, billing and activity records; drop only the profile photo, preferences and push tokens. The confirmation screen lists what is kept and why (legal claims, billing and security), and what is deleted. Do not describe closure as erasing or anonymizing those retained records.
- **Yavar:** 2026-10-29 12:50 AM ET (closure and retained records); 12:59 AM ET (approved legal wording and limited profile-data deletion).
- **Why:** Closure must preserve legal and security records without misleading people about erasure.
- **Source:** `~/projects/litco/proposals/ACCOUNT-DELETION-CONTRACT-MAC-v2.md`, decision; `~/projects/litco/proposals/legal-final/PUBLISH-HANDOFF.md`, status; `~/projects/litco/proposals/legal-final/confirm-delete-screen.md`. The later approved wording controls the profile-data deletion exception.
- **Scope:** both.
- **Guard:** review-only; this guideline is not evidence that deletion or the legal release has shipped.

## R26 — No absolute assurance wording
- **Tier:** FIRM.
- **Rule:** Never say "guarantee" in user-facing copy or Ana's replies.
- **Yavar:** since 10/24 (2026).
- **Why:** Product language must not make absolute assurances the service cannot substantiate.
- **Source:** Yavar's 2026-10-29 canonical-guidelines instruction; no earlier dated owner ruling located.
- **Scope:** both, marketing and legal copy included.
- **Guard:** review-only.

## R27 — Stock Ana is a live inherited baseline
- **Tier:** DEFAULT.
- **Rule:** Stock Ana is a live baseline every firm and user Ana inherits from, not a frozen copy made at account creation. Stock improvements flow through while preserving permitted firm and user customizations; locked identity and privacy requirements remain non-overridable.
- **Yavar:** 2026-10-28.
- **Why:** Existing Anas should benefit from product improvements without losing their customizations.
- **Source:** Yavar's 2026-10-29 canonical-guidelines instruction (dated 10/28 ruling); `~/projects/litco/proposals/ANA-STOCK-PROPAGATION.md`, §§1–2 and “Design lane”, records the inherited-baseline design and deployment caveats.
- **Scope:** both.
- **Guard:** review-only; FIRM identity and privacy boundaries still apply independently (R3, R12–R13, R16).

## R28 — Firm-admin Terms acceptance
- **Tier:** FIRM.
- **Rule:** The firm admin accepts the Terms on the firm's behalf at signup and at re-acceptance, confirming authority to bind the firm. The re-acceptance screen includes that explicit checkbox; do not silently treat an individual user's action as firm acceptance.
- **Yavar:** 2026-10-29 12:59 AM ET.
- **Why:** The acceptance record must match the contracting party and the administrator's authority.
- **Source:** `~/projects/litco/proposals/legal-final/conforming-edits-1259.md`, §2; `~/projects/litco/proposals/legal-final/PUBLISH-HANDOFF.md`, approved status and re-acceptance condition.
- **Scope:** both (signup and Terms re-acceptance wherever offered).
- **Guard:** review-only; publication and implementation status must be checked separately.

## R29 — One UI font for Review filter inputs
- **Tier:** DEFAULT.
- **Rule:** Review filter inputs use the normal UI sans font. Monospace is reserved for Bates values in table body cells, not Bates filter inputs.
- **Yavar:** 2026-10-24 4:14–4:22 AM ET, via Chief/Pixel.
- **Why:** Inputs should look consistent while Bates values retain their useful fixed-width treatment.
- **Source:** `~/agent-tools/review-filter-font-m5/INBOX.md:1–10`, explicitly attributed to Yavar via Pixel and Chief/Pixel.
- **Scope:** both (Review web and its iPhone embed).
- **Guard:** review-only.

## R30 — Review tables do not float on the canvas
- **Tier:** DEFAULT.
- **Rule:** The Review table sits in a defined card/container aligned with its toolbar rather than appearing to float on the page background. Empty, loading and error states belong inside that same container.
- **Yavar:** 2026-10-24 4:20 AM ET, “floating table” feedback.
- **Why:** A stable container makes the results area and its states read as one surface.
- **Source:** `~/agent-tools/review-list-container-sc/INBOX.md:2–8`, dated specification responding to Yavar's feedback. Pixel's exact inset/radius measurements are implementation guidance, not additional owner rulings.
- **Scope:** both (web and iPhone embed).
- **Guard:** review-only.

## R31 — Visible view switch, archived visibility in overflow
- **Tier:** DEFAULT.
- **Rule:** Keep List / Analyze visible as the first Review toolbar control. Put archived visibility in overflow, show a clear “Back to active” action while enabled, and reset to active on reload. Archived refers to named reviews, not documents.
- **Yavar:** 2026-10-24 4:23 AM ET, via Chief and Pixel.
- **Why:** The main view switch stays easy to find while an occasional archive mode does not crowd the toolbar.
- **Source:** `~/agent-tools/review-list-container-sc/INBOX.md:13–18`, owner-attributed toolbar decision; `~/agent-tools/review-toolbar-ios/INBOX.md:56–68`, Pixel's subsequent terminology correction to named reviews (not a separate Yavar ruling).
- **Scope:** both; phone layout may adapt under R36 without hiding the view switch.
- **Guard:** review-only.

## R32 — Pine by default, optional Indigo
- **Tier:** DEFAULT.
- **Rule:** Use Pine as the default action accent and offer Indigo as the alternative in Appearance. Replace the old navy primary/launcher treatment, preserve identity colors and warm neutrals, and make accent switching immediate and accessible.
- **Yavar:** 2026-10-24 4:23 AM ET reiteration, via Chief and Pixel; original palette choice 2026-10-23.
- **Why:** A coherent action accent provides choice without replacing the product's identity palette.
- **Source:** `~/agent-tools/ds-0b2-accent-swap-m5/INBOX.md:53–62`; `~/agent-tools/ds-0b3-accent-setting-m5/INBOX.md:56–66`. Storage/API prescriptions in the original lane note were superseded and are not part of this owner call.
- **Scope:** both.
- **Guard:** review-only.

## R33 — Filters leave Review results usable
- **Tier:** DEFAULT.
- **Rule:** Opening Review filters must not blur or scrim the results table or make it inert. Results remain visible, scrollable and interactive while filters are open.
- **Yavar:** 2026-10-26 11:45 AM ET, via Chief.
- **Why:** People need to inspect results while refining their filters.
- **Source:** `~/agent-tools/review-filter-noblur-m5/INBOX.md:3–10`, explicitly owner-attributed request to remove the blur/scrim; the underlying dialog technique is an implementation choice.
- **Scope:** both where filters sit alongside the results table.
- **Guard:** review-only.

## R34 — No stray focus box on folder icons
- **Tier:** DEFAULT.
- **Rule:** Files must not show a stray focus box over a folder glyph. Keep a usable focus indication on the actual focused row, tile or control rather than an isolated decorative icon.
- **Yavar:** 2026-10-24 4:17 AM ET, reported via Chief.
- **Why:** Focus should identify what will be activated, not look like a rendering artifact.
- **Source:** `~/agent-tools/files-segmented-ios/INBOX.md:21–22`, explicitly records Yavar's web Files report and the native/embed follow-up. Specific native focus APIs are not owner rulings.
- **Scope:** both, including iPad keyboard focus.
- **Guard:** review-only.

## R35 — Review scrolling stays inside its frame
- **Tier:** DEFAULT.
- **Rule:** On iPhone, scrolling the Review grid must not drag the entire table down/right, expose white top/left gaps or let the header/filter row drift. Keep normal document scrolling and horizontal access to columns within the table's frame.
- **Yavar:** 2026-10-24 9:39 PM ET, reported via Chief.
- **Why:** Scrolling should move through results, not pull the results surface out of place.
- **Source:** `~/agent-tools/ios-192-scroll-m5/INBOX.md:1–10`, owner report and resulting acceptance goal; native/web scrolling techniques are implementation choices.
- **Scope:** iOS (iPhone Review grid).
- **Guard:** review-only.

## R36 — Compact iPhone Review chrome
- **Tier:** DEFAULT.
- **Rule:** Use less white space and smaller UI at the top of iPhone Review so results are visible. Avoid stacked duplicate chrome; keep the work and its controls reachable. Exact heights and row/card arrangements remain implementation choices, not additional owner rulings.
- **Yavar:** 2026-10-29 approximately 12:09 AM ET: “Less white space, smaller UI up top, results visible.”
- **Why:** Review results, not surrounding chrome, should occupy the small screen.
- **Source:** `~/agent-tools/ios-review-compact/spec/SPEC-ios-review-compact-t1029.md:1–2`, explicitly Yavar via Chief; the rest of the Pixel specification proposes the implementation.
- **Scope:** both (iPhone native chrome and mobile web/embed layout).
- **Guard:** review-only.

## R37 — Resumable uploads with honest byte progress
- **Tier:** DEFAULT.
- **Rule:** Support resuming interrupted uploads and show transferred-byte progress rather than leaving the display at zero while data transfers. This does not authorize an ETA (R2).
- **Yavar:** request relayed 2026-10-28 7:22 PM ET.
- **Why:** People need to see actual progress and recover an interrupted transfer without starting over.
- **Source:** `~/agent-tools/herbert/INBOX.md:1050–1054`, explicitly attributes the resumable-upload and zero-byte-display ask to Yavar. Incident-specific names are omitted; no multipart architecture is prescribed here.
- **Scope:** both.
- **Guard:** review-only.

## R38 — Browse folders directly under Files search
- **Tier:** DEFAULT.
- **Rule:** The Files tab puts "Browse folders" at the top, directly under search, on iOS and web.
- **Yavar:** 2026-10-28.
- **Why:** Keep folder browsing easy to find directly below search.
- **Source:** `litkit-ios#225`; Yavar's Apple-side ruling relayed by the Mac agent, supplied in the PR #2550 follow-up instruction.
- **Scope:** both (iOS and web).
- **Guard:** review-only.

## R39 — Files reopens the last folder visited
- **Tier:** DEFAULT.
- **Rule:** Files reopens the last folder visited.
- **Yavar:** before 10/24 (2026); exact date not supplied.
- **Why:** Preserve the person's folder context when returning to Files.
- **Source:** `litkit-ios#205`; Yavar's Apple-side ruling relayed by the Mac agent, supplied in the PR #2550 follow-up instruction.
- **Scope:** iOS.
- **Guard:** review-only.

## R40 — Default matter in Channels and in-place product tabs
- **Tier:** DEFAULT.
- **Rule:** Channels opens to the default matter, and product tabs switch in place in web order.
- **Yavar:** before 10/24 (2026); exact date not supplied.
- **Why:** Keep the starting matter and product navigation consistent.
- **Source:** `litkit-ios#190`; Yavar's Apple-side ruling relayed by the Mac agent, supplied in the PR #2550 follow-up instruction.
- **Scope:** iOS.
- **Guard:** review-only; R1 separately covers instant switching and the haptic.

## R41 — Ana's icon is the LitCo logo
- **Tier:** DEFAULT.
- **Rule:** Ana's icon is the LitCo logo everywhere.
- **Yavar:** before 10/24 (2026); exact date not supplied.
- **Why:** Give Ana one consistent visual identity across surfaces.
- **Source:** `#172`; Yavar's Apple-side ruling relayed by the Mac agent, supplied in the PR #2550 follow-up instruction.
- **Scope:** both.
- **Guard:** review-only.

## R42 — No dollar costs on Review screens
- **Tier:** DEFAULT.
- **Rule:** Review screens show credits or drop the cost figure, never dollar costs. Only platform admins see raw cost. This is the explicit Review application of R9, including cost-so-far, the docs table and run cards.
- **Yavar:** 2026-10-28 11:57 PM ET.
- **Why:** Review costs should use credits rather than expose raw dollar costs to customers.
- **Source:** Yavar's Apple-side ruling relayed by the Mac agent, supplied in the PR #2550 follow-up instruction.
- **Scope:** both.
- **Guard:** check-yavar-rules R9 (scoped) plus review; no separate R42 scanner. R9's runtime-formatting limitations still apply.

## Web guard implementation paths

- Tier source: the numbered table in this file; `check.ts` reads it rather than maintaining a second severity list. DEFAULT hits warn; FIRM hits fail. Stale baseline entries follow their rule's tier; missing configured paths or invalid tier metadata fail as guard configuration errors.

- Entry: `scripts/check-yavar-rules.sh`; implementation: `scripts/yavar-rules/check.ts`; lint wiring: `package.json`.
- Explicit source inventory, surface-switch scope and narrow exceptions: `scripts/yavar-rules/config.ts`.
- Shared ETA patterns: `scripts/yavar-rules/no-eta-patterns.ts`, also imported by `src/lib/__tests__/no-eta-wording.test.ts`.
- Real-name deny-list: `scripts/yavar-rules/real-names.txt`; exact existing debt: `scripts/yavar-rules/baseline.txt`.
- Synthetic regression fixtures: `scripts/yavar-rules/check.test.ts`; scratch-copy mutation proof: `scripts/yavar-rules/mutation-proof.ts`; operating details: `scripts/yavar-rules/README.md`.
- What counts as copy: string literals, template parts, JSX text and attribute strings. Skipped: comments, identifiers, imports, object keys, literal types, `case` labels, `===`/`!==` operands, HTTP header names, `safeLog`/`console` arguments, non-copy JSX attributes (`href`, `id`, `data-*` and the like), and `*.test.*`, `__tests__`, fixtures, e2e and stories.
- Web guards: R1, R2, R3, R4, R5, R7, R9, R11, R12, R13, R14, R21. These lexical/AST checks do not prove runtime behavior or follow indirect data flow; those aspects remain review-only.
- Web review-only: R6, R8, R15–R38, R41. R10, R39 and R40 are iOS-scoped, outside the web guard. R42 uses the existing scoped R9 check plus review. The haptic and exhaustive surface-pair portions of R1 remain review-only on web.
