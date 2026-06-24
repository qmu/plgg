---
created_at: 2026-06-24T14:16:55+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# U1 — plgg-test refinement (toBeGreaterThanOrEqual) + toEqual/deepEqual fidelity gate

## Overview

The trip replaces vitest with `plgg-test` across 9 packages. Before any
per-package migration begins, two things must land in `plgg-test`: the
one matcher the corpus needs that does not yet exist, and a verified
guarantee that `plgg-test`'s `toEqual`/`deepEqual` agrees with vitest's
`toEqual` on the plgg domain values the corpus asserts over. This ticket
is the **foundation** — every U2 package-migration ticket depends on it.

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§3 (R1, Gate A, Gate B).

Two deliverables:

1. **R1 — add `toBeGreaterThanOrEqual` matcher.** Exactly one corpus
   site (`plgg-foundry/.../runFoundry.spec.ts:35`,
   `expect(todos.size).toBeGreaterThanOrEqual(1)`) needs a `>=` matcher.
   `toBeGreaterThan` exists; `>=` does not. This is the ONLY plgg-test
   source-code change in the entire trip.

2. **Gate B (hard entry gate) — `deepEqual` ≡ vitest `toEqual`.** 81
   `toEqual` sites across the corpus assert over Box-tagged
   Option/Result, Datum, arrays, etc. `plgg-test`'s `toEqual` uses its
   own `Expect/equals.ts` `deepEqual`, not vitest's. Confirm parity on
   class instances, nested Box-tagged Option/Result, `Map`/`Set`, and
   the `undefined`-vs-absent property distinction. A divergence is a
   silent false-green/false-red and must be resolved BEFORE U2 begins.
   If Gate B reveals a divergence, fixing it (matcher correction or a
   documented per-site rewrite rule) becomes part of this ticket's
   scope — it is the gate that licenses the bulk rewrite.

Gate A (the Runner fails-not-crashes on a thrown/rejected body) is
already **confirmed** by source read (`Core/Runner.ts:202-268`: body
runs in try/catch inside an unhandled-rejection window; the runner also
fails any body that does not RETURN a branded Assertion — the
anti-false-green guard). Record it as done; add a one-line regression
spec only if not already covered.

## Key Files

- `packages/plgg-test/src/Matchers/matchers.ts` — add the matcher beside
  `toBeGreaterThan` (same `matcher(...)` helper, predicate
  `actual >= expected`, typed `A extends number | bigint`).
- `packages/plgg-test/src/index.ts` — re-export `toBeGreaterThanOrEqual`
  from the matchers block.
- `packages/plgg-test/src/Matchers/matchers.spec.ts` — add a unit test
  for the new matcher (pass, fail, and equality-boundary cases).
- `packages/plgg-test/src/Expect/equals.ts` /
  `packages/plgg-test/src/Expect/equals.spec.ts` — read to confirm
  `deepEqual` semantics; extend the spec with a vitest-`toEqual`-parity
  block over the plgg domain shapes (Box-tagged Option/Result, class
  instances, Map/Set, undefined-vs-absent).
- `packages/plgg-test/src/Core/Runner.ts` — reference only (Gate A
  evidence; no change unless a regression spec is missing).

## Implementation Steps

1. Add `toBeGreaterThanOrEqual` to `matchers.ts` mirroring
   `toBeGreaterThan` exactly; re-export from `index.ts`.
2. Add its unit test in `matchers.spec.ts` (cover `>`, `=`, `<`).
3. Read `Expect/equals.spec.ts`; add a parity block asserting
   `deepEqual` matches vitest `toEqual` semantics on: a nested
   Box-tagged `Ok`/`Err`/`Some`/`None`, a class instance, a `Map` and a
   `Set`, and an object with an explicit `undefined` prop vs an absent
   prop. (vitest `toEqual` ignores `undefined` props — confirm
   `deepEqual` matches that, or document the rule the rewrite must
   follow.)
4. If a divergence is found, resolve it: prefer a `deepEqual` fix; if a
   behavior is intentionally different, document the exact rewrite rule
   U2 must apply and record it as a ship-or-defer line item in the event
   log.
5. Confirm Gate A: verify (or add) a `Runner.spec.ts` case that a
   throwing/rejecting body reports a FAIL (not a crash) and that a body
   returning a non-Assertion is failed.
6. Verify: `scripts/tsc-plgg-test.sh` clean, `scripts/test-plgg-test.sh`
   green, coverage gate (plgg-test's own `plgg-test.config.json`, 85)
   still passes. No `as`/`any`/`ts-ignore`.

## Considerations

- This ticket gates the whole trip: do not start any U2 ticket until
  Gate B passes and R1 is merged.
- `toBeGreaterThanOrEqual` must be added without weakening the existing
  `matcher(...)` typing — `A extends number | bigint`, value flows
  through on success (the data-last contract).
- The parity spec must use real plgg primitives (`ok`/`err`/`some`/
  `none`/`box`) so it exercises the actual Box tag, not a plain object.
- plgg-test gates ITSELF at branch-85 (documented istanbul-vs-V8
  rationale in its own config). Adding a matcher + spec must not drop it
  below that; if it does, that is a ship-or-defer line item.

## Policies

- `workaholic:implementation` / `policies/directory-structure.md` —
  matcher and its spec stay co-located in `Matchers/`; the parity spec
  stays in `Expect/`. No relocation.
- `workaholic:implementation` / `policies/coding-standards.md` — no
  `as`/`any`/`ts-ignore`; Prettier printWidth:50; house expression
  style.
- `workaholic:implementation` / `policies/test.md` — Gate B is the
  testing-strategy guarantee that the migration preserves assertion
  meaning one-for-one; the matcher addition keeps the runner capable
  rather than bending tests around a gap.
- `workaholic:implementation` / `policies/type-driven-design.md` — the
  matcher is data-last and value-carrying (`Assertion<X>`), modeling the
  verdict as a value.
- `workaholic:implementation` / `policies/functional-programming.md` —
  the matcher returns a `Result`-shaped `Assertion`, no throw.
- `workaholic:implementation` / `policies/command-scripts.md` — verified
  via `scripts/test-plgg-test.sh` / `tsc-plgg-test.sh`, unchanged
  contract.
- `workaholic:operation` / `policies/ci-cd.md` — plgg-test gates the
  whole repo in CI; this change must keep its own suite + coverage
  green.
- `workaholic:implementation` / `policies/vendor-neutrality.md` —
  closing the one real matcher gap in-house keeps the migration from
  reaching back to vitest.
