---
created_at: 2026-06-24T14:17:02+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260624141655-u1-plgg-test-refinement-and-fidelity-gate.md]
---

# U2 — Migrate `plgg-server` from vitest to plgg-test (incl. R3 toThrow ×2)

## Overview

Migrate the `plgg-server` package's 14 spec files from vitest to
`plgg-test` — the largest package. **Gated** package — original vitest
threshold **91**, gets a `plgg-test.config.json` at 91 (R2). Carries two
of the three **R3** `toThrow` hand-rewrites (`.not.toThrow()`). May be
split by source subtree (Http / Routing / Serving / Ssg / View) if a
single commit is too large; each sub-unit must leave the package green
and the final sub-unit owns the package.json/vite.config/config changes.

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§2 (recipe), §3 R2 + **R3**, §4 (coverage rule), §7 (U2).

**R3 sites (this package):** `src/bun.spec.ts:59` and `src/deno.spec.ts:63`
— `expect(() => createAdapter(...)(...)(...)).not.toThrow()`.
Hand-rewrite to capture whether it threw and **RETURN** the inverse
assertion:

```ts
test("bun adapter omits onListen when not provided", () => {
  const threw = ((): boolean => {
    try { createAdapter(impl)({ port: 0 })(handler); return false; }
    catch { return true; }
  })();
  return check(threw, toBe(false));
});
```

`serve.spec.ts` uses `vi.stubGlobal`/hooks — keep the typed seam, move
hooks into the plgg-test import, no `as`/`any`.

## Key Files

- `packages/plgg-server/src/**/*.spec.ts` (14 files across Http/,
  Routing/, Serving/, Ssg/, View/, plus `bun.spec.ts` + `deno.spec.ts`
  which carry R3) — rewrite per recipe.
- `packages/plgg-server/package.json` — swap scripts; remove vitest +
  `@vitest/coverage-v8`; add `plgg-test`.
- `packages/plgg-server/vite.config.ts` — drop `test:` block + vitest
  triple-slash.
- `packages/plgg-server/plgg-test.config.json` — **new**, gated at 91.

## Implementation Steps

1. Rewrite all 14 specs per §2. Apply R3 to `bun.spec.ts:59` and
   `deno.spec.ts:63` (try/return boolean +
   `return check(threw, toBe(false))`).
2. In `serve.spec.ts`: keep `vi.stubGlobal`/`vi.fn`; relocate hooks to
   the plgg-test import.
3. Swap scripts; remove vitest devDeps; add `plgg-test`.
4. Clean `vite.config.ts`.
5. Add `plgg-test.config.json`: `{ "coverage": { "threshold": 91 } }`.
6. Format (printWidth 50).

## Considerations

- **Definition of done**: `scripts/test-plgg-server.sh` green AND
  `scripts/test-watch-plgg-server.sh` confirmed AND `npm run coverage`
  with the 91 gate observed firing.
- **Coverage parity rule (§4)**: lower only to the measured V8 number
  with a one-line rationale, never by excluding files; record as
  ship-or-defer.
- The two R3 bodies MUST return their assertions.
- No `as`/`any`/`ts-ignore`; keep the typed `vi.stubGlobal` seam.
- If split by subtree: each sub-unit green; final sub-unit owns
  package.json + vite.config + `plgg-test.config.json`.

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
