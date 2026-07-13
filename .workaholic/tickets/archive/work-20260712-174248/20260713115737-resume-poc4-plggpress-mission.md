---
created_at: 2026-07-13T11:57:37+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 0.5h
commit_hash: e53ff696
category: Changed
depends_on:
mission: plggpress-technical-confidence-poc-portal
---

# Resume: sync poc4-edit branch with main, then drive PoC 4

## Overview

**Carry Origin:** session handoff on `main` (2026-07-13) — the PR #66 ship
session ended with plgg-bundle@0.0.6 published; the plggpress-mission work
continues in this worktree (`.worktrees/poc4-edit`, branch
`work-20260712-174248`) in a fresh session. This ticket does NOT supersede
`20260712152250-poc4-agent-file-edits-hot-reload.md` — it is the setup step
that must run first; drive PoC 4 immediately after.

Already done (context, do not redo):

- The PoC 4 implementation ticket is fully specified and queued in THIS
  worktree (`20260712152250-poc4-agent-file-edits-hot-reload.md`, commit
  70445746) with both design decisions locked (iframe isolation for reload
  survival; agent edits a git-ignored seeded COPY of the guide docs).
- PR #66 merged to main (99e0e24d) and shipped as GitHub Release
  2026.07.week2.release6: the plgg-bundle inlined-dist externals-lookup fix
  (`replaceExternalKey` in `collectModules.ts`), plgg-bundle bumped to and
  npm-published as **0.0.6**, all consumer package-locks synced, and the
  `modernize-plgg-bundle` mission added under `.workaholic/missions/active/`.
- The plggpress mission stands at 5/9: PoCs 1–3 proven and shipped; PoC 4
  (this worktree), PoC 5 (central config generation), PoC 6 (non-tree
  classification), and post-PoC integration remain.

Where work stopped: no PoC 4 implementation has begun — this branch contains
only the ticket commit (70445746) on a base (ce48768a) now behind main.

## Policies

Setup-only ticket (branch sync + install); the implementation policies live
in the PoC 4 ticket's own `## Policies` section, which the driving session
MUST read before writing code. For this ticket: `workaholic:operation` —
keep the branch deployable-equivalent to main before building on it (the
version-collision and stale-dist classes of failure both come from building
on a stale base).

## Implementation Steps

1. In `.worktrees/poc4-edit`, merge `origin/main` into
   `work-20260712-174248` (expect fast, content conflicts none — the branch
   only adds one ticket file).
2. Run `scripts/npm-install.sh`, then confirm the installed bundler is the
   fixed one: `grep -c replaceExternalKey packages/plgg-bundle/src/domain/usecase/collectModules.ts`
   returns ≥1 (the fix matters to PoC 4: its shell serves a plgg-bundle app
   bundle that inlines multiple plgg dists — exactly the shape 0.0.5 broke).
3. Proceed to drive `20260712152250-poc4-agent-file-edits-hot-reload.md`
   (same todo queue) — it is the actual PoC 4 build.

## Quality Gate

- `git log --oneline -1 origin/main` is an ancestor of the worktree branch
  (`git merge-base --is-ancestor origin/main HEAD` exits 0).
- `packages/plgg-ir-syntax/node_modules/.bin/plgg-bundle` exists (the
  2026-07-13 session found the plgg-ir packages had never been installed on
  this host — a fresh `check-all` fails with exit 127 without it).
- No working-tree changes other than this ticket's own archive move.

## Findings

- plgg-bundle 0.0.5 broke ANY app bundle inlining two or more plgg-family
  dists at runtime (`plgg_1.box is not a function`): the outer graph walk
  rewrote `require("plgg")` inside an inlined dist's inner registry bodies
  while the inner `__externals` table stayed keyed `"plgg"`, so the lookup
  fell into the transpiled dynamic-import fallback and returned a Promise.
  Fixed in 0.0.6 (`replaceExternalKey`). PoC 4's session shell is exactly
  this bundle shape — do not build it against 0.0.5.
- plgg-bundle's bin relocates registry-installed source to
  `/tmp/plgg-relocate-plgg-bundle-<version>-<tag>` and reuses the copy while
  its ready-marker exists: hot-patching a consumer's `node_modules` source
  does nothing until that cache dir is removed. Monorepo `file:` links are
  unaffected (no relocation), but any registry-install verification must
  clear the cache first.
- `scripts/test-plgg.sh` only runs `packages/plgg`'s suite; per-package
  suites run via `cd packages/<pkg> && npm test`. A repo-wide proof is
  `scripts/check-all.sh` (fresh rebuild, ~4 minutes on this host).

## Decisions

- Publish flow modernization was deliberately split OUT of the PoC work into
  the new `modernize-plgg-bundle` mission (8 acceptance criteria: parallel
  preflight, structured output, auto-skipping gate, compiled-dist bin
  retiring relocate.mjs, static export surface, minification/size
  accounting, tested emit-shape contract, warning hygiene). Do not fold
  bundler-modernization work into PoC 4 tickets; ticket it against that
  mission instead.
- The PoC 4 design decisions (iframe isolation; edit-a-seeded-copy) were
  locked with the developer on 2026-07-12 and recorded in the PoC 4 ticket —
  do not relitigate them.
