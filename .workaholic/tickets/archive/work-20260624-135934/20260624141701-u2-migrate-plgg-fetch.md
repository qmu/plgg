---
created_at: 2026-06-24T14:17:01+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash: 2ca7dd7
category: Changed
depends_on: [20260624141655-u1-plgg-test-refinement-and-fidelity-gate.md]
---

# U2 — Migrate `plgg-fetch` from vitest to plgg-test (incl. R3 toThrow)

## Overview

Migrate the `plgg-fetch` package's 4 spec files from vitest to
`plgg-test`. **Gated** package — original vitest threshold **91**, gets a
`plgg-test.config.json` at 91 (R2). Carries one of the three **R3**
`toThrow` hand-rewrites.

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§2 (recipe), §3 R2 + **R3** (toThrow), §4 (coverage rule), §7 (U2).

**R3 site (this package):** `Http/usecase/seam.spec.ts:74` —
`expect(() => toFetchRequest(...)).toThrow()`. No `toThrow` matcher
exists in plgg-test; hand-rewrite to capture whether it threw and
**RETURN** the assertion (a side-effecting `check()` in a try/catch reads
*fail* even on success, because the runner fails any body that does not
return an Assertion):

```ts
test("toFetchRequest throws on a malformed URL", () => {
  const threw = ((): boolean => {
    try { toFetchRequest(baseRequest({ path: "not a url" })); return false; }
    catch { return true; }
  })();
  return check(threw, toBe(true));
});
```

This package also uses the `vi.stubGlobal("fetch", vi.fn(impl))` typed
seam and `afterEach` (`request.spec.ts`), plus
`expect(spy).not.toHaveBeenCalled()` → `check(spy.mock.calls.length,
toBe(0))`. Keep the typed `vi` seam; do NOT introduce any `as`/`any` for
the global stub.

## Key Files

- `packages/plgg-fetch/src/Http/model/ClientError.spec.ts`,
  `usecase/decode.spec.ts`, `usecase/request.spec.ts`,
  `usecase/seam.spec.ts` — 4 specs (seam.spec carries R3).
- `packages/plgg-fetch/package.json` — swap scripts; remove vitest +
  `@vitest/coverage-v8`; add `plgg-test`.
- `packages/plgg-fetch/vite.config.ts` — drop `test:` block + vitest
  triple-slash.
- `packages/plgg-fetch/plgg-test.config.json` — **new**, gated at 91.

## Implementation Steps

1. Rewrite all 4 specs per §2. Apply R3 to `seam.spec.ts:74` (try/return
   boolean + `return check(threw, toBe(true))`).
2. In `request.spec.ts`: move `afterEach` into the plgg-test import;
   keep `vi.stubGlobal`/`vi.fn`; rewrite
   `expect(fetchSpy).not.toHaveBeenCalled()` →
   `return check(fetchSpy.mock.calls.length, toBe(0))`.
3. Swap scripts; remove vitest devDeps; add `plgg-test`.
4. Clean `vite.config.ts`.
5. Add `plgg-test.config.json`: `{ "coverage": { "threshold": 91 } }`.
6. Format (printWidth 50).

## Considerations

- **Definition of done**: `scripts/test-plgg-fetch.sh` green AND
  `scripts/test-watch-plgg-fetch.sh` confirmed AND `npm run coverage`
  with the 91 gate observed firing.
- **Coverage parity rule (§4)**: lower only to the measured V8 number
  with a one-line rationale, never by excluding files; record as
  ship-or-defer.
- The R3 body MUST return the assertion — a bare `check()` statement
  inside the catch reads fail even on success.
- No `as`/`any`/`ts-ignore`. The reference `plgg/postJson.spec.ts` casts
  its fetch mock — do NOT copy that; use the typed `vi.stubGlobal` seam.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` —
  specs + config stay at package paths.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  escape hatches; Prettier printWidth:50.
- `workaholic:implementation` / `policies/test.md` — coverage preserved
  at 91; throw-assertion meaning preserved exactly (R3).
- `workaholic:implementation` / `policies/type-driven-design.md` —
  data-flow narrowing; typed spy seam.
- `workaholic:implementation` / `policies/functional-programming.md` —
  data-last `check`, `return`-style.
- `workaholic:implementation` / `policies/command-scripts.md` — stable
  script contract.
- `workaholic:operation` / `policies/ci-cd.md` — CI green;
  build-before-test ordering intact.
- `workaholic:implementation` / `policies/vendor-neutrality.md` — remove
  vitest.
