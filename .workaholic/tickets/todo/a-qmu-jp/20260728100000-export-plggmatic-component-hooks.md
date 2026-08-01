---
created_at: 2026-07-28T10:00:00+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 2h
commit_hash:
category: Changed
depends_on: [20260728091000-retire-the-pm-class-coupling.md]
mission:
claim: work-20260801-210449
---

# Export plggmatic's component hooks, and bring the example app under the framework-name gate

## Overview

`scripts/gate-framework-names.sh` (mission
`make-the-column-strip-a-real-navigation-surface`, ticket
11) enforces that a consumer names one of plggmatic's
`pm-*` hooks by IMPORT or not at all. It covers
`packages/plggpress` today. **`packages/plggmatic-example`
is deliberately out of its scope**, and this ticket closes
that gap.

The example app is not simply untidy: it types hooks the
framework **does not export at all** — `pm-btn`,
`pm-btn-danger`, `pm-dialog`, `pm-toast-danger`,
`pm-toast-warning`, `pm-toast-info`, `pm-toast-close`, plus
`--pm-*` custom properties in its own stylesheets. There is
nothing to import yet, so the fix is a framework change
first and a consumer change second.

## Key files

- `packages/plggmatic/src/Layout/usecase/combinators.ts` —
  the precedent: `rowClass` / `colClass` / `paneClass`
  derived from `cssPrefix` and exported.
- `packages/plggmatic/src/Component/usecase/themeToggle.ts`
  — `themeToggleClass` / `sunClass` / `moonClass`, the same
  shape for a component.
- `packages/plggmatic/src/Component/usecase/button.ts`,
  `confirmDialog.ts`, `toast.ts` — the hooks the example
  app types by hand.
- `packages/plggmatic-example/src/demoStyles.ts`,
  `forms-main.ts`, `forms/formsDemo.ts`,
  `forms/formsDemo.spec.ts` — the consumer side.
- `scripts/gate-framework-names.sh` — its `CONSUMERS` list
  and the SCOPE comment naming this ticket.

## Approach

- Export every component hook the framework actually emits,
  derived from `cssPrefix` exactly as the layout hooks are.
  A hook that is not exported is not a contract, so this is
  the framework saying what it guarantees.
- Have `plggmatic-example` import them; its CSS strings
  compose the names rather than spelling them.
- Add `packages/plggmatic-example/src` to the gate's
  `CONSUMERS` and delete the SCOPE paragraph that excludes
  it.
- Where a hook turns out to be the example app's OWN (a
  demo-only class that merely starts with `pm-`), rename it
  out of the framework's namespace instead of exporting it.
  Squatting on the prefix is the other half of the problem.

## Quality Gate

- **Acceptance:** `./scripts/gate-framework-names.sh` passes
  with `packages/plggmatic-example/src` in its `CONSUMERS`
  list, and no `pm-` literal remains outside a comment in
  either consumer. Renaming `cssPrefix` in plggmatic changes
  the example app's rendered classes too, verified by
  building it and grepping the output.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:implementation` — a cross-package contract
  that only a human can check is not a contract.
