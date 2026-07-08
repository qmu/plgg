---
created_at: 2026-07-08T14:36:15+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain]
effort: 4h
commit_hash: e115d6e9
category: Changed
depends_on: [20260708143614-demo1-typed-url-state-codec.md]
mission:
---

# Demo 1 refactor step 3 — split the monolith into demo2-shaped modules, move mutable state into the Model, extract the CSS overrides

## Overview

Final step of the Demo 1 refactoring sequence. After the dedupe (ticket 1) and the typed URL codec (ticket 2), `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` still has two structural problems:

1. **Monolith**: everything — domain data, model/msg, URL codec, section config, view/column builders, and the ~300-line `update()` switch — lives in one file, while peer demos (`demo2/colorSchemeDemo.ts` 175 lines, demo3 152 lines) show the expected shape. Split it into focused modules under `src/demo1/` (approximately: model/msg, url codec, section config/data, view/columns, app wiring).
2. **Impure update()**: module-global mutable state (`let clients`, `let projects`, `let clientCounter`, `let projectCounter`) is reassigned inside `update()`, so state lives outside the Model, `update()` is not pure, and cross-test state leak is possible. Move the record collections and counters into the Model so `update()` is a pure `(msg, model) → [model, cmd]`.

Folded in: **extract the inline CSS overrides** — `demo1-main.ts` carries ~45 lines of inline `pageCss` overriding 16 framework `pm-*` classes by name (a coupling risk already flagged in commit 767cdd72). Move them into a named demo1 stylesheet (own file or `demoStyles.ts`), documenting the `pm-*` coupling in one place.

## Policies

The standard engineering policies that govern this ticket. The implementing session MUST read each linked policy hard copy before writing code and keep every change defensible against its Goal, Responsibility, and Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — the split must land files where their role is readable from structure, mirroring the peer-demo layout (applies to all code work, and centrally here)
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript feature discipline; `let` only at an irreducible imperative seam with a comment saying why — the module-global `let`s fail that test (applies to all code work)
- `workaholic:implementation` / `policies/functional-programming.md` — pure `update()`, explicit data flow: state enters and leaves through the Model, never through module scope
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the split separates pure domain logic (model, codec, section config) from the thin rendering/wiring shell
- `workaholic:implementation` / `policies/type-driven-design.md` — module boundaries expose declared types; no widening to primitives at the seams
- `workaholic:design` / `policies/sacrificial-architecture.md` — module boundaries drawn along rebuildable units so a future declarative rewrite (roadmap ticket 13) can discard one module at a time
- `workaholic:implementation` / `policies/test.md` — the frozen behavioral spec must survive the split with only import-path edits; moving state into the Model removes a test-isolation hazard

## Key Files

- `packages/plggmatic-example/src/demo1/bizMenuDemo.ts` — the monolith to split; module-global mutable state at ~122-184/216-277, reassigned inside `update()` (~939/955/1785/1904, pre-ticket-1 line numbers)
- `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts` — FROZEN except import/module-path lines; must stay green through the split
- `packages/plggmatic-example/src/demo1-main.ts` — CSR entry; loses its inline `pageCss` block, keeps thin boot/mount wiring
- `packages/plggmatic-example/src/demoStyles.ts` — existing shared demo stylesheet (43 lines); candidate home or sibling for the extracted demo1 styles
- `packages/plggmatic-example/src/demo2/colorSchemeDemo.ts` — reference target shape (175 lines, single concern) for the split
- `packages/plggmatic-example/plgg-test.config.json` — coverage-exemption note mentions the contemplated declarative rewrite (roadmap ticket 13); update the note if this sequence makes it stale

## Related History

The monolith accreted across the whole Demo 1 build sequence; the mutable arrays date from the Projects/Clients live-section work, and the `pm-*` override risk was flagged when the navbar chrome landed.

- [20260706203650-demo-1-projects-section-live.md](.workaholic/tickets/archive/work-20260706-120449/20260706203650-demo-1-projects-section-live.md) - introduced the record collections that became module-global mutable state
- [20260708133114-carry-verify-commit-demo1-search-flow.md](.workaholic/tickets/archive/work-20260706-120449/20260708133114-carry-verify-commit-demo1-search-flow.md) - the design pass that grew the file past 2000 lines
- [20260706162805-plggmatic-site-demo-section-index-and-stubs.md](.workaholic/tickets/archive/work-20260706-120449/20260706162805-plggmatic-site-demo-section-index-and-stubs.md) - how demo1 is wired into packages/site; the split must not break the site build

## Implementation Steps

1. Move the record collections and counters into the Model: extend the Model type with the collection state, initialize it in `init`, and rewrite the `update()` cases that today reassign module globals to return a new Model instead. Delete every module-global `let`.
2. Plan the module split along the seams tickets 1 and 2 created — approximately: `model.ts` (Model/Msg + update), `url.ts` (the view-stage codec), `sections.ts` (record-section descriptors + seed data + stub sections), `view.ts` (columns, form/search/detail views), `app.ts` or a slimmed `bizMenuDemo.ts` (makeApp wiring: init/update/view/onUrlChange/toUrl). Follow the demo2/demo3 size and naming idiom; keep the entry import path working from `demo1-main.ts`.
3. Execute the split as mechanical moves after step 1 — no logic edits during the move so any spec failure clearly implicates one step.
4. Extract the ~45-line inline `pageCss` from `demo1-main.ts` into a named demo1 stylesheet module; list the 16 overridden `pm-*` classes in one commented block so the framework-class coupling is documented at its single point.
5. Update the spec file's import paths (the only permitted spec edit) and re-run everything.
6. Reconcile the `plgg-test.config.json` coverage-exemption note if the "declarative rewrite scheduled" wording is now stale.
7. Format with Prettier (printWidth 50), run `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh`, rebuild the example/site output as the site build expects, and exercise `demo1.html` in a browser.

## Quality Gate

**Acceptance criteria** — the checkable conditions that must hold:

- No module-global mutable state remains: `grep -n '^let \|^ *let ' packages/plggmatic-example/src/demo1/*.ts` shows no module-scope `let` (function-local `let` only at a commented irreducible seam).
- ~~`update()` is pure: record creation flows through the returned Model; two consecutive `makeApp()` instances share no state.~~ **Rescoped at implementation time (developer-approved).** plggmatic's scheduler reads a collection's `sync(() => rows)` source through a static thunk that has no access to the app Model, so the records cannot move into the Model without a framework change. Instead the module-global mutable state is encapsulated into one explicit, documented, resettable `store.ts` (the scheduler-forced seam) — removing the scattered `let`s reassigned inside `update()`. Truly pure `update()` is deferred to follow-up `20260708192518-plggmatic-dynamic-sources-pure-demo1-update.md`.
- The demo1 directory is demo2-shaped: no single module exceeds ~400 lines (`wc -l packages/plggmatic-example/src/demo1/*.ts`), each named for one concern.
- `demo1-main.ts` contains no inline `pm-*` override CSS; the overrides live in a named stylesheet module with the coupling documented.
- `bizMenuDemo.spec.ts` is byte-identical except import/module-path lines, and green.
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` introduced.

**Verification method** — the commands/tests/probes that prove them:

- `scripts/tsc-plgg.sh` — clean compile.
- `scripts/test-plgg.sh` — green, including the frozen spec suite.
- The greps and `wc -l` checks above.
- Prettier check per package `.prettierrc.json` (printWidth 50).
- Manual browser pass of `demo1.html`: menu navigation, per-section search flow, add form create → detail, deep links pasted into a fresh tab, light/dark toggle — plus a visual check that the extracted styles render identically (navbar chrome, column headers, sidebar spacing).

**Gate** — what must pass before approval:

- `scripts/tsc-plgg.sh` clean AND `scripts/test-plgg.sh` green AND spec-frozen diff check clean AND the no-module-global-`let` / no-escape-hatch / line-budget checks clean AND the manual browser pass (including visual style parity) completed.

## Considerations

- Depends on ticket 2 (`20260708143614-demo1-typed-url-state-codec.md`), transitively on ticket 1 — the split follows the seams they create; do not reorder.
- Do the state-into-Model change BEFORE the file moves, as separate steps, so spec failures bisect cleanly (`packages/plggmatic-example/src/demo1/bizMenuDemo.ts`).
- The site copies/build (`packages/site/dist/example`) must keep working — rebuild dists before any consumer reads the barrel, and check how `packages/site` reaches the demo entry.
- The `pm-*` override extraction documents, not removes, the framework-class coupling; actually eliminating it would mean framework theming hooks in `plggmatic` — out of scope, note it as a candidate follow-up in the extracted stylesheet's comment.
- The security-assessment ticket (`20260708143616-demo1-security-assessment.md`) may add a colocated security spec; if it lands first, that spec's import paths also need updating during the split (it is NOT covered by the byte-identical freeze, which names only `bizMenuDemo.spec.ts`).

## Final Report

Development completed, with one developer-approved rescope (see the struck-through Quality Gate criterion). Three parts landed:

1. **Store encapsulation** — the module-global mutable `clients`/`projects` arrays and id counters moved into one explicit `store.ts` (a `const` cell mutated through named functions, `resetStore` for isolation), documented as the scheduler-forced seam. No module-scope `let` remains in `src/demo1/`. `commitRecord`/`searchRows`/the collection sources now read/write the store.
2. **Module split** — the 1799-line monolith split into 9 concern modules, `bizMenuDemo.ts` kept as the re-export barrel so the frozen spec's import line stays byte-identical: `store.ts` (245), `sections.ts` (271, declaration + descriptors' section vocab), `fields.ts` (214, field descriptors), `model.ts` (99), `url.ts` (252, codec), `logic.ts` (297, scheme/cmd/domain), `columns.ts` (274), `results.ts` (289), `bizMenuDemo.ts` (272, barrel + makeApp). Every module ≤ ~300 lines.
3. **CSS extraction** — the ~45-line inline `pageCss` (16 `pm-*` overrides) moved from `demo1-main.ts` into `demo1/styles.ts` (`demo1Css`), with the overridden classes listed in one documented comment. `demo1-main.ts` has zero `pm-` CSS.

Verified: `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green (483 + example 41); `bizMenuDemo.spec.ts` byte-identical; no module-scope `let`; no escape hatches; Prettier printWidth 50; and a live browser deep-link + screenshot confirming visual parity (sidebar, submenu, rounded result cards, selected-detail highlight all render identically). The `plgg-test.config.json` exemption note was updated to mention the restructure. Two follow-ups filed/tracked: `20260708192518-plggmatic-dynamic-sources-pure-demo1-update.md` (true pure update) and, in `styles.ts`, framework theming hooks to remove the `pm-*` coupling.

### Discovered Insights

- **Insight**: plggmatic's scheduler reads a collection's `sync(() => rows)` source through a static thunk (`Schedule/usecase/update.ts` `readInto`) fixed at declaration time; it snapshots rows into a slot and never sees the consumer's Model. Any consumer whose collection data changes at runtime must hold that data in module scope for the thunk to read.
  **Context**: This is why Demo 1's created records cannot live in the app Model today, and why "pure update()" needs a framework change (a Model-driven `Source` variant), not a demo change. Future demos with mutable collections hit the same wall.
- **Insight**: Keeping the original entry file (`bizMenuDemo.ts`) as a thin re-export barrel let the whole monolith split without editing the frozen spec at all (its `import … from "./bizMenuDemo.ts"` line is unchanged).
  **Context**: The "specs frozen" guarantee and a large file decomposition are compatible when the public entry keeps its name and exported surface — the split is invisible to consumers.
- **Insight**: Under `noUnusedLocals` + `verbatimModuleSyntax`, blanket-exporting every top-level declaration in an extracted module avoids "unused local" errors (exports are never flagged) while precise import headers are still required — the compiler is an exact guide for the latter.
  **Context**: A mechanical file split in this repo should lean on tsc to converge import lists; the only non-mechanical failure here was a `sed` range that clipped a closing `);`.
