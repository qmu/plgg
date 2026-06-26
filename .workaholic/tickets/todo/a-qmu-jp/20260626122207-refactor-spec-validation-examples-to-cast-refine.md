---
created_at: 2026-06-26T12:22:07+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Refactor spec `validateX` examples from hand-rolled `if`-checks to `cast` + `refine`

## Overview

Four Atomics spec files each contain a teaching example named `validateX`
(`validatePrice`, `validateUserId`, `validateEmail`, `validateData`) written in
an imperative style that the house style explicitly names as an anti-pattern:
`asX` into an intermediate `const`, an `if (isErr(...)) return` early-exit,
manual `.content` extraction, and `if (...) return err(...)` blocks. The
[plgg combinator cheat-sheet](.claude/skills/plgg-coding-style/reference.md)
maps exactly this case — "Sync validation pipeline" — to
`cast(v, asX, refine(…))` and lists "hand-rolled `if` checks" as what *not* to
do. The irony is that `BigInt.spec.ts`'s `validateUserId` lives inside a test
literally titled *"asBigInt works in validation pipelines"* yet uses no
pipeline.

Rewrite each `validateX` as a single returned `cast(...)` expression threading
`asX` and one `refine(predicate, message)` per business rule. No statements, no
intermediate bindings, no `.content` reach, no `{}` blocks. Behavior (and every
existing assertion) is unchanged — this is a pure style refactor of example
code that is supposed to model idiomatic plgg.

## Policies

The standard engineering policies that govern this ticket. The implementing
session **MUST** read each linked policy hard copy before writing code and keep
every change defensible against that policy's Goal (目標), Responsibility
(責務), and Practices (実践).

- `workaholic:implementation` / `policies/coding-standards.md` — TypeScript/style conventions; this ticket is entirely a coding-standards conformance fix (data-last expression style, no escape hatches).
- `workaholic:implementation` / `policies/directory-structure.md` — conventional project layout (applies to all code work); changes stay within the existing colocated `*.spec.ts` files.
- `standards:leading-validity` — the canonical lens for type-driven design, functional style, and the Minimum Test Harness; the example functions exist to demonstrate that style and must embody it.

Also follow the in-repo `plgg-coding-style` skill (a concrete distillation of the
above) and `CLAUDE.md`'s non-negotiable no-`as`/`any`/`ts-ignore` rule.

## Key Files

- `packages/plgg/src/Atomics/BigInt.spec.ts` - `validateUserId` (lines ~137-157); reference instance from the request.
- `packages/plgg/src/Atomics/Num.spec.ts` - `validatePrice` (lines ~95-113); same anti-pattern over `asNum`.
- `packages/plgg/src/Atomics/SoftStr.spec.ts` - `validateEmail` (lines ~92-…); same anti-pattern over `asSoftStr`.
- `packages/plgg/src/Atomics/Bin.spec.ts` - `validateData` (lines ~160-179); same anti-pattern over `asBin`.
- `packages/plgg/src/Flowables/cast.ts` - the `cast(value, …steps)` combinator to thread through (read-only reference; do NOT change).
- `packages/plgg/src/Functionals/refine.ts` - `refine(predicate, errMessage?)` => `(a) => Result<T, InvalidError>` (read-only reference; do NOT change).

## Related History

The U2 migration tickets on this branch rewrote each package's specs "to the
data-last idiom" while swapping vitest for plgg-test, but the four Atomics
example functions kept their imperative shape — this ticket finishes that idiom
conversion for the teaching examples.

Past tickets that touched this area:

- [20260624141705-u3-plgg-cleanup-and-final-grep-gate.md](.workaholic/tickets/archive/work-20260624-135934/20260624141705-u3-plgg-cleanup-and-final-grep-gate.md) - plgg's own spec/idiom cleanup pass during the vitest→plgg-test migration (same files' neighborhood).

## Implementation Steps

1. In `BigInt.spec.ts`, replace the `validateUserId` body with a single
   `cast(...)` expression (see Patches). Use `refine(predicate, message)` for
   each bound; prefer a `bigint` literal (`9999999999999999n`) over
   `BigInt("9999999999999999")`.
2. Add `cast` and `refine` to the `plgg/index` import; remove `isErr` (now
   unused). Keep `ok`/`err`/`invalidError` only if other tests in the file
   still use them — otherwise drop them too. Let `scripts/tsc-plgg.sh` (with
   `noUnusedLocals`) be the arbiter of which imports remain.
3. Apply the identical transformation to `validatePrice` (`Num.spec.ts`),
   `validateEmail` (`SoftStr.spec.ts`), and `validateData` (`Bin.spec.ts`),
   reading each body first to preserve its exact predicates and messages.
4. Do **not** touch the `errThen((e) => …(e.content.message))` assertion reads —
   those are a separate, deliberately-deferred concern (see Considerations).
5. Do **not** touch the core combinator internals that legitimately use
   `if (isOk/isErr)` at the irreducible monad seam (`Flowables/cast.ts`,
   `Disjunctives/Result.ts`, `Collectives/Vec.ts`, `Collectives/ReadonlyArray.ts`,
   `Conjunctives/Dict.ts`, `Functionals/bind.ts`).
6. Close the loop: `scripts/tsc-plgg.sh` clean and `scripts/test-plgg.sh` green
   (every existing `check(...)` assertion must still pass unchanged), then
   Prettier (`printWidth: 50`).

## Patches

### `packages/plgg/src/Atomics/BigInt.spec.ts`

```diff
@@
-  const validateUserId = (input: unknown) => {
-    const bigIntResult = asBigInt(input);
-    if (isErr(bigIntResult)) return bigIntResult;
-
-    const userId = bigIntResult.content;
-    if (userId < 1n) {
-      return err(
-        invalidError({
-          message: "User ID must be positive",
-        }),
-      );
-    }
-    if (userId > BigInt("9999999999999999")) {
-      return err(
-        invalidError({
-          message: "User ID too large",
-        }),
-      );
-    }
-    return ok(userId);
-  };
+  const validateUserId = (input: unknown) =>
+    cast(
+      input,
+      asBigInt,
+      refine(
+        (id: BigInt) => id >= 1n,
+        "User ID must be positive",
+      ),
+      refine(
+        (id: BigInt) => id <= 9999999999999999n,
+        "User ID too large",
+      ),
+    );
```

Import line (drop `isErr`, add `cast`/`refine`; keep `err`/`ok`/`invalidError`
only if still used elsewhere in the file):

```diff
 import {
   isBigInt,
   asBigInt,
-  isErr,
-  err,
-  ok,
-  invalidError,
+  cast,
+  refine,
 } from "plgg/index";
```

> **Note**: The three sibling patches (`validatePrice`, `validateEmail`,
> `validateData`) are structurally identical but their predicates/messages/types
> differ — treat this BigInt patch as the template and read each body before
> applying. Speculative until verified per file.

## Considerations

- The error-message assertion reads `e.content.message` (in every `errThen`
  block across these specs) are intentionally left as-is. Carry-over concern
  `41-existing-specs-still-read-error-content` explicitly says new code should
  use the `plggErrorMessage`/`resultErrorMessage` accessor but the existing
  ~40 spec sites must **not** be bulk-churned; migrating them is out of scope
  here (`.workaholic/concerns/41-existing-specs-still-read-error-content.md`).
- The non-spec `if (isOk/isErr)` sites are the Result monad's own
  implementation (e.g. `cast` is the `reduce` that threads Results) — an
  irreducible imperative seam, not the target anti-pattern. Leave them
  untouched (`packages/plgg/src/Flowables/cast.ts`, `…/Disjunctives/Result.ts`).
- `refine`'s callback param needs an explicit annotation (`(id: BigInt) => …`)
  because `cast` inference yields `unknown` mid-pipe; an annotation is not a
  cast and is the prescribed narrowing (`packages/plgg/src/Functionals/refine.ts`).
- `asBigInt`/`asNum`/etc. return native primitives (`type BigInt = bigint`), so
  numeric/`bigint` comparisons inside `refine` predicates work directly
  (`packages/plgg/src/Atomics/BigInt.ts` line 17).
- Pure refactor of test example code: no production behavior changes, so the
  existing assertions are the regression guard — they must pass verbatim.
