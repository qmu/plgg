---
created_at: 2026-06-24T14:16:58+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260624141655-u1-plgg-test-refinement-and-fidelity-gate.md]
---

# U2 — Migrate `plgg-view` from vitest to plgg-test

## Overview

Migrate the `plgg-view` package's 11 spec files from vitest to
`plgg-test`. **Gated** package — original vitest threshold **91**, gets
a `plgg-test.config.json` at 91 (R2). One of the two larger packages; it
may be split by source subtree (Html / Program / Style) if a single
commit is too large, but each sub-unit must leave the package green.

Note: one `plgg-view` spec (`Program/usecase/application.spec.ts`) uses
`vi.stubGlobal`/teardown — keep the typed `vi` seam, move
`afterEach`/`beforeEach` into the plgg-test import; do NOT introduce any
`as`/`any` for the global stub.

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§2 (recipe), §3 R2, §4 (coverage rule), §7 (U2).

## Key Files

- `packages/plgg-view/src/**/*.spec.ts` (11 files across Html/, Program/,
  Style/) — rewrite per recipe.
- `packages/plgg-view/package.json` — swap scripts; remove vitest +
  `@vitest/coverage-v8`; add `plgg-test`.
- `packages/plgg-view/vite.config.ts` — drop `test:` block + vitest
  triple-slash.
- `packages/plgg-view/plgg-test.config.json` — **new**, gated at 91.

## Implementation Steps

1. Rewrite all 11 specs per §2; for `application.spec.ts` keep the `vi`
   stub seam and relocate hooks to the plgg-test import.
2. Swap scripts; remove vitest devDeps; add `plgg-test`.
3. Clean `vite.config.ts`.
4. Add `plgg-test.config.json`: `{ "coverage": { "threshold": 91 } }`.
5. Format (printWidth 50).

## Considerations

- **Definition of done**: `scripts/test-plgg-view.sh` green AND
  `scripts/test-watch-plgg-view.sh` confirmed AND `npm run coverage`
  with the 91 gate observed firing.
- **Coverage parity rule (§4)**: lower the gate only to the measured V8
  number with a one-line rationale, never by excluding files; record as
  ship-or-defer.
- No `as`/`any`/`ts-ignore`; bodies RETURN their assertions.
- If split by subtree, the final sub-unit owns the package.json/
  vite.config/config changes and the green DoD.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` —
  specs + config stay at package paths.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  escape hatches; Prettier printWidth:50.
- `workaholic:implementation` / `policies/test.md` — coverage preserved;
  gate re-established at 91.
- `workaholic:implementation` / `policies/type-driven-design.md` —
  data-flow narrowing.
- `workaholic:implementation` / `policies/functional-programming.md` —
  data-last `check`, `return`-style.
- `workaholic:implementation` / `policies/command-scripts.md` — stable
  script contract.
- `workaholic:operation` / `policies/ci-cd.md` — CI green;
  build-before-test ordering intact.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — remove
  vitest.
