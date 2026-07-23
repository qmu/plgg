---
created_at: 2026-06-24T14:16:55+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain]
effort:
commit_hash: 81681f0
category: Changed
depends_on:
---

# U1 — plgg-test self-suite fix (Finding A) + toBeGreaterThanOrEqual + toEqual/deepEqual fidelity gate

## Overview

The trip replaces vitest with `plgg-test` across 9 packages. Before any
per-package migration begins, three things must land in `plgg-test`: the
self-suite resolution fix (Finding A) so plgg-test's own tests run at all
and Gate B can even be observed, the one matcher the corpus needs that
does not yet exist (R1), and a verified guarantee that `plgg-test`'s
`toEqual`/`deepEqual` agrees with vitest's `toEqual` on the plgg domain
values the corpus asserts over (Gate B). This ticket is the
**foundation** — every U2 package-migration ticket depends on it.

**Trip Origin:** `.workaholic/trips/replace-vitest-with-plgg-test/designs/design-v2.md`
§3 (R1, Gate A, Gate B) + plan.md Amendment 2 (Finding A — IN MANDATE,
fixed within U1 ahead of Gate B).

Three deliverables, in order:

0. **Finding A — fix the plgg-test self-suite resolution (PREREQUISITE,
   do first).** `npm run test` in plgg-test currently fails **all 15**
   specs with `Cannot find module .../src/index.js`. Gate B's parity
   spec lives in this same suite, so it cannot be observed until this is
   fixed. **Root cause (diagnosed):** plgg-test's own specs import
   `from "../index.js"` (relative, `.js`-extension NodeNext style). The
   resolver hook (`Resolve/hook.ts`) already has a `rewriteRelativeTs`
   that redirects a relative `./Foo.js`→`./Foo.ts` — BUT it guards on
   `parentURL.endsWith(".ts")`, and the Runner imports each spec as
   `file://…/foo.spec.ts?t=<cacheBust>` (a cache-bust query). So the
   parent URL the resolver sees is `…foo.spec.ts?t=123`, which does NOT
   end in `.ts`, the redirect is skipped, and `../index.js` falls
   through to native Node which has no `index.js` on disk. **Fix:** strip
   the `?t=` query before the `.endsWith(".ts")` check in
   `rewriteRelativeTs` (the `load` hook already strips the query via
   `stripQuery` — mirror that tolerance in the `resolve` guard). Minimal,
   typed, no `as`/`any`. Success: `npm run test` in plgg-test goes from
   0/15 to fully green.

1. **R1 — add `toBeGreaterThanOrEqual` matcher.** Exactly one corpus
   site (`plgg-foundry/.../runFoundry.spec.ts:35`,
   `expect(todos.size).toBeGreaterThanOrEqual(1)`) needs a `>=` matcher.
   `toBeGreaterThan` exists; `>=` does not. This is the ONLY new matcher
   in the entire trip.

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

- `packages/plgg-test/src/Resolve/hook.ts` — **Finding A fix**: in
  `rewriteRelativeTs`, strip the `?t=` cache-bust query from
  `parentURL` before the `.endsWith(".ts")` guard (mirror the `load`
  hook's `stripQuery`). This is the change that takes the self-suite
  from 0/15 to green.
- `packages/plgg-test/src/Core/Runner.ts` — reference for Finding A
  (line 78 appends `?t=${cacheBust}` to the spec URL, which becomes the
  resolver's `parentURL`) and Gate A evidence (lines 202-268; no change
  unless a regression spec is missing).
- `packages/plgg-test/src/Resolve/hook.spec.ts` — extend with a case
  proving a relative `.js` import resolves when the parent URL carries a
  `?t=` query (the Finding A regression).
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

1. **Finding A (do first)**: in `Resolve/hook.ts` `rewriteRelativeTs`,
   strip the `?t=…` query off `parentURL` before checking
   `.endsWith(".ts")` (and before building the relative target). Add a
   `hook.spec.ts` case for a `?t=`-carrying parent. Run
   `cd packages/plgg-test && npm run test` and confirm it goes from 0/15
   to fully green (this is the success bar for Finding A and the gate
   that makes Gate B observable).
2. Add `toBeGreaterThanOrEqual` to `matchers.ts` mirroring
   `toBeGreaterThan` exactly; re-export from `index.ts`.
3. Add its unit test in `matchers.spec.ts` (cover `>`, `=`, `<`).
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
