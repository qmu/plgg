---
created_at: 2026-07-06T21:15:08+09:00
author: a@qmu.jp
type: enhancement
layer: [UX]
effort: 2h
commit_hash: b2d55d7d
category: Changed
depends_on: []
---

# RESUME — build out the contract-dev business-management-system demo (Demo 1)

> Carry/handoff checkpoint written 2026-07-06 to continue in a fresh session without relying on compaction. The next single increment (below) is **bring the Clients section to life**; the broader arc and all discovered constraints follow so a fresh `/drive` has full context.

## Where this is and what it is

The user is building a **demonstration business-management system for a contract software-development company (受託開発)**, themed on their own kind of company, inside **Demo 1** of the plggmatic guide. It grows one step at a time; each step is a real, browser-verified increment.

- **App lives in:** `packages/plggmatic-example` (`@plggmatic/example`, private) — the consumer package that imports the published `plggmatic` lib. The demo entry is `src/demo1/bizMenuDemo.ts` (+ `src/demo1-main.ts`, `demo1.html`), bundled to `dist/demo1.js` (bundle.config.ts entry `demo1`, stamp.ts page `demo1.html`).
- **Doc page:** `packages/site/demo/1.md` (route `/demo/1`), with a compile-checked twin `packages/site/examples/bizMenu.ts` for its `menu([...])` code fence.
- **Served at:** `/example/demo1.html` (the site build nests `packages/plggmatic-example/dist/.` into `packages/site/dist/example/`).
- The app's current title/wordmark is **"Contract Ops"** (declaration `title`) — see Open Decisions.

## Done so far (committed on branch work-20260706-120449)

1. `d7ad9f81` — Step 1: replaced the old pane-alignment Demo 1 with the **eight-section menu** declared from scratch: `menu([menuEntry("Dashboard","dashboard") … "Reports","reports"])`, English labels, mounted with `application` (URL-aware). Menu: Dashboard / Projects / Clients / Estimates & Contracts / Timesheets / Invoices / Members / Reports (ids: dashboard, projects, clients, deals, timesheets, invoices, members, reports).
2. `b3c687b2` — Step 2: brought **Projects** to life — a filterable `collection<Project>` (query "Filter projects") over 6 real projects, with a six-field **detail record** (Client, Contract, Status, Period, Budget, Lead). The other seven sections are placeholder stubs (a `STUBS` table → `stubCollection`).
3. `cde7940f` — Fix: removed a floating `.bo-brand` wordmark that **overlapped the breadcrumb** (both read "Contract Ops") — the view is now just `slot([bo-root],[multiColumn(scene)])`; the breadcrumb root + menu header brand the app.

Two framework changes landed in `plggmatic` along the way (both green, 170 tests, coverage gate held):
- `chromeCss.ts` — the `aria-current` inverted pill (and close/crumb hover pills) now use neutral `surface` ink on `primary-base` (was `primary-text`, which equals `primary-base` under the monochrome default → invisible active label). Also fixes the workbench and Demo 3.
- `Render/usecase/parts.ts` `detailFields` — now renders a non-empty field **label** as a `pm-field-label` caption above the value (was value-only; the workbench only ever used empty labels).

## Next increment (do this first)

**Bring the Clients (取引先) section to life** — mirror the Projects pattern: a filterable `collection<Client>` with a detail record. Suggested fields: Name, Status (prime/active/prospect), Since, Contact person, Projects (count or list as text), Notes. Replace the `clients` stub in the `STUBS` table with a real `clientsCollection` (like `projectsCollection`). Sample clients already referenced elsewhere: ACME Retail K.K., Beacon Financial, Cobalt Labs, Delta Logistics, Echo Media, Foxtrot Mfg. Keep labels English. Update `packages/site/demo/1.md` to note Clients is now live. Extend `bizMenuDemo.spec.ts` (filter narrows + `?c=clients&q=…`, select shows detail + `?c=clients&p=<id>`, deep link reproduces).

Then, in later increments (one per step, user picks order): the remaining sections (Invoices, Timesheets, Members, Reports, Dashboard), and the **action layer** on Projects/Clients (create/update/delete behind a form + confirm dialog — see the forms showcase `src/forms/formsDemo.ts` and `declaration.ts` `action(...)`/`immediate()`/`confirm()`/`cmdEffect` for the pattern).

## Patterns & constraints a fresh agent MUST know

- **Follow the plgg-coding-style skill** and CLAUDE.md: Option/Result, exhaustive match, NO `as`/`any`/`ts-ignore`, Prettier printWidth 50 (run `npx prettier --write` on new TS; do not hand-pack).
- **Detail vs child are mutually exclusive per collection.** `Schedule/usecase/scene.ts`: `isSome(c.child) ? drilledList : detailFor(...)`. A collection with a `child` drills on select and never shows its own detail fields. So a "record" section (Clients, Projects) is a **leaf with detail fields**; a "container" section that drills to a sub-list uses `child` and shows no own detail. Do not expect both.
- **`detailFields` now renders labels** (post-fix): `field("Client", value)` shows "Client / value" (label styled by `pm-field-label` in the shared `demoStyles.ts` demoCss, which `demo1-main.ts` injects). Empty label → value only.
- **Menu entry id must match a collection id.** `menuEntry(label, collectionId)`; the referenced `collection({ id: collectionId, ... })` must exist.
- **Child sources are path-keyed & total:** `sync((path) => rowsFor(path[0]))`, guard `path[0]` with `fromNullable`+`matchOption` (see the removed milestones attempt / the workbench `notesOf`).
- **Mount is `application` (not `sandbox`)** because the scheduler reflects selection/query to the URL. `scheduled = schedule(declaration)` is exported so specs assert `scheduled.toUrl(model).search`.
- **Specs run without a full DOM:** the in-house plgg-test DOM has no `documentElement`, no `createElementNS` (so no SVG mount). Assert on `renderToString(app.view(model))` and on `scheduled.toUrl(...)`/`app.init(makeUrl("/","?..."))`/`app.update(msg,m)` — mirror `src/demo1/bizMenuDemo.spec.ts` and `src/app.spec.ts`. Escaping: `renderToString` turns `&` into `&amp;`.

## Quality Gate (every increment)

1. `packages/plggmatic-example$ npm test` green (tsc + plgg-test; the demo1 program stays ~100%).
2. If a plggmatic source is touched: `packages/plggmatic$ npm test` green (170+, coverage gate > 90%) after rebuilding its dist.
3. `packages/site$ npm run check` green — examples tsc (incl. any new `examples/` twin for a new code fence) + plggpress build with the **dead-link checker** (root-absolute internal links must resolve; `/example/*.html` is exempt via the `.html` asset rule — never link `[..](/example/)` without an extension).
4. **Browser verification is mandatory and must be actually inspected** (the user caught a missed overlap): rebuild `packages/plggmatic-example` → rebuild `packages/site` → re-nest (`rm -rf packages/site/dist/example && mkdir -p … && cp -r packages/plggmatic-example/dist/. packages/site/dist/example/`) → drive the flow on the 5182 preview. For layout, use `browser_evaluate` + `getBoundingClientRect` to assert **no element overlap** objectively, not just eyeball a screenshot; also read the screenshot. Confirm 0 new console errors (the `favicon.ico` 404 is known/ignorable).

## Preview / verify setup

- A background `python3 -m http.server 5182 --directory packages/site/dist` serves the site; the cloudflared tunnel maps `plggmatic-guide.qmu.dev → :5182` (Cloudflare Access login as a@qmu.jp). Local: `http://localhost:5182/`. If the server isn't running in the fresh session, restart it after building `packages/site` and re-nesting `dist/example`. Do NOT tear down a preview the user is actively reading — schedule around it.
- Playwright MCP tools are deferred (load via ToolSearch `select:mcp__plugin_playwright_playwright__browser_navigate,...`).

## Open decisions awaiting the user (surface these on resume)

1. **Rename "Contract Ops"?** The user questioned the name (it's a coined placeholder = "Contract Operations"; "Ops" can read as infra/SRE). Options offered: keep it, or StudioDesk/DevDesk, or a Japanese-flavored 受注/受託 name, or the company's own internal-tool name. It's a one-word change to the declaration `title` (rendered as breadcrumb root + menu header). Await their choice before/at the next step.
2. **Which section next?** Clients recommended (above); user may pick another or ask for the action layer first.

## Ticket-first / workflow notes

- The user works **strictly ticket-first**: never edit code before a ticket exists; `/ticket` (no code) then `/drive`. Each increment this session went ticket → implement → `archive.sh` (commit + archive) with an approval gate where the user reviews via the preview URL. Small doc/visual fixes to just-shipped work were committed directly (not ticketed) — acceptable for trivial reversible touch-ups, but new sections/features get a ticket.
- Branch naming: `work-YYYYMMDD-HHMMSS` (already on `work-20260706-120449`). Commit message trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

## Final Report

Step 3 shipped on branch `work-20260706-120449`.

**Decisions taken (from the two open questions):**
- App title renamed **"Contract Ops" → "DevDesk"** (user's pick). One-word change to the declaration `title`; renders as breadcrumb root + menu header. No "Contract Ops" string remains.
- Next section = **Clients** (the recommended increment).

**What changed:**
- `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — added a `Client` record type + six real clients (acme/beacon/cobalt/delta/echo/foxtrot), a filterable `clientsCollection` ("Filter clients") whose rows carry a labelled detail record (Status / Since / Contact / Projects / Notes). Removed the `clients` placeholder from `STUBS` (now six stubs), wired `clientsCollection` into `declare({ collections })`, renamed the title, refreshed the header JSDoc.
- `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts` — retitled the brand assertion to `DevDesk`; added three Clients specs (filter narrows + `?c=clients&q=…`, select shows detail + `?c=clients&p=acme`, deep link `?c=clients&p=foxtrot` reproduces).
- `packages/site/demo/1.md` — prose now notes Projects **and** Clients are live; "other six sections" still stubs. Menu code-fence unchanged → no new `examples/` twin.

**Quality gate (all green):**
- `plggmatic-example` `npm test` — 29 passed / 0 failed, EXIT 0; `bizMenuDemo.ts` 100% (package coverage exempt — private demo).
- `site` `npm run check` — examples tsc + plggpress build + dead-link checker, EXIT 0 (19 pages).
- plggmatic source untouched → its suite not run (per gate step 2).
- **Browser-verified & inspected** (rebuilt example → re-nested `dist/example` → :5182 preview): DevDesk in breadcrumb+menu, Clients list + labelled detail record, filter narrows to Beacon on `?q=beacon`, objective `getBoundingClientRect` shows **no nav/breadcrumb overlap**, no horizontal scroll, 0 new console errors (only the known `favicon.ico` 404).

**Policy lens (UX / design pillar):** consistent with Modeless Design (every section + record reachable by URL, no mode state), Self-explanatory UI (labelled detail fields via `pm-field-label`), and Interaction standards (same collection+filter+detail behavior as Projects — learn once). No new dependencies, no dark patterns.

**Next increments (unchanged, user picks order):** remaining sections (Invoices, Timesheets, Members, Reports, Dashboard) one at a time, and the **action layer** on Projects/Clients (create/update/delete behind a form + confirm dialog — see `src/forms/formsDemo.ts` and `declaration.ts` `action`/`immediate`/`confirm`/`cmdEffect`).
