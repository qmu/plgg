---
created_at: 2026-06-17T16:01:21+09:00
author: a@qmu.jp
type: bugfix
layer: [Domain]
effort:
commit_hash:
category:
depends_on: [20260617160120-error-foundation-p0-fixes.md]
---

# P1 error-foundation hardening: isPlggError shape, Defect serialization, cast throws

## Overview

Three P1 robustness gaps in the errors-as-data foundation, from the
higher-perspective review. None crash today, but each weakens a guarantee the
model claims.

1. **`isPlggError` is tag-only and lies about shape.** It returns
   `value is PlggError` while checking only `__tag` membership, so a malformed or
   foreign `Box` with a colliding tag passes — `box("InvalidError")({ totally:
   "wrong" })` is accepted, then `childrenOf` reads `.sibling` (`undefined`) and
   `.forEach` would throw; `proc`'s catch also mis-routes a tag-colliding foreign
   throw to `err(e)` instead of a `Defect`.
2. **A `Defect`'s real-`Error` `cause` is destroyed across JSON.**
   `JSON.stringify(defect("boom", new Error("orig")))` collapses the cause to
   `{"__tag":"Some","content":{}}` because `Error` fields are non-enumerable. The
   one thing `Defect` exists to preserve (origin/stack) vanishes the moment it
   crosses an HTTP/process boundary — the common server case.
3. **`cast()` loses the stack of a throw inside a step.**
   `convUnknownToInvalidError` interpolates only `e.message` into
   `"Validation failed: …"`, dropping the thrown `Error` — inconsistent with the
   model (every other unexpected throw routes to a `Defect` that keeps the
   `Error` in `cause`) and a regression of the old `parent` field.

## Key Files

- `packages/plgg/src/Exceptionals/PlggError.ts` - `isPlggError` (~46–52): add a
  minimal per-tag payload check (content is an object with a string `message`);
  make `childrenOf` defensive (`Array.isArray(content.sibling)` before `forEach`).
- `packages/plgg/src/Exceptionals/Defect.ts` - normalize an `Error` `cause` at
  lift time into a serializable shape (`{ name, message, stack }`) or provide a
  `toJsonReady` that flattens `cause.message`/`stack`; document the contract.
- `packages/plgg/src/Flowables/cast.ts` - `convUnknownToInvalidError` (~558–567):
  route an unexpected throw to a `Defect` carrier (or give `InvalidError` a
  `cause`) instead of flattening to a string.

## Implementation Steps

1. Tighten `isPlggError` with a payload-shape guard; harden `childrenOf`. Spec:
   a tag-colliding malformed box is rejected; a real variant is accepted.
2. Normalize `Defect.cause` for serialization (decide: normalize at construction
   in `defect()`, or a `toJsonReady`). Spec: round-trip a `defect("x", new
   Error("y"))` through `JSON.stringify`/`parse` and assert message/stack survive.
3. Route `cast` step-throws to a `Defect`-bearing failure. Spec: `cast(1, () => {
   throw new Error("kaboom") })` retains the cause.
4. `scripts/tsc-plgg.sh` clean, `scripts/check-all.sh` green; coverage >90%.

## Considerations

- **Decide the `Defect.cause` representation once** — normalizing at construction
  (`defect`) is simplest and makes every `Defect` wire-safe, at the cost of not
  keeping the live `Error` object. A `toJsonReady` keeps the live object locally
  and flattens only on serialization. Prefer the former unless a caller needs the
  live `Error`. (`packages/plgg/src/Exceptionals/Defect.ts`)
- **`cast`'s error channel is `InvalidError`** — adding a `Defect` arm means
  either widening `cast`'s error type or giving `InvalidError` an optional
  `cause`. Keep `cast`'s public error type stable if possible; least-surprise is
  an optional `cause` on `InvalidError`. Coordinate with the P0 `bind`/`tryCatch`
  work so all throw-to-data seams are consistent.
  ([[20260617160120-error-foundation-p0-fixes]])
