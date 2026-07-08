---
created_at: 2026-07-08T14:36:14+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain]
effort:
commit_hash:
category:
depends_on: [20260708143613-demo1-generic-record-section.md]
mission:
---

# Demo 1 refactor step 2 — replace string-keyed URLSearchParams helpers with a typed URL-state codec

## Overview

Demo 1's URL handling in `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` is ~10 string-keyed `URLSearchParams` mutator/reader helpers (`withoutAppParams`, `withoutSelection`, `withAdd`, `withSearch`, `withSubmittedSearch`, `resultHref`, …) plumbing magic param names (`'c'`, `'add'`, `'search'`, `'submitted'`, `'kw'`, `'st'`, `'p'`) through the app, and `currentUrl()` derives the address bar from a nested ad-hoc boolean cascade (`activeAdd ? withAdd : search.open ? (submitted ? withSubmittedSearch : withSearch) : withoutAppParams`).

This ticket replaces the whole family with a single **typed URL-state codec**: parse the URL once into a discriminated view-stage union (e.g. `Menu | Add | Search | Results | Detail`), print that union back to a `Url`, and derive column visibility and `currentUrl()` from an exhaustive `match` over the union instead of boolean combinations. The URL stays the single source of truth (the demo's strength, and the modeless-design policy's demand) — it just gets a type.

Step 2 of the three-step Demo 1 refactoring sequence (generic record-section → **this** → module split).

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against its Goal, Responsibility, and Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript feature discipline; no `as`/`any`/`ts-ignore` (applies to all code work)
- `workaholic:implementation` / `policies/type-driven-design.md` — the core move: magic string keys become a discriminated view-stage union; a caster/codec is mandatory at the URL boundary exactly as at any wire boundary
- `workaholic:implementation` / `policies/functional-programming.md` — codec = pure parse/print pair; exhaustive `match` replaces the boolean cascade
- `workaholic:design` / `policies/modeless-design.md` — state must remain fully held in the URL (filters, selection, open section, search query); every stage deep-linkable, back/forward and parallel tabs intact
- `workaholic:implementation` / `policies/test.md` — the frozen behavioral spec (deep links, URL derivation) is the proof the codec round-trips identically

## Key Files

- `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — primary target; the helper family at ~716-795 (`withoutAppParams`/`withAdd`/`withSearch`/`withSubmittedSearch`/`resultHref` etc.) and the `currentUrl()` cascade at ~1046-1062 (line numbers pre-ticket-1; re-locate after the dedupe lands)
- `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts` — FROZEN behavioral spec; its URL-derivation, deep-link, and search-deep-link-ordering tests are the codec's acceptance proof
- `packages/plggmatic-example/src/demo1-main.ts` — CSR entry wiring `onUrlChange`/`toUrl`; signatures it consumes must keep working

## Related History

The per-section search flow pass is what multiplied the URL params (`search`/`submitted`/`kw`/`st`) on top of the earlier selection params, producing today's helper sprawl.

- [20260708133114-carry-verify-commit-demo1-search-flow.md](.workaholic/tickets/archive/work-20260706-120449/20260708133114-carry-verify-commit-demo1-search-flow.md) - added the per-section search flow and its URL params; the deep-link semantics it verified must survive byte-identically
- [20260706203650-demo-1-projects-section-live.md](.workaholic/tickets/archive/work-20260706-120449/20260706203650-demo-1-projects-section-live.md) - introduced selection/detail URL derivation (`'c'`, `'p'` style params)

## Implementation Steps

1. Inventory every read and write of each magic param key across the file; map each combination of params to its user-visible view stage.
2. Define the view-stage union first (type alias per stage carrying its typed payload: section, keyword, status filter, selected record, add-draft presence), plus the codec: `parseViewStage(url): ViewStage` (total — unknown/partial params fall back to a well-defined stage, preserving current behavior) and `printViewStage(stage): Url`.
3. Confine the magic key strings to the codec: after this ticket, `'add'`/`'search'`/`'submitted'`/`'kw'`/`'st'`/`'c'`/`'p'` appear only inside the codec definition.
4. Rewrite `currentUrl()`, `init`/`onUrlChange` reconstruction (`searchFormFromUrl`, `isAddUrl`), column-visibility decisions (`hideList`, the `matchOption`-gated app columns), and `resultHref`/`hrefOf` to be exhaustive `match`es over the parsed stage.
5. Verify round-trip: for every stage the spec exercises, `parse(print(stage)) = stage` and the printed param order matches what the deep-link-ordering test expects.
6. Format with Prettier (printWidth 50), run `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh`, and exercise `demo1.html` in a browser including direct deep-link entry.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- `bizMenuDemo.spec.ts` is byte-identical to its pre-refactor content except import/module-path lines, and every test passes — in particular the URL-derivation, deep-link, and search-deep-link-ordering tests, which prove the codec is behavior-identical.
- Magic param keys appear only inside the codec: `grep -n "'add'\|'search'\|'submitted'\|'kw'\|'st'" packages/plggmatic-example/src/demo1/` hits only the codec definition (and the frozen spec).
- The `withX`/`withoutX` `URLSearchParams` helper family is gone; `currentUrl()` (or its successor) is an exhaustive `match` over the view-stage union with no nested boolean cascade.
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` introduced.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` — clean compile (exhaustiveness of the new `match`es is compiler-checked).
- `scripts/test-plgg.sh` — green, including the frozen spec suite.
- Prettier check per package `.prettierrc.json` (printWidth 50).
- Manual browser pass of `demo1.html`: navigate menu → section → search → results → detail → add form, confirming the address bar updates at each stage; then paste each produced URL into a fresh tab and confirm the exact stage reconstructs (deep-link round-trip); back/forward walks the history correctly; light/dark toggle survives navigation.

**Gate** — what must pass before approval:

- `scripts/tsc-plgg.sh` clean AND `scripts/test-plgg.sh` green AND spec-frozen diff check clean AND magic-key confinement grep clean AND the manual deep-link round-trip browser pass completed.

## Considerations

- Depends on ticket 1 (`20260708143613-demo1-generic-record-section.md`): the codec's section payloads should be expressed through the record-section descriptor, not per-section unions — do not reintroduce the client/project split here.
- Param names and ordering are user-visible contract (shareable URLs, the ordering test); the codec must print exactly today's param layout — this is a representation refactor, not a URL redesign.
- Ticket 3 will move this codec into its own module (`url` codec file); shape it as a self-contained cluster (types + parse + print) so the split is a file move.
- `resultHref`/`hrefOf` are also the security ticket's audit surface (`20260708143616-demo1-security-assessment.md`); typing them here narrows that sink — cross-reference findings if the assessment lands first.
- Fallback behavior for malformed/partial params must match today's (whatever the current helpers do with absent keys); encode it in the parse function deliberately rather than by accident.
