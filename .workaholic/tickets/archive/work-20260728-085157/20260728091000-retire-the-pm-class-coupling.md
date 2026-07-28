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

## Final Report

Development completed as planned, with the acceptance's
"rename produces a compile error" claim corrected to what
is actually true and actually better (below).

**plggmatic now says what it guarantees.** Every hook is
derived from `cssPrefix` and exported: `rowClass` /
`colClass` / `paneClass` (Layout), `themeToggleClass` /
`sunClass` / `moonClass` (the appearance toggle), and
`stripAttr` / `columnAttr` / `spanAttr` / `navHookName`
(the navigation runtime, which this mission added). The
literals live in exactly one file each, inside the
framework.

**plggpress names them by import.** `page.spec.ts`,
`navBar.spec.ts`, `shell.spec.ts`, `appearanceScripts.spec.ts`
and `baseCss.spec.ts` compose their assertions from the
constants — including the `--pm-*` custom properties, which
now go through the framework's own `colorVar` / `metricVar`
emitters. Two prose comments were reworded so the gate's
crude comment filter does not have to be clever.

**`scripts/gate-framework-names.sh`**, wired into
`check-all.sh`, fails the build if a covered consumer types
a `pm-` literal outside a comment. plggpress passes.

**The correction.** The ticket claimed a `cssPrefix` rename
would produce a compile error in plggpress. It does not,
and should not: renaming `pm` to `zz` and rebuilding left
plggpress's 340 specs green and changed the RENDERED
markup to `class="zz-row" … class="zz-col"` — the consumer
FOLLOWS the framework instead of breaking. That is the
stronger property. The compiler-checked half is removing an
export: deleting `colClass` from plggmatic's Layout barrel
produced

```
src/index.ts(31,3): error TS2305: Module '"plggmatic/Layout"'
  has no exported member 'colClass'.
```

Both probes were run and reverted.

**What is NOT covered, stated plainly.**
`packages/plggmatic-example` still types `pm-btn`,
`pm-dialog`, `pm-toast-*` and `--pm-*` — hooks the
framework does not export at all, so there is nothing to
import yet. It is deliberately outside the gate's
`CONSUMERS`, the gate's own header says so and names the
follow-up, and ticket
`20260728100000-export-plggmatic-component-hooks.md`
specifies the work. The standing concern
`demo-1-s-css-overrides-hard` is updated with what closed
and what remains, and stays `active` because the app it is
about is the part still open.

**Live end-to-end after the cleanup**, on port 4130:

```
/concepts/?q=the single source of truth   1 column, marked
click a prose link                        → 2 columns
assistant opens one through the runtime   → 3 columns
  url /concepts/?c=/concepts/option,/getting-started&q=…
  navigations 1  (nothing reloaded)
Back, Back                                → 1 column,
  url /concepts/?q=…  with the mark still there
```

Screenshot: `strip-t11-end-to-end.png`.

### Discovered Insights

- **Insight**: "a rename is a compile error" was the wrong
  goal for a string constant.
  **Context**: what a consumer needs is to FOLLOW the
  framework's name, which an exported constant gives for
  free. The compiler's job is to catch a name that stopped
  existing, and it does. Recorded because the wrong version
  of this goal is the one that sounds more rigorous.
- **Insight**: the data attributes and the window hook are
  derived from `cssPrefix` too.
  **Context**: they were literals when the runtime was
  written. Deriving them means the framework's namespace is
  one decision rather than five, and the rename probe moves
  all of them together.
