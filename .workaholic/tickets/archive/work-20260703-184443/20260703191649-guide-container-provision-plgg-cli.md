---
created_at: 2026-07-03T19:16:49+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort: 0.25h
commit_hash: b9f1e56
category: Changed
depends_on: [20260703190547-build-sh-git-independent-repo-root.md]
---

# Guide dev container: provision `plgg-cli` so `plggmatic` builds and the guide serves

## Overview

With the `build.sh` git-independence fix (sibling ticket
`20260703190547`) in place, `scripts/build.sh` now actually runs inside the
guide dev container from a worktree — which unmasks a second failure: the
container never serves. `plggmatic`'s build dies with

```
plgg-bundle: EvalError: failed to read export surface:
  Cannot find module '/app/packages/plggmatic/node_modules/plgg-cli/dist/index.cjs.js'
```

and then `plggpress`'s dev entry can't resolve `plggmatic`, so the dev server
exits 1 and `curl http://localhost:5181` returns nothing.

Root cause: the container provisions only a **subset** of the packages
`build.sh` builds. `workloads/guide/dev-entrypoint.sh`'s step-1 install loop
installs 9 packages (plgg, plgg-http, plgg-view, plgg-md, plgg-highlight,
plgg-server, plggmatic, plggpress, guide) and `workloads/guide/compose.yaml`
volume-isolates those same 9 (+ plgg-bundle). Every other package is read
through the host bind-mount — but in a fresh worktree the host tree has no
`node_modules`/`dist` for them. `plggmatic` depends on `plgg-cli`
(`"plgg-cli": "file:../plgg-cli"`), so it needs `plgg-cli/dist`; `plgg-cli` is
neither installed nor volume-isolated, so its `build.sh` build finds no
`node_modules` (no `plgg-bundle` on its resolution path) and produces no dist.

**Scope — only `plgg-cli` is missing.** The guide's full build/runtime graph
(transitive `file:` deps) is:
`guide → plggpress → plggmatic → {plgg-cli, plgg-server, plgg-view, plgg-md,
plgg-highlight, plgg-http, plgg}`. Of those, `plgg-cli` is the sole package not
already provisioned. The other packages `build.sh` builds
(plgg-kit, plgg-foundry, plgg-router, plgg-fetch, plgg-sql, plgg-db-migration,
plgg-test, example) are **not** in the guide's graph — nothing the guide loads
imports them — so their build noise is harmless and they are intentionally left
unprovisioned. (`plgg-test` is only a devDependency, unused by `npm run build`.)

## Key Files

- `workloads/guide/dev-entrypoint.sh` — the step-1 install loop (currently 9
  packages). Add `plgg-cli` in dependency order (after `plgg`, before
  `plggmatic`, which consumes it).
- `workloads/guide/compose.yaml` — the anonymous-volume list. Add
  `/app/packages/plgg-cli/node_modules` so the container installs `plgg-cli`'s
  linux/arm deps into an isolated volume rather than clobbering the host tree
  through the bind mount.

## Implementation Steps

1. `dev-entrypoint.sh`: add `plgg-cli \` to the `for pkg in …` install list,
   placed after `plgg` and before `plggmatic` (dependency order; `plgg-cli`
   only needs `plgg` + `plgg-bundle`, and `plggmatic` needs `plgg-cli`).
2. `compose.yaml`: add `- /app/packages/plgg-cli/node_modules` to the
   `volumes:` list (group it with the other package node_modules volumes,
   keeping dependency-ish order for readability).
3. Rebuild + serve: `./scripts/serve-guide.sh` from this worktree.

## Quality Gate

**Objective pass condition — from this worktree
(`.worktrees/work-20260703-184443`):**

1. `./scripts/serve-guide.sh` completes (detached).
2. `podman logs guide_guide_1` shows **no** `EvalError: failed to read export
   surface` and **no** `Cannot find module …plgg-cli/dist…` /
   `…plggmatic/dist…`; it reaches `plgg-bundle dev on :5173`.
3. `podman ps --filter name=guide` shows `guide_guide_1` **Up** and it stays Up
   (does not Exit within ~30s).
4. `curl -s -o /dev/null -w '%{http_code}' http://localhost:5181/` returns
   **200**, and the body is the guide HTML.

**Cleanup after verifying:** `podman compose -f workloads/guide/compose.yaml
down` so the container does not linger.

## Considerations

- Keep the install list and the volume list **in sync**: any package added to
  one must be added to the other (an installed-but-unvolumed package writes its
  wrong-arch `node_modules` into the host tree; a volumed-but-uninstalled
  package is empty). This ticket adds `plgg-cli` to both.
- The three lists that must agree — `build.sh`'s built set, the entrypoint's
  install set, and compose's volume set — currently drift by hand. Reducing that
  drift (e.g. deriving the install list, or trimming `build.sh` to what a target
  needs) is a **separate** design concern, not this bugfix. Record it as a
  deferred concern rather than expanding scope here.
- Deferred from the sibling ticket: the guide `Dockerfile` still installs `git`
  with a comment saying `build.sh` "resolve[s] the repo root via `git
  rev-parse`" — now false after `20260703190547`. Confirm whether anything in
  the container still needs `git`; if not, the install + comment can be removed
  in a follow-up.
