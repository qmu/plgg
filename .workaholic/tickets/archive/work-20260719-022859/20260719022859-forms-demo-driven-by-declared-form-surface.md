---
created_at: 2026-07-19T02:28:59+09:00
author: a@qmu.jp
type: refactoring
layer: [UX, Domain]
effort: 4h
commit_hash:
category: Changed
depends_on:
mission: grow-plggmatic-as-the-reference-framework
---

# Drive the forms demo from the declared Form surface (retire hand-wiring)

## Overview

Mission acceptance criterion 3: *a framework capability the reference needs
is expressed **generally** in plggmatic (not special-cased in the example) —
at least one form/menu is driven by a declared framework surface, with a
test.* Developer chose the **Form** capability (2026-07-19).

plggmatic already ships a Form surface —
`packages/plggmatic/src/Form/` exports `FieldSpec`, `ControlKind`/
`controlKinds`, `parseForm`, `formView`/`FormViewProps`, `FormErrors`,
`SubmissionState`/`isPending`, `fieldError`/`errorFor`/`errorId`/`errorAria`.
But the reference's forms demo (`packages/plggmatic-example/src/forms/
formsDemo.ts`) still **hand-wires** its form UI with raw `plgg-view`
primitives (`ul`/`li`/`span`/`button`/`text`/`attr`/`onClick`) and bespoke
`Sandbox`/`Cmd` glue — the capability is special-cased in the example rather
than driven by the declared surface. Close that gap.

## Key files

- `packages/plggmatic-example/src/forms/formsDemo.ts` — the hand-wired form
  demo to convert to a **declaration** over the Form surface.
- `packages/plggmatic-example/src/forms-main.ts` — the demo entry.
- `packages/plggmatic/src/Form/{model,usecase}/*` — the surface to drive
  from (and to extend **generally** if the reference needs a control/
  validation the surface can't yet express — grow the framework, don't
  special-case the example).
- `packages/plggmatic-example/src/forms/formsDemo.spec.ts` (if present) /
  new spec.

## Approach

- Express the reference's form as a **declared `FieldSpec` set** parsed by
  `parseForm` and rendered by `formView`, with validation surfaced through
  `FormErrors`/`errorFor` and submit state through `SubmissionState` — so
  the example declares *what the form is*, and the framework renders and
  validates it. Remove the bespoke `plgg-view` form markup / `onClick`
  wiring from `formsDemo.ts`.
- If the reference needs a control kind, validation, or submit behavior the
  Form surface does not yet express, **add it to the Form surface generally**
  (a new `ControlKind` variant with its exhaustive `match`, a validation
  combinator) — the mission's rule: a form found in the reference is
  expressible in the framework, not special-cased.

## Quality Gate

- **Acceptance:** the forms demo renders and behaves as before, but is now
  **driven by the declared Form surface** — `formsDemo.ts` no longer
  hand-wires form controls with `plgg-view` `ul`/`li`/`button`/`onClick`;
  the form is a `FieldSpec` declaration through `parseForm`/`formView`. A
  **test** drives the declared form (parse a payload, assert validation
  errors via `errorFor`, assert a successful submit transition) — the
  capability is proven at the framework surface, not the example.
- Any surface extension is **general** (closed-union control kinds with
  exhaustive `match`, covered by plggmatic's own specs), not a demo-only
  branch.
- `scripts/tsc-plgg.sh` clean; `./scripts/check-all.sh` green (invoke with
  `./`, not `bash`); >90% coverage; no `as`/`any`/`ts-ignore`; printWidth
  50. Visual result reviewed in the hot-reload dev env
  (`cd packages/plggmatic-example && npm run dev` → :51820).

## Policies

- `workaholic:implementation` / `type-driven-development` (FieldSpec /
  ControlKind as closed unions, exhaustive), `domain-layer-separation`
  (the example declares; the framework renders/validates).
- `workaholic:design` / `dont-clone-garbage` (drive from the existing
  surface; extend it generally rather than special-casing the example);
  `sacrificial-architecture` (the durable framework surface is what the
  disposable example is measured against).
