---
created_at: 2026-06-24T14:16:57+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash: 8615e6a
category: Changed
depends_on: [20260624141655-u1-plgg-test-refinement-and-fidelity-gate.md]
---

# U2 — Migrate `plgg-http` from vitest to plgg-test

## Overview

Migrate the `plgg-http` package's 5 spec files from vitest to
`plgg-test`. This is a **gated** package — its original vitest threshold
was **90**, so it gets a `plgg-test.config.json` at threshold 90 (R2).

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§2 (migration recipe), §3 R2 (coverage config), §4 (coverage parity
rule), §7 (U2).

## Key Files

- `packages/plgg-http/src/Http/model/*.spec.ts` (HttpError, HttpRequest,
  HttpResponse, HttpStatus, Method) — the 5 specs to rewrite.
- `packages/plgg-http/package.json` — swap scripts; remove vitest +
  `@vitest/coverage-v8`; add `plgg-test`.
- `packages/plgg-http/vite.config.ts` — drop `test:` block + vitest
  triple-slash.
- `packages/plgg-http/plgg-test.config.json` — **new**, gated at 90.

## Implementation Steps

1. Rewrite all 5 specs per the §2 recipe (import swap, `check(x,
   matcher(y))` with `return`, `.not.`→`not(...)`, `.resolves`→
   `await`+`check`, `assert`→`okThen`/`shouldBeOk`).
2. Swap `package.json` scripts to the plgg idiom; remove vitest devDeps;
   add `plgg-test`.
3. Clean `vite.config.ts`.
4. Add `plgg-test.config.json`:
   `{ "coverage": { "threshold": 90 } }`.
5. Format (printWidth 50).

## Considerations

- **Definition of done**: `scripts/test-plgg-http.sh` green AND
  `scripts/test-watch-plgg-http.sh` confirmed AND `npm run coverage`
  run with the 90 gate observed firing.
- **Coverage parity rule (§4)**: if the measured plgg-test (V8) number
  lands below 90, lower the gate ONLY to the measured number, ONLY with
  a one-line istanbul-vs-V8 rationale in the config, NEVER by excluding
  files — and record it as a ship-or-defer line item in the event log.
- No `as`/`any`/`ts-ignore`; every body RETURNs its assertion.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` —
  specs + `plgg-test.config.json` stay at package paths.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  escape hatches; Prettier printWidth:50.
- `workaholic:implementation` / `policies/test.md` — coverage preserved
  file-for-file; gate re-established at the original number.
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
