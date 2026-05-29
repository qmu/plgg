---
created_at: 2026-05-29T23:18:24+09:00
author: a@qmu.jp
type: refactoring
layer: [Domain]
effort:
commit_hash:
category:
depends_on:
---

# Make plgg-foundry skill-compliant (remove `as` casts, `throw`, and mutable state)

## Overview

A `plgg-coding-style` review of every non-core package found plgg-foundry is the
**only** package with hard-rule violations — the very "do not emulate" debt the
skill flags, plus three `as` casts in `operate.ts` the skill had not named. This
ticket brings plgg-foundry to the same escape-hatch-free, type-first standard the
rest of the repo already meets. No feature change — pure conformance.

## Hard-rule violations to fix (each cites the skill rule)

**Unchecked `as` casts (skill Hard Rule 1 — narrow/decode, never cast):**
- `src/Foundry/model/Foundry.ts:68` — `box("Str")(spec.description) as Str`
- `src/Foundry/model/Processor.ts:72-73` — `box("KebabCase")(spec.name) as KebabCase`, `box("Str")(spec.description) as Str`
- `src/Foundry/model/Switcher.ts:93-94` — same `as KebabCase` / `as Str` pair
- `src/Foundry/model/VirtualType.ts:37,39,42` — `box("Str")(spec.type) as Str`, **`some(spec.optional as Bool)` (a runtime lie — the value is a bare boolean typed as a `Bool` box)**, `some(box("Str")(spec.description) as Str)`
- `src/Foundry/usecase/operate.ts:247,367,472` — `(param as { value: unknown }).value` (opaque `Param` cast to read `.value`)

**`throw` in domain code (Hard Rule 3):**
- `src/Example/ProfileFoundry.ts:60` — `throw new Error("Invalid profile object")` (only incidentally swallowed by `operate`'s `tryCatch`)

**Mutable module-level state (Hard Rule 4 — pure immutable data):**
- `src/Example/TodoFoundry.ts:8` — `let id = 0` (with `++id`)
- `src/Example/ProfileFoundry.ts:36` — `export let lastGreeting = ""` (reassigned at :65)

## Soft findings to fold in while there

- `model/{Egress,Ingress,Operation}.ts` `asX` casters written as `if (isX) { return ok } return err` → single-ternary form matching the `Str.ts` triad.
- `usecase/operate.ts` `execute` is an `if`-chain dispatch on operation type, and the `exec*` helpers use `!isOk` early-returns + `for…of` with a mutated accumulator → exhaustive `match` dispatch + `proc`/`chainResult`/`reduce` threading. (Operations are `Obj` discriminated unions today; consider `Box` unions so `match` + `$` matchers apply.)
- `usecase/operate.ts:126-135` `parseJsonValue` uses a raw `try/catch` → `pipe(tryCatch(JSON.parse)(v), getOr(v))`.
- `model/Foundry.ts` `makeFoundry`/`explainFoundry`, `model/Order.ts` `explainOrder`, `model/VirtualType.ts` `formatVirtualType`, `usecase/blueprint.ts` — statement-heavy bodies → single expressions / `getOr`/`matchOption` (e.g. `formatVirtualType` uses `isSome ? x.content : default` where `getOr`/`matchOption` belong); hoist `blueprint`'s static JSON schema to a module const.
- `model/Foundry.ts:185-195` `extractOpcodes` filters via a structural `"name" in item.content` narrow → use the existing `isProcessor`/`isSwitcher` guards.

## Key Files

- `src/Foundry/model/{Foundry,Processor,Switcher,VirtualType}.ts` — replace each
  `box(TAG)(x) as T` with the real caster (`asStr`/`asKebabCase`/`asBool`)
  threaded through a `Result`. The decision below (Considerations) is whether the
  `makeX` constructors **return `Result<X, InvalidError>`** or **accept
  already-built nominal types** (`Str`/`KebabCase`) and push casting to callers.
- `src/Foundry/usecase/operate.ts` — add an `EnvCell = Readonly<{ value: unknown }>`
  type + `isEnvCell` guard (or `asEnvCell` caster) and narrow before reading
  `.value` at :247/:367/:472; plus the `match` dispatch + `try/catch` soft fixes.
- `src/Example/ProfileFoundry.ts` — give `Profile` an `asProfile` caster; the
  processor `fn` returns `proc(params["profile"], asProfile, …)` instead of
  throwing; drop `export let lastGreeting` (read the greeting from the resulting
  Medium output instead).
- `src/Example/TodoFoundry.ts` — derive the next id immutably (from the store's
  size/max key inside the `fn`) instead of a module `let`.
- Spec files for any signature that changes (`makeX` → `Result`) — update colocated specs.

## Implementation Steps

1. **Decide the constructor shape** (see Considerations) and apply it across the
   four model files so no `box(TAG)(x) as T` remains. Prefer routing every
   nominal field through its caster.
2. **Add `EnvCell` + `isEnvCell`** in `operate.ts` and narrow the three `param`
   reads; remove the casts.
3. **Remove the `throw`** in `ProfileFoundry.ts` (asProfile + `Result`) and the
   two mutable module bindings (`TodoFoundry` id, `ProfileFoundry` lastGreeting).
4. **Fold in the soft fixes** (single-ternary casters, `match` dispatch, `tryCatch`
   for JSON, `getOr`/`matchOption`, guard-based filter) where they don't balloon
   scope — bias toward the model + Example files first.
5. **Verify**: `scripts/tsc-plgg-foundry.sh` clean, `scripts/test-plgg-foundry.sh`
   green, and `git grep -nE 'as [A-Z]| as any|@ts-ignore' packages/plgg-foundry/src`
   returns nothing (excluding specs). Zero `throw`/`let`-module-state in domain code.

## Considerations

- **The ripple is the real cost.** Turning `makeProcessor`/`makeSwitcher`/
  `makeFoundry`/`toVirtualType` into `Result`-returning casters changes their
  signatures and ripples to `blueprint.ts`, `operate.ts`, the Example foundries,
  and their specs. The alternative — constructors that take already-built
  `Str`/`KebabCase` and let the caller decode — also ripples, to call sites.
  Pick one and apply consistently; the Result-returning form matches the repo's
  `asX` triad and is recommended. Flag the chosen approach in the Final Report.
- **`as Bool` is a latent bug, not just style.** `some(spec.optional as Bool)`
  stores a raw boolean where a `Bool` box is typed — fixing it via `asBool` may
  surface a genuine shape mismatch in consumers; verify `formatVirtualType` and
  any reader of `optional` still type-check.
- **Scope discipline.** The HARD fixes (casts, throw, mutable state) are the
  must-do; the SOFT items are opportunistic — if `operate.ts`'s `match`-dispatch
  refactor proves large, split it to a follow-up rather than bloat this ticket.
- plgg-foundry has no numeric coverage gate (only `coverage: { all: true }`), so
  the bar is tsc-clean + specs green + the grep clean; keep the ≥90% floor in
  spirit by updating specs for changed signatures.
- The skill (`.claude/skills/plgg-coding-style/`) is the rubric; this ticket also
  lets the skill drop plgg-foundry from its "Do NOT emulate" list afterward
  (a one-line skill edit — do it in this ticket once the casts are gone).

## Open Questions

- Result-returning constructors vs typed-parameter constructors (recommend the
  former). Decide in step 1; record in Final Report.
- Whether to model Operations as `Box` unions (enabling `match` + `$` matchers in
  `operate.ts`) now, or defer that larger remodel to a follow-up.
