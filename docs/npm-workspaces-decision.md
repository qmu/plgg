---
type: Decision
title: npm workspaces for the plgg monorepo
ticket: 20260721180002-evaluate-npm-workspaces.md
date: 2026-08-01
decision: adopt
---

# npm workspaces: adopt

**Decision: adopt.** The spike is the change on this branch — a root
`package.json` declaring `workspaces: ["packages/*"]`, a `scripts/npm-install.sh`
collapsed to one `npm install`, and five hard-coded install-layout paths
corrected. `scripts/check-all.sh` is green end to end under it.

This document records what was measured and what had to change, so the decision
is reviewable rather than a preference.

## Measurements

Taken on this repository's 39 packages, on the same machine, with a warm npm
cache in both cases (the realistic developer state; a cold cache is dominated by
network and would flatter neither shape).

|                               | before (39 × `npm install`) | after (one root install) |
| ----------------------------- | --------------------------- | ------------------------ |
| First install, empty tree     | **22.40 s**                 | **4.60 s**               |
| Re-install, already satisfied | —                           | **0.94 s**               |
| `node_modules` on disk        | **1.4 G** (39 trees)        | **403 M** (one tree)     |
| Lockfiles written by install  | 39                          | 1                        |

The wall-clock win (4.9×) is the smaller half. The disk figure is the more
interesting one: 1.0 G of what the old layout wrote was the _same dependencies
resolved and materialised once per package_.

The lockfile row measures what an install **writes**, and that row was true the
day it was measured. What it did not say — and what a reader took it to mean —
is how many lockfiles remained **tracked**: the migration left all 39
per-package lockfiles in git, where they froze a fortnight behind the root one
and went on being read as if they were current (Dependabot proposed updates
against them and never against the root). They were untracked afterwards, in
ticket `20260806211628`.

## What it fixes beyond the numbers

The ticket names a specific symptom: "an empty
`packages/plggmatic/node_modules/.bin` left `plgg-bundle` 'command not found'
during a fresh integration". That was structural, not bad luck. A `file:` link
does **not** install the linked package's dependencies, so a package whose own
install had run could still have an empty `.bin` — a tree that looks installed
and is not.

Under workspaces every workspace binary lands once in the root
`node_modules/.bin`, which Node and npm find from any package by walking up.
The failure mode has no way to occur; verified by running
`npm run build` from inside `packages/plgg-bundle` against a root-only install.

The `file:../` specifiers in each `package.json` are **unchanged**. npm resolves
a `file:` dependency naming a workspace member to that member, so they keep
documenting the dependency graph, and `scripts/build.sh` still orders the builds
by it.

## What had to change, and why it is the same bug five times

Adopting workspaces broke five places, and all five were the same mistake:
**encoding where the installer had put something** rather than asking for it by
name.

| Site                              | Was                                                                                  | Now                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| `scripts/typecheck.ts`            | `import ts from "../packages/plgg-bundle/node_modules/typescript/lib/typescript.js"` | `import ts from "typescript"`                        |
| `scripts/check-all.sh`            | `node packages/plgg-bundle/node_modules/typescript/bin/tsc`                          | `node node_modules/typescript/bin/tsc`               |
| `scripts/build.sh`                | bootstrap keyed on `packages/plgg-bundle/node_modules/typescript`                    | keyed on `node_modules/typescript`, one root install |
| `scripts/gate-vendor-boundary.sh` | same per-package bootstrap                                                           | same, one root install                               |
| `scripts/tsconfig.json`           | `typeRoots: ["../packages/plgg-bundle/node_modules/@types"]`                         | omitted — tsc's default upward walk                  |

The last one is worth singling out because it is the one that survived the first
green build and failed only in the gate phase, with `TS2688: Cannot find type
definition file for 'node'`. A pinned `typeRoots` silently narrows resolution to
one directory; deleting the setting restores the default walk, which finds the
types wherever the install actually put them. **That spelling is correct under
either layout**, which is the property to prefer — none of these five fixes ties
the repository to workspaces, they just stop asserting the old shape.

## Known consequence, accepted

A root `package.json` becomes the nearest manifest for `scripts/*.ts`, and it
declares no `"type"`. Node therefore emits `MODULE_TYPELESS_PACKAGE_JSON`
warnings for those scripts ("reparsing as ES module"). They are noise, not
failures, and the run is green with them.

Adding `"type": "module"` to the root would silence them and is **deliberately
not done**: the root manifest is the nearest one for every package that does not
declare its own type, so setting it there would change how those packages'
files are interpreted — a real semantic change to silence a warning. The right
fix, if the noise matters, is a `"type"` on the packages that lack one, which is
its own ticket.

## Not adopted, and why not

Nothing about the evaluation argued against adoption. Recorded for completeness:

- **`--install-strategy=nested`** would keep the per-package layout and avoid
  touching the five paths above. Rejected: it preserves the 1.4 G duplication
  and the empty-`.bin` failure mode, which are the two things worth fixing.
- **Renaming the three name/directory mismatches** (`example` →
  `@plgg/example`, `guide` → `@plgg/guide`, `plggmatic-example` →
  `@plggmatic/example`) was considered and is unnecessary: workspaces key on the
  package _name_, nothing depends on those three, and they install correctly as
  they are.
