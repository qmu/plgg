---
created_at: 2026-07-03T21:05:28+09:00
author: a@qmu.jp
type: refactoring
layer: [Config]
effort: 0.25h
commit_hash: 2f62322
category: Removed
---

# Guide Dockerfile: drop the now-unneeded `git` install (and its stale comment)

## Overview

The guide dev-container `Dockerfile` installs `git`:

```dockerfile
# git: the canonical build/install scripts the entrypoint
# reuses (scripts/build.sh) resolve the repo root via
# `git rev-parse`, and the bind-mounted tree carries .git.
# node:22-slim ships without it, so add it here.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*
```

That comment is now **false**: ticket `20260703190547` changed
`scripts/build.sh` to resolve `REPO_ROOT` from the script's own path, so it no
longer calls `git rev-parse`. Nothing in the container's build or runtime path
invokes the `git` binary anymore:

- `scripts/build.sh` — no `git` (verified: `grep git` returns nothing).
- `workloads/guide/dev-entrypoint.sh` — no `git`.
- The in-container npm work (`npm install`, `npm ci`, `plgg-bundle` build/dev) —
  all deps are `file:` or registry, none are git-URLs, so npm never shells out
  to git. The only `git` token in `plgg-bundle` source is the string `".git"`
  in `Dev/node/scanGraph.ts`'s ignore list — a filename filter, not an
  invocation.

So the `apt-get install git` layer is dead weight. Remove it (smaller image,
one fewer apt layer) and delete the misleading comment.

## Key Files

- `workloads/guide/Dockerfile` — the `git`-install `RUN` block and its preceding
  comment (currently ~lines 13-19).

## Implementation Steps

1. Delete the `# git: …` comment block and the
   `RUN apt-get update && apt-get install -y --no-install-recommends git && …`
   layer from `workloads/guide/Dockerfile`.
2. If removing it leaves `node:22-slim` needing an `apt-get update` for some
   OTHER reason, keep only what's actually used — but as of now nothing else in
   the Dockerfile needs apt, so the whole block should go.

## Quality Gate

**Objective pass condition — from this worktree:**

1. `git` no longer appears in `workloads/guide/Dockerfile`.
2. `./scripts/serve-guide.sh` rebuilds the image cleanly and the container
   reaches `plgg-bundle dev on :5173`, stays **Up**, and
   `curl -s -o /dev/null -w '%{http_code}' http://localhost:5181/` returns
   **200** — i.e. removing git did NOT break the build or serve.
3. Sanity: `podman run --rm --entrypoint sh localhost/guide_guide:latest -c
   'command -v git || echo no-git'` prints `no-git`, confirming the image no
   longer ships git and nothing errored for its absence.

**Cleanup:** `podman compose -f workloads/guide/compose.yaml down` after
verifying.

## Considerations

- This is pure cleanup enabled by `20260703190547`; no behaviour change is
  intended beyond a smaller image.
- Do not touch `build.sh`, `dev-entrypoint.sh`, or `compose.yaml` here — scope is
  the Dockerfile only.
