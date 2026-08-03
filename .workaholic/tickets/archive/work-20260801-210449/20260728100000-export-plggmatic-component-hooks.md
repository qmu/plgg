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

## Final Report

Development completed as planned. Every class hook plggmatic emits is now a
named export, the example app imports them all, and
`scripts/gate-framework-names.sh` covers `packages/plggmatic-example/src` with
no exemption left in the file.

The framework turned out to have no raw `pm-` literals of its own — it already
derived every name from `cssPrefix`. What it lacked was a place to *say* which
of those derived names it guarantees. `Meta/model/classHooks.ts` is that place:
one definition per hook, imported by the emitters that render them and by the
consumers that style them, so "the framework renders it" and "the framework
guarantees it" became the same fact rather than two facts that could drift.

### Discovered Insights

- **Insight**: The acceptance says to verify the coupling "by building it and
  grepping the output" — but after the change the built bundle contains **zero**
  `pm-` literals, because every hook is now concatenated from `cssPrefix` at
  runtime. A grep of the bundle therefore proves nothing either way, and would
  have looked like a pass for the wrong reason.
  **Context**: the working oracle is the *rendered* name, not the bundle text.
  Flipping `cssPrefix` to `zz`, rebuilding plggmatic's dist and re-running the
  example's suite showed `boardClass=zz-board`, `selector(boardClass)=.zz-board`
  and `cssVarRef("surface")=var(--zz-surface)` — with all 57 example tests still
  green, which is the actual claim: the consumer follows the rename and nothing
  had to be edited to make it.

- **Insight**: Three of the framework's own custom-property and hook names were
  being typed inside the example's *comments*. The gate deliberately ignores
  prose ("PROSE IS FINE"), and a first mechanical pass rewrote them into
  `${selector(rowClass)}` — inside a comment, where it is not interpolated and
  reads worse. Comments were restored to the literal names.
  **Context**: a rename-safety refactor should touch what the compiler and the
  runtime see, and leave documentation naming things plainly. The one exception
  kept here is a *rendered* prose string in `colorSchemeDemo` describing the
  `--pm-*` namespace to the reader — that is page copy, not a comment, so it
  composes `cssVarRef("*")` and follows a rename like everything else.

- **Insight**: `cssVar`/`cssVarRef` were as necessary as the class hooks and are
  easy to overlook. The example spells `--pm-surface` and friends about forty
  times across five stylesheets; without an exported accessor for the custom
  property namespace, the gate would have been satisfiable only by rewording
  every stylesheet, and the `--pm-*` half of the contract would have stayed
  unchecked.
  **Context**: a design system's contract with a consumer is its class hooks
  AND its custom properties. Exporting only the former looks complete and
  leaves half the rename hazard in place.

- **Insight**: `export { X } from "…"` does not bind `X` locally. Re-pointing
  `themeToggle.ts` and `combinators.ts` at the new definition site with a bare
  re-export broke their own uses of those constants; they need an import plus a
  re-export.
  **Context**: relevant wherever a module both re-exports a moved symbol and
  keeps using it — the compiler catches it immediately, but the fix is not the
  one the error text suggests.
