---
created_at: 2026-06-24T14:17:04+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash: 62cea1f
category: Changed
depends_on: [20260624141655-u1-plgg-test-refinement-and-fidelity-gate.md]
---

# U2 — Migrate `plgg-foundry` from vitest to plgg-test (incl. R1 consumer + R4 ×4)

## Overview

Migrate the `plgg-foundry` package's 6 spec files from vitest to
`plgg-test`. **Ungated** package (no vitest threshold) — gets NO
`plgg-test.config.json`. Carries the **R1 consumer** (the one
`toBeGreaterThanOrEqual` call site the U1 matcher serves) and **R4**
(drop 4 `test.skip` timeout args).

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§2 (recipe), §3 **R1** (consumer) + **R4**, §7 (U2).

**R1 consumer:** `Foundry/usecase/runFoundry.spec.ts:35` —
`expect(todos.size).toBeGreaterThanOrEqual(1)` →
`return check(todos.size, toBeGreaterThanOrEqual(1))`. Depends on the U1
matcher being merged (covered by `depends_on`).

**R4 sites (4 in this package):** `Foundry/usecase/blueprint.spec.ts`
(`}, 30000)`), `Foundry/usecase/runFoundry.spec.ts` (`}, 30000)`),
`Example/ProfileFoundry.spec.ts` (`}, 60000)`),
`Example/TodoFoundry.spec.ts` (`}, 60000)`). All `test.skip`
live-network integration tests; drop the trailing timeout arg (TS2554
under plgg-test's 2-arg `test.skip`). No signature change.

## Key Files

- `packages/plgg-foundry/src/Foundry/model/Foundry.spec.ts`,
  `usecase/blueprint.spec.ts` (R4), `usecase/operate.spec.ts`,
  `usecase/runFoundry.spec.ts` (R1 + R4),
  `Example/ProfileFoundry.spec.ts` (R4),
  `Example/TodoFoundry.spec.ts` (R4) — 6 specs.
- `packages/plgg-foundry/package.json` — swap scripts; remove vitest +
  `@vitest/coverage-v8`; add `plgg-test`.
- `packages/plgg-foundry/vite.config.ts` — drop `test:` block + vitest
  triple-slash.

## Implementation Steps

1. Rewrite all 6 specs per §2.
2. R1: `runFoundry.spec.ts:35` →
   `return check(todos.size, toBeGreaterThanOrEqual(1))` (matcher from
   U1; import it from `plgg-test`).
3. R4: drop the trailing timeout arg from the 4 `test.skip` sites.
4. Swap scripts; remove vitest devDeps; add `plgg-test`. NO
   `plgg-test.config.json` (ungated).
5. Clean `vite.config.ts`.
6. Format (printWidth 50).

## Considerations

- **Definition of done**: `scripts/test-plgg-foundry.sh` green AND
  `scripts/test-watch-plgg-foundry.sh` confirmed. No coverage gate
  (ungated).
- R1 consumer requires U1 merged first (enforced by `depends_on`).
- The skipped integration tests stay `.skip`; R4 only drops the inert
  timeout arg.
- No `as`/`any`/`ts-ignore`; bodies RETURN their assertions.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` —
  specs stay co-located; package config at root.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  escape hatches; Prettier printWidth:50.
- `workaholic:implementation` / `policies/test.md` — assertions
  preserved one-for-one (incl. the `>=` assertion via R1); ungated stays
  ungated.
- `workaholic:implementation` / `policies/type-driven-design.md` —
  data-flow narrowing; value-carrying matcher.
- `workaholic:implementation` / `policies/functional-programming.md` —
  data-last `check`, `return`-style.
- `workaholic:implementation` / `policies/command-scripts.md` — stable
  script contract.
- `workaholic:operation` / `policies/ci-cd.md` — CI green;
  build-before-test ordering intact.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — remove
  vitest.
