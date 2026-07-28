---
created_at: 2026-07-28T09:10:00+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 1h
commit_hash:
category: Changed
depends_on: [20260728090900-assistant-drives-the-runtime.md]
mission: make-the-column-strip-a-real-navigation-surface
---

# Strip 11/11 — retire the `pm-*` coupling: plggpress consumes the framework runtime, it does not spell its class names

## Overview

A standing concern records that plggpress reaches into
plggmatic's `pm-row` / `pm-col` names by string, with no
compiler signal if the framework renames them. Now that the
runtime that manipulates columns is the framework's own, the
coupling has somewhere to go: plggpress consumes exported
constants and the framework's runtime, and stops naming
plggmatic's internals by hand.

This is the ticket that closes the mission's layering claim.

## Key files

- `packages/plggmatic/src/Layout/usecase/combinators.ts` —
  `row`/`column` emit `pm-row`/`pm-col`; ticket 2 added the
  `data-pm-*` markers. Both must be EXPORTED constants.
- `packages/plggmatic/src/Meta/model/identity.ts` —
  `cssPrefix`, the namespace the names are derived from.
- `packages/plggpress/src/theme/page.spec.ts` — asserts
  `class="pm-row` / `class="pm-col` as literals; these
  become assertions through the exported constants.
- `packages/plggpress/src/theme/baseCss.ts` — comments
  referring to the skeleton; and any `.vp-*` rule that
  depends on plggmatic's structure.
- `packages/plggpress/src/framework/DevServer/browser/*` —
  must contain no plggmatic class literal; navigation goes
  through the ticket-2 hook only.

## Approach

- Export the marker/class names plggmatic actually
  guarantees, and have plggpress reference those exports
  everywhere it currently types the string — source and
  specs alike. A framework rename then becomes a compile
  error, which is the whole point.
- Where a name is genuinely CSS-only (a selector inside
  `baseCss`), compose it from the exported constant the same
  way `baseCss` already composes `themeToggleClass`.
- Audit with a grep that fails loudly: no `pm-` literal
  outside plggmatic, except where a constant is
  demonstrably impossible.
- Update the standing concern's record: state what closed
  it and what, if anything, remains coupled.

## Quality Gate

- **Acceptance:** `grep -rn "pm-" packages/plggpress/src`
  returns no hand-typed framework class or attribute name in
  source or specs (prose comments naming the framework are
  fine); every reference is an import from plggmatic.
  Renaming `cssPrefix` in plggmatic produces a compile error
  in plggpress rather than a silently broken page — proven
  by making the change locally, observing the error, and
  reverting it, with the raw output recorded.
- The site still renders identically: the ticket-6 no-JS
  proof, the ticket-5 `popstate` run and the ticket-10
  assistant run all pass unchanged afterwards.
- `scripts/tsc-plgg.sh` clean; `scripts/test-plgg.sh` green;
  >90% coverage across all four metrics; no `as`/`any`/
  `ts-ignore`; Prettier `printWidth: 50`.

## Policies

- `workaholic:implementation` — a cross-package contract
  that only a human can check is not a contract; make the
  compiler the one that checks it.
