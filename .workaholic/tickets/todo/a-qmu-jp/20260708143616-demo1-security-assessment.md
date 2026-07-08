---
created_at: 2026-07-08T14:36:16+09:00
author: a@qmu.jp
type: housekeeping
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on:
mission:
---

# Demo 1 security assessment — written findings report plus href-sink spec assertions

## Overview

Assess the security posture of Demo 1 (`packages/plggmatic-example/src/demo1/`, served as `demo1.html`) as it stands, and record the result durably. Demo 1 is a client-side-rendered plggmatic example with no server, auth, or persistence surface of its own; all rendering flows through `plgg-view`'s `escape.ts` (`escapeText`/`escapeAttr`), so XSS is structurally prevented at the render layer — the existing spec already asserts label escaping. The open questions are the **href sink** (`resultHref`/`hrefOf` build hrefs from URL params by string concatenation — confirm attribute escaping covers them and no `javascript:` scheme is reachable), URL-param injection round-trips, and a documented verdict on each design-pillar security lens (defense-in-depth, access control, auth, admin isolation, data sovereignty) even where the honest answer is "no such surface exists."

Deliverables: (1) a written findings report checked into the repo, and (2) new colocated spec assertions that pin the href-sink and injection behavior so the verdicts stay machine-checked.

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against its Goal, Responsibility, and Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — conventional placement for the report and the new spec (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — the new spec follows house TypeScript discipline (applies to all code work)
- `workaholic:design` / `policies/defense-in-depth.md` — primary lens: output defaults to escaping; any escape-disabling path must be explicit and recorded; audit the render/escape layer and the href sink against it
- `workaholic:design` / `policies/access-control.md` — verify no scattered/bypassable authorization exists and no constructed request reaches protected state (expected verdict: no authz surface — state it explicitly)
- `workaholic:design` / `policies/auth-procurement.md` — confirm Demo 1 introduces no custom auth/session/credential surface; flag anything found
- `workaholic:design` / `policies/admin-isolation.md` — confirm no privileged/admin operation hides behind the demo UI
- `workaholic:design` / `policies/data-sovereignty.md` — data minimization: what the demo collects (form drafts, URL params), where it lives (URL/memory only), what persists
- `workaholic:implementation` / `policies/test.md` — security claims are encoded as behavioral spec assertions, colocated, real components over mocks
- `workaholic:implementation` / `policies/objective-documentation.md` — the report states verified, factual findings with evidence (file:line), not aspirational intent

## Key Files

- `packages/plgg-view/src/Html/usecase/escape.ts` — the structural XSS defense: every text node and attribute value passes through `escapeText`/`escapeAttr`; central evidence for the report
- `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — the audit surface: `resultHref`/`hrefOf` href construction from URL params, form-input handling, search keyword flow (paths shift if the refactor tickets land first — audit whatever the current demo1 module layout is)
- `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts` — existing XSS-escape assertion (`label.split('&').join('&amp;')`); the new assertions go in a NEW colocated spec file, leaving this one untouched
- `packages/plggmatic-example/src/demo1-main.ts` — entry wiring; confirm nothing bypasses the escaping render path (no raw innerHTML seam)
- `packages/plggmatic/src/Render/usecase/multiColumn.ts` — framework renderer the demo hangs columns on; confirm demo data reaches it only through escaping constructors

## Related History

No prior security ticket has ever targeted Demo 1; the only security work in history (CI shell injection, path-traversal brands, plgg-auth hardening) is unrelated. Demo 1's build history defines today's audit surface.

- [20260708133114-carry-verify-commit-demo1-search-flow.md](.workaholic/tickets/archive/work-20260706-120449/20260708133114-carry-verify-commit-demo1-search-flow.md) - added the search flow whose keyword/status params are the injection round-trip surface
- [20260706203650-demo-1-projects-section-live.md](.workaholic/tickets/archive/work-20260706-120449/20260706203650-demo-1-projects-section-live.md) - added detail/child drill hrefs — the `resultHref`/`hrefOf` sink under audit

## Implementation Steps

1. Map the input→output flow: every point where URL params, form drafts, or seed data become rendered text, attributes, or hrefs; confirm each passes through `escapeText`/`escapeAttr` (`packages/plgg-view/src/Html/usecase/escape.ts`) and that no raw-HTML/`innerHTML` seam exists in the demo or its render path.
2. Audit the href sink: trace `resultHref`/`hrefOf` (or their post-refactor successors) — can any URL-param value produce an `href` with a `javascript:` (or `data:`) scheme, or break out of the attribute? Determine whether `escapeAttr` plus the URL-construction shape structurally prevents it, or whether a scheme check is missing (a finding).
3. Attempt URL-param injection round-trips in code: hostile keyword/status/selection params (`"><script>`, `javascript:alert(1)`, `%0d%0a`, over-long values) through parse → render → printed URL; record what each becomes.
4. Write verdicts for the remaining lenses with evidence or an explicit "no such surface": access control (no authz surface — pure client demo), auth (none introduced), admin isolation (no privileged operations), data sovereignty (data lives only in URL + page memory; nothing persisted or transmitted).
5. Write the report to `packages/plggmatic-example/docs/demo1-security-assessment.md` (create `docs/` if absent, per directory-structure policy): scope, methodology, per-lens verdicts with file:line evidence, findings with severity, and recommended follow-ups. Every claim factual and verifiable per objective-documentation.
6. Encode the load-bearing claims as a NEW colocated spec file (e.g. `packages/plggmatic-example/src/demo1/demo1Security.spec.ts`): href-sink scheme/markup neutralization, text/attr escaping of hostile record values through the real render, hostile-param round-trip outcomes. Do not touch `bizMenuDemo.spec.ts`.
7. If a real vulnerability is found, do NOT fix it in this ticket — record it in the report with severity and file a follow-up ticket; this ticket's diff stays assessment-only (report + tests).
8. Format with Prettier (printWidth 50), run `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh`.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- The report exists at `packages/plggmatic-example/docs/demo1-security-assessment.md` and contains a verdict for each of the five design-pillar lenses (defense-in-depth/escaping, access control, auth, admin isolation, data sovereignty), each with file:line evidence or an explicit "no such surface" statement, and a findings list with severity (or an explicit "no findings").
- A new colocated security spec exists and passes, asserting at minimum: (a) a hostile record value (`<script>`, `"` , `&`) renders escaped in text and attribute positions through the real render path; (b) `javascript:`-scheme and markup-breaking payloads in URL params cannot produce an executable/attribute-escaping `href` from the href sink; (c) hostile params round-trip through parse/print without gaining capability.
- `bizMenuDemo.spec.ts` is untouched (`git diff` shows no change to it).
- The ticket's diff contains only the report and the new spec — no production-code fixes (findings become follow-up tickets).
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` in the new spec.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` — clean compile including the new spec.
- `scripts/test-plgg.sh` — green, including the new security spec block (example package is coverage-exempt; the gate is test pass).
- `git diff --stat` — confirms the diff is report + new spec only.
- Developer reads the report and accepts each verdict against the linked policy hard copies.

**Gate** — what must pass before approval:

- `scripts/tsc-plgg.sh` clean AND `scripts/test-plgg.sh` green (new security assertions included) AND diff-scope check clean AND the developer has reviewed and accepted the written report.

## Considerations

- Independent of the refactoring sequence (no `depends_on`), but ordering matters practically: if driven before ticket 3's module split, the new spec's import paths will need updating during that split (noted in `20260708143615-demo1-module-split-pure-update.md`); if driven after, audit the post-split modules — the lenses and gate are unchanged.
- Ticket 2 (`20260708143614-demo1-typed-url-state-codec.md`) types the href sink this ticket audits; cross-reference — a scheme-validation gap found here may be cheapest to close inside that codec (as a follow-up ticket, not in this diff).
- The assessment scope is Demo 1 only, per the agreed gate; the wider plggmatic action surface (CSRF on `/act`, SSR settle loop) is out of scope — if the audit trips over a framework-level concern, record it in the report as out-of-scope-observed and file it separately.
- The report is objective documentation: no "should be safe" language — every verdict cites the code (`packages/plgg-view/src/Html/usecase/escape.ts` and the demo1 call sites) or a passing assertion.
