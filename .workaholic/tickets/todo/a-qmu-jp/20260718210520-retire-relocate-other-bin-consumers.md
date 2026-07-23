---
created_at: 2026-07-18T21:05:20+09:00
author: a@qmu.jp
type: refactoring
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Removed
depends_on: [20260718210515-plgg-bundle-self-bundled-bin-retire-relocate.md]
---

# Retire relocate.mjs in the other bin consumers (plgg-test, plggpress, plgg-cms)

## Overview

Follow-on to the plgg-bundle self-bundled-bin ticket. The `relocate.mjs`
`/tmp` copy-and-re-exec hack is **also copied into** `plgg-test`, `plggpress`,
and `plgg-cms` (each ships its own copy so its run-from-source `.ts` bin can
run under `node_modules`). Once plgg-bundle proves the compiled-dist bin
pattern, migrate these three the same way so the hack is fully gone from the
monorepo.

**Not part of the modernize-plgg-bundle acceptance set** (deliberately
un-missioned): it is scoped to other packages, so it stays a normal
per-ticket-approval todo rather than the mission's drive-authorized queue.
Promote/re-scope it after the plgg-bundle pattern lands.

## Key files

- `packages/plgg-test/bin/` — its `relocate.mjs` copy and launcher.
- `packages/plggpress/bin/` — its `relocate.mjs` copy and launcher.
- `packages/plgg-cms/bin/` — its `relocate.mjs` copy and launcher.
- The plgg-bundle self-bundle precedent (dep ticket) as the template.

## Approach

- Apply the compiled-dist launcher pattern established for plgg-bundle: each
  package self-bundles its CLI to `dist/`, its bin runs the compiled entry, and
  its `relocate.mjs` + `/tmp` relocate cache are deleted. Reuse, don't
  re-invent, the plgg-bundle approach (don't clone garbage — factor any shared
  launcher helper if one emerged).

## Quality Gate

- **Acceptance:** in a real registry-style install, each of `plgg-test`,
  `plggpress`, `plgg-cms` runs its bin from a compiled dist with **no
  `relocate.mjs` present** and **no `/tmp` relocate dir created**; all three
  `relocate.mjs` copies are deleted and unreferenced.
- The publish smoke (`publish-npm.sh`) bin check passes for each without the
  relocate path; `scripts/check-all.sh` green; no new dependency.

## Policies

- `workaholic:design` / `vendor-neutrality`; `sacrificial-architecture`.
- `workaholic:implementation` / `objective-documentation` (verified by real
  install smoke); `dont-clone-garbage` (factor the shared launcher).
