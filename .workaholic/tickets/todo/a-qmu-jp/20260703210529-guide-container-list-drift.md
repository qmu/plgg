---
created_at: 2026-07-03T21:05:29+09:00
author: a@qmu.jp
type: refactoring
layer: [Config]
effort: 1h
category: Changed
---

# Guide dev container: stop the three package-lists from drifting by hand

## Overview

Serving the guide from a fresh worktree just broke because three hand-maintained
lists of packages fell out of sync (see tickets `20260703190547` and
`20260703191649`):

1. **`scripts/build.sh`** — the set of packages it builds (currently 17 + the
   `plgg-bundle` bootstrap), each as `cd $REPO_ROOT/packages/<pkg> && npm run
   build`.
2. **`workloads/guide/dev-entrypoint.sh`** — the step-1 `for pkg in …` install
   loop (the packages that get their own `node_modules` in-container).
3. **`workloads/guide/compose.yaml`** — the anonymous `…/node_modules` volume
   list that isolates each installed package's deps from the host mount.

When `plgg-cli` was added to `build.sh`'s consumers (via `plggmatic`) but not to
lists 2 and 3, its dist never built in-container and the guide dev server died.
The invariant is implicit and enforced only by memory: **every package in the
guide's build graph must appear in all three lists, and lists 2 and 3 must match
each other exactly** (installed-but-unvolumed writes wrong-arch `node_modules`
into the host tree; volumed-but-uninstalled is empty).

Make the invariant structural instead of manual so the next package addition
can't silently break the guide.

## Key Files

- `scripts/build.sh` — source of truth for build order / built set.
- `workloads/guide/dev-entrypoint.sh` — the install loop.
- `workloads/guide/compose.yaml` — the volume list (static YAML — the hard part).

## Implementation Steps

Explore and choose ONE approach (design decision belongs in the ticket
discussion / with the reviewer — do not silently pick the heaviest):

1. **Derive the entrypoint install list from `build.sh`.** `dev-entrypoint.sh`
   already runs `sh scripts/build.sh`; have it derive the package list the same
   way `publish-npm.sh` does
   (`sed -n 's|^cd \$REPO_ROOT/packages/\([a-z0-9-]*\) && npm run build$|\1|p'
   scripts/build.sh`) and loop `npm install` over that — eliminating list 2's
   drift. Restrict to the guide's actual graph if installing all 17 is too slow.
2. **Volumes (list 3) can't read `build.sh`** (static YAML). Options: (a) accept
   a single documented enumeration and add a check that fails loudly if it
   diverges from the install list; (b) replace per-package anonymous volumes
   with one volume strategy that covers `packages/*/node_modules` without
   enumerating (investigate whether a single mount can shadow every
   `node_modules` without clobbering the `file:` symlink graph).
3. Add a lightweight guard (script or CI check) asserting install-list ==
   volume-list ⊆ build.sh-set, so a future mismatch is caught before it reaches
   a serve.

## Quality Gate

**Objective pass condition:**

1. Adding a hypothetical new package to `build.sh`'s guide-graph does **not**
   require a separate manual edit to keep the container working — demonstrate by
   description or a test: after the change, the install/volume coverage follows
   from a single edit (or a guard fails loudly on divergence).
2. `./scripts/serve-guide.sh` from a fresh worktree still serves: container
   **Up**, `curl http://localhost:5181/` = **200**, no `EvalError: failed to
   read export surface` / missing-dist errors in the logs.
3. If a guard/check is added, it **passes** on the current tree and **fails**
   (verified by a deliberate temporary mismatch) when a package is in the
   install list but not the volume list, or vice-versa.

**Cleanup:** `podman compose -f workloads/guide/compose.yaml down` after
verifying.

## Considerations

- Keep it minimal and vendor-neutral (no new deps). A `sed`/`sh` guard reusing
  the existing `publish-npm.sh` derivation pattern is preferable to a new tool.
- The guide only needs its build-graph subset at runtime
  (`plggpress → plggmatic → plgg-cli` + server/md/highlight/view/http/plgg), so
  a derivation may legitimately install fewer than all 17 packages `build.sh`
  builds — that's fine, as long as the guide graph is fully covered and the
  invariant is enforced rather than remembered.
