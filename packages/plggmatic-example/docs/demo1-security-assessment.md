# Demo 1 — Security Assessment

**Scope:** Demo 1, the contract-dev business-management menu, served as `demo1.html`. Source under `packages/plggmatic-example/src/demo1/` (`store`, `sections`, `fields`, `model`, `url`, `logic`, `columns`, `results`, `bizMenuDemo`) plus its CSR entry `packages/plggmatic-example/src/demo1-main.ts`, rendered through `plgg-view` and the `plggmatic` scheduler.

**Date:** 2026-07-08. **Assessor:** drive session (ticket `20260708143616-demo1-security-assessment.md`).

**Verdict:** No findings. Demo 1 is a client-side-rendered example with no server, authentication, authorization, or persistence surface of its own. XSS is structurally prevented at the render layer, and the URL/href construction cannot produce an executable scheme. The load-bearing claims below are pinned by `packages/plggmatic-example/src/demo1/demo1Security.spec.ts`.

## Methodology

1. Traced every path by which URL parameters, form drafts, or record data become rendered text, attributes, or hrefs, and confirmed each passes through `plgg-view`'s escaping seam.
2. Audited the href sink (`resultHref`/`hrefOf`) for `javascript:`/`data:` scheme reachability and attribute breakout.
3. Exercised hostile inputs (`<script>`, `"><img onerror=…>`, `javascript:` paths, markup in `kw`/`p` params) through the real render and URL codec, in code (`demo1Security.spec.ts`).
4. Wrote a verdict for each design-pillar security lens, with `file:line` evidence or an explicit "no such surface."

## Input → output map

- **URL params** (`c`, `p`, `add`, `search`, `submitted`, `kw`, `st`) — parsed by the `url.ts` codec into typed stages/`SearchForm`; rendered back into (a) form input `value=` attributes, (b) result/menu/close `href=` attributes, (c) the printed address bar via `printAppLayer`/`resultHref`.
- **Form drafts** (`model.ts` `SectionForm.drafts`, `search`) — rendered into input `value=` attributes; on submit, `logic.ts` `commitRecord` builds a record whose `id` is `slugId`-normalized to `[a-z0-9-]` (`store.ts:233`).
- **Record data** (`store.ts` seed + created records) — projected to rows (`sections.ts` `projectRow`/`clientRow`) and search results (`results.ts` `searchRows`), rendered as text nodes and into detail fields by the scheduler.

Every one of these output positions is a `plgg-view` `text()` node or `attr()`/`href()` attribute; there is **no `innerHTML`, `dangerouslySetInnerHTML`, or raw-HTML seam** anywhere in `src/demo1/` or `demo1-main.ts` (grep: no match).

## Per-lens verdicts

### 1. Defense in depth — output escaping (`workaholic:design/defense-in-depth.md`)

**Pass.** Output defaults to escaping at the single render seam, and URL-bearing attributes get an additional scheme guard:

- Text nodes: `renderToString` sends every text value through `escapeText` (`packages/plgg-view/src/Html/usecase/renderToString.ts:78`), which escapes `&`/`<`/`>` (`packages/plgg-view/src/Html/usecase/escape.ts:9-15`). A record name like `<script>` renders as `&lt;script&gt;` and can never become markup.
- Attribute values: every attribute is emitted only if `isSafeAttrName` passes — which rejects any `on*` name, so the generic `attr()` hatch cannot install an inline event handler — and the value is wrapped `escapeAttr(safeAttrValue(name, value))` (`renderToString.ts:54-56`). `escapeAttr` additionally escapes `"`/`'` (`escape.ts:21-29`), so a value cannot break out of its quotes.
- URL attributes (`href`, `src`, `action`, …): `safeAttrValue` applies `safeUrl`, which neutralizes any scheme other than `http(s)`/`mailto`/`tel` (and strips ignorable control chars before reading the scheme) to `"#"` (`escape.ts:56-98`). The client DOM renderer shares the same `safeAttrValue` (`packages/plgg-view/src/Program/usecase/render.ts:208-210`), so SSR and hydration cannot drift.
- Unsafe tag names (only reachable via the low-level `el()` hatch, which Demo 1 does not use) are dropped whole (`renderToString.ts:83`, `isSafeTag`).

The href sink is safe twice over: `resultHref`/`hrefOf` build `${url.path}${encoded params}` (`url.ts:181-193`), where `url.path` is the browser's page path (not attacker-supplied via query) and params are `URLSearchParams`-encoded; and even a hostile `url.path` (e.g. `javascript:…`) is neutralized to `"#"` by `safeUrl` at render. Pinned by `demo1Security.spec.ts` ("the href sink neutralizes a javascript: scheme").

### 2. Access control (`workaholic:design/access-control.md`)

**No such surface.** Demo 1 has no authorization: it is a pure client-side view whose entire state derives from the URL. There is no protected resource, no server endpoint, and no request an attacker could construct to reach privileged state — every URL simply selects a view stage over public demo data. No scattered or bypassable authorization checks exist because there are none to bypass.

### 3. Authentication (`workaholic:design/auth-procurement.md`)

**No such surface.** Demo 1 introduces no custom authentication, session token, credential storage, or password handling. `demo1-main.ts` only injects CSS, reads the appearance scheme from `localStorage`, and mounts the app. Nothing to hand-roll, nothing to review.

### 4. Admin isolation (`workaholic:design/admin-isolation.md`)

**No such surface.** There are no administrative or privileged operations. The only mutating action is "register a record," which appends to an in-memory demo collection (`store.ts`); it is a peer feature, not a privileged one, and reaches no admin surface.

### 5. Data sovereignty (`workaholic:design/data-sovereignty.md`)

**Pass (minimal).** The only data the demo holds is (a) the seed records and any records the user registers in the session, living in module memory (`store.ts`), and (b) the current view state in the URL. Nothing is persisted to a server, and nothing is transmitted off the page. `localStorage` is used only for the light/dark appearance preference (`demo1-main.ts`), not for user data. Reloading the page discards registered records — no retention liability.

## Out-of-scope observations

- The wider `plggmatic` action surface (CSRF on `/act`, the SSR settle loop) is out of scope for this Demo 1 assessment and was not audited here.
- The escaping guarantees above are properties of `plgg-view` (`escape.ts`, `renderToString.ts`, `render.ts`), which Demo 1 depends on but does not own. They are cited as the structural basis for Demo 1's safety; a change to `plgg-view`'s escaping would affect this verdict and should re-trigger this assessment.

## Recommended follow-ups

None required for security. (No vulnerability was found, so no fix ticket is filed.) The assessment is kept honest by `demo1Security.spec.ts`; if a future change adds a server/auth/persistence surface to Demo 1, re-run this assessment against the new surface.
