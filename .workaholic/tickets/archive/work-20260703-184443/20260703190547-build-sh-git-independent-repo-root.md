---
created_at: 2026-07-03T19:05:47+09:00
author: a@qmu.jp
type: bugfix
layer: [Config]
effort: 0.25h
commit_hash: adcd12e
category: Changed
---

# `scripts/build.sh`: resolve `REPO_ROOT` without `git`, so the guide container builds from a worktree

## Overview

Running `./scripts/serve-guide.sh` from a **git worktree** (e.g.
`.worktrees/work-20260703-184443`) brings the guide dev container up, but it
**exits 1** within seconds and never serves.

Root cause: `scripts/build.sh` line 2 is
`REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT`. In a worktree the
tree's `.git` is a *file* pointing at
`…/plgg/.git/worktrees/<branch>` — a path that does **not exist inside the
container** (only the worktree tree is mounted at `/app`, not the main repo's
`.git`). So inside the container `git rev-parse --show-toplevel` exits **128**
(`fatal: not a git repository: …/.git/worktrees/work-20260703-184443`),
`REPO_ROOT` is left **empty**, and the `&& cd` is skipped.

Every later `cd $REPO_ROOT/packages/<pkg>` then runs as `cd /packages/<pkg>` and
fails; because each line is a `cd … && npm run build` list, `set -e` never
trips, so `build.sh` prints its "All shell scripts have been executed
successfully" banner and exits 0 **without building any dist**. The dev server
then dies with `Cannot find module …/plgg/dist/index.es.js` (or
`Cannot find package 'typescript'` on the earlier plgg-bundle bootstrap).

This is the **only** in-container consumer of `git rev-parse`: `build.sh` is
invoked by `workloads/guide/dev-entrypoint.sh` (which itself uses a hardcoded
`cd /app`, not git) via `sh scripts/build.sh`. The other ~80 `scripts/*.sh` that
call `git rev-parse --show-toplevel` all run on the **host**, where git resolves
a worktree correctly — so they are **out of scope**.

Fix: derive the repo root from the script's own location (git-independent,
worktree- and container-safe), which also stays correct for the normal main
checkout:

```sh
REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd) && cd "$REPO_ROOT"
```

Verified in-container this session: invoked as `sh scripts/build.sh` from
`/app`, this resolves `REPO_ROOT=/app`, exit 0, and `/app/packages/plgg`
resolves. From the main checkout it resolves to the repo root exactly as before.

## Key Files

- `scripts/build.sh` — line 2 only. Replace the `git rev-parse` root resolution
  with the path-derivation form above. Leave the rest of the script unchanged.

## Implementation Steps

1. Edit `scripts/build.sh` line 2:
   from `REPO_ROOT=$(git rev-parse --show-toplevel) && cd $REPO_ROOT`
   to   `REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd) && cd "$REPO_ROOT"`.
   (Quote `"$REPO_ROOT"` in the `cd` to match the hardened form; the many
   `cd $REPO_ROOT/packages/<pkg>` lines below need no change — they only broke
   because `REPO_ROOT` was empty.)
2. Do **not** touch `dev-entrypoint.sh`, `serve-guide.sh`, `compose.yaml`, the
   Dockerfile, or any other `scripts/*.sh` — scope is `build.sh` line 2.

## Quality Gate

**Objective pass condition — verify from this worktree
(`.worktrees/work-20260703-184443`), not the main checkout:**

1. `./scripts/serve-guide.sh` — completes and returns (detached).
2. `podman ps --filter name=guide` shows `guide_guide_1` **Up** (not `Exited`)
   after the build settles.
3. `podman logs guide_guide_1` shows the dists built (no
   `can't cd to /packages/...`, no `fatal: not a git repository`,
   no `ERR_MODULE_NOT_FOUND` / `Cannot find package 'typescript'`) and reaches
   the `plgg-bundle dev on :5173` server-listening line.
4. `curl -s -o /dev/null -w '%{http_code}' http://localhost:5181` returns
   **200**, and the body is the guide HTML.

**Regression check:** confirm the derived `REPO_ROOT` still equals the repo root
when `build.sh` runs from the main checkout (`/home/ec2-user/projects/plgg`) —
the fix must be a no-op there.

**Edge case:** `$0` is `scripts/build.sh` (relative) as `dev-entrypoint.sh`
invokes it from `/app`; the `CDPATH= cd -- "$(dirname -- "$0")/.."` form handles
the relative path and neutralizes any inherited `CDPATH`.

**Cleanup after verifying:** stop the container
(`podman compose -f workloads/guide/compose.yaml down`) so it does not linger.

## Considerations

- Keep the `&&` chain so a failed `cd` still can't silently continue — but note
  the real safety win is that `REPO_ROOT` is now never empty.
- Broader hardening of the other ~80 host scripts is **explicitly out of scope**;
  they are not broken (host git resolves worktrees). If desired, file a separate
  ticket.
