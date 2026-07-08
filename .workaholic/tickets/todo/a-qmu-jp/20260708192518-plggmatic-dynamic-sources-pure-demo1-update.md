---
created_at: 2026-07-08T19:25:18+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain, UX]
effort:
commit_hash:
category:
depends_on:
mission:
---

# Give plggmatic Model-driven collection sources so Demo 1's records can live in the Model (truly pure update)

## Overview

Follow-up split off from the Demo 1 refactoring sequence (ticket `20260708143615-demo1-module-split-pure-update.md`). That ticket set out to move Demo 1's `clients`/`projects` collections into the app Model so `update()` becomes a truly pure `(msg, model) → [model, cmd]`. During implementation we found this is **not possible in the demo alone**: plggmatic's scheduler reads each collection's `source: sync(() => rows)` through a **static thunk** fixed when the declaration is built (`plggmatic/Schedule/usecase/update.ts` `readInto` calls `content(path)` and snapshots the result into a slot) — the thunk receives only a `path`, never the app Model. A record created at runtime must therefore live where that static thunk can read it. The demo now isolates that scheduler-forced mutable state in one documented module (`packages/plggmatic-example/src/demo1/store.ts`), but the state is still module-global, so two `makeApp()` instances share it and `update()` is not pure.

Making `update()` genuinely pure requires a **framework change**: give the plggmatic scheduler a way to source a collection from data the consumer's Model owns (a dynamic/Model-driven source), so Demo 1 can hold `clients`/`projects` in its Model and delete `store.ts`.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` — conventional layout (applies to all code work)
- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript feature discipline; no `as`/`any`/`ts-ignore` (applies to all code work)
- `workaholic:implementation` / `policies/type-driven-design.md` — a Model-driven source is a new typed variant of `Source` alongside `Sync`/`Async`; model it explicitly, don't widen to `any`
- `workaholic:implementation` / `policies/functional-programming.md` — the goal is a pure `update()`; state enters and leaves through the Model, never module scope
- `workaholic:implementation` / `policies/domain-layer-separation.md` — the scheduler (framework) must not force domain state into module scope; the seam is a framework capability gap
- `workaholic:design` / `policies/sacrificial-architecture.md` — a `Source` variant is a rebuildable unit; weigh adding it vs. the roadmap-13 declarative rewrite that may supersede the hand-written demo entirely

## Key Files

- `packages/plggmatic/src/Declare/model/Source.ts` — the `Source` union (`Sync`/`Async`); a Model-driven variant would be added here
- `packages/plggmatic/src/Schedule/usecase/update.ts` — `readInto` consumes the source; a Model-driven source needs the app Model (or a consumer-supplied snapshot) threaded to the read
- `packages/plggmatic/src/Declare/model/Collection.ts` — `collection`/`erase` build the source; the new variant flows through here
- `packages/plggmatic-example/src/demo1/store.ts` — the demo-side seam this ticket would delete, moving records into the Demo 1 Model
- `packages/plggmatic-example/src/demo1/logic.ts` — `commitRecord`/`submitSection` would return the new records in the Model instead of calling `addClient`/`addProject`
- `packages/plggmatic-example/src/demo1/bizMenuDemo.spec.ts` — the behavioral safety net; must stay green

## Related History

- [20260708143615-demo1-module-split-pure-update.md](.workaholic/tickets/archive/work-20260706-120449/20260708143615-demo1-module-split-pure-update.md) - the split ticket that discovered this constraint and isolated the store seam; its Final Report documents the finding
- [20260706203650-demo-1-projects-section-live.md](.workaholic/tickets/archive/work-20260706-120449/20260706203650-demo-1-projects-section-live.md) - introduced the record collections now in `store.ts`

## Implementation Steps

1. Confirm the scheduler's read path: `readInto` (`plggmatic/Schedule/usecase/update.ts`) is the only place a `Sync` source is invoked; establish whether the consumer's Model (or a per-read snapshot) can be threaded there without breaking the `Sync`/`Async` design tenet.
2. Design a typed Model-driven `Source` variant (e.g. `FromModel`/`Dynamic`) in `Source.ts`, or a scheduler API to refresh a collection's rows from consumer-supplied data — whichever keeps `scheduled.update`'s `(msg, model) → [model, cmd]` shape and the "effects are data" tenet.
3. Thread it through `collection`/`erase` (`Collection.ts`) and `readInto`; keep `Sync`/`Async` behavior unchanged.
4. In Demo 1, hold `clients`/`projects` (and the id counters) in the Model; rewrite `commitRecord`/`submitSection` (`logic.ts`) to return the new records in the Model; delete `store.ts` (and its `resetStore`).
5. Verify `update()` is pure: two consecutive `makeApp()` instances share no state; the frozen spec stays green.
6. Format (Prettier printWidth 50), run `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh`, and exercise `demo1.html` in a browser (create a record, confirm it appears and does not leak across app instances).

## Quality Gate

**Acceptance criteria:**

- Demo 1's `clients`/`projects`/counters live in the Model; `packages/plggmatic-example/src/demo1/store.ts` is deleted.
- `update()` is pure: no module-global mutable state backs the record collections; two `makeApp()` instances observably share no created records.
- `bizMenuDemo.spec.ts` stays byte-identical (except import/module-path lines) and green.
- The plggmatic `Sync`/`Async` sources and the full 483-test suite are unaffected.
- No `as`, `any`, `@ts-ignore`, `@ts-expect-error`, or non-null `!` introduced.

**Verification method:**

- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green (all 483 + example 41).
- A new/existing test that creates a record in one `makeApp()` and asserts a second `makeApp()` does not see it.
- Manual browser pass of `demo1.html`: add a record, reload, confirm expected persistence semantics.

**Gate:**

- tsc clean AND full suite green AND the two-instance isolation test green AND the browser pass completed.

## Considerations

- This is a **framework** change to plggmatic — weigh it against the roadmap-13 declarative rewrite of the example, which may replace the hand-written Demo 1 app entirely and make the demo-side motivation moot. If roadmap-13 is imminent, a Model-driven source may still be worth it for other consumers, but the Demo 1 justification weakens.
- Separate but adjacent: Demo 1's stylesheet (`packages/plggmatic-example/src/demo1/styles.ts`) overrides 16 framework `pm-*` classes by name. Cleanly removing that coupling would also mean giving plggmatic real theming hooks (tokens/slots). That is its own follow-up, not in scope here, but shares the theme of "the demo reaches around framework gaps."
- Keep the `Sync`/`Async` two-shape source contract intact (design tenet e in `Source.ts`); a third variant must not force existing consumers to rewrite.
