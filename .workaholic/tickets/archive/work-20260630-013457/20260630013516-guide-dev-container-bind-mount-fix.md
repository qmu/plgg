---
created_at: 2026-06-30T01:35:16+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure, Config]
effort: 2h
commit_hash: 6d5bb11
category: Changed
depends_on: [20260630013509-plgg-press-dev-server-live-reload.md, 20260630013514-guide-remove-vitepress-depend-on-plgg-press-only.md]
---

# Local Docker dev container: build plgg-press sibling dists AFTER the bind mount (or via named volumes) and run plgg-press dev

## Overview

The local Docker dev-container half split out per items 16 & 22. workloads/guide/compose.yaml mounts the host repo over /app (lines 18-24), which HIDES the Dockerfile-built sibling dists plgg-press imports (plgg, plgg-view, plgg-server, plgg-http, plgg-md, plgg-highlight, plgg-press) — the old single-package guide install never needed them, so the masking is new. Fix the masking by building the sibling dists AFTER the mount is in effect (e.g. an entrypoint build step) or by preserving the dist dirs with named volumes, install plgg-highlight's typescript where the build runs, point the container at `plgg-press dev`, and update workloads/guide/README.md to document the new flow.

**Proof of value:** `docker compose -f workloads/guide/compose.yaml up --build` serves the guide via `plgg-press dev` on http://localhost:5181 with all sibling dists (incl. plgg-highlight's typescript) resolved despite the repo bind mount, live-reload working, and workloads/guide/README.md documents the flow.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — container + workload file locations under workloads/guide
- `workaholic:implementation` / `policies/coding-standards.md` — Dockerfile/compose/entrypoint edits follow repo conventions
- `workaholic:implementation` / `policies/containerization.md` — the bind-mount-masking fix is a containerization concern (mount ordering vs build artifacts, named volumes)
- `workaholic:operation` / `policies/ci-cd.md` — the dev container is part of the delivery/runtime story for the guide

## Key Files

- `/home/ec2-user/projects/plgg/workloads/guide/Dockerfile` - run `plgg-press dev` instead of vitepress dev AND build the sibling dists the facade imports (single-package install is insufficient)
- `/home/ec2-user/projects/plgg/workloads/guide/compose.yaml` - the bind mount at lines 18-24 (../..:/app) masks Dockerfile-built dists; resolve via post-mount build or named volumes preserving dist dirs; keep 5181->5173 mapping + tunnel
- `/home/ec2-user/projects/plgg/workloads/guide/README.md` - document the new dev-container flow (sibling-dist build, plgg-press dev) replacing the VitePress instructions

## Dependencies

- Depends on [20260630013509-plgg-press-dev-server-live-reload.md](20260630013509-plgg-press-dev-server-live-reload.md) — plgg-press dev(): node:http + fs.watch rebuild, allowedHosts from PressOptions, and DEV-ONLY SSE live-reload
- Depends on [20260630013514-guide-remove-vitepress-depend-on-plgg-press-only.md](20260630013514-guide-remove-vitepress-depend-on-plgg-press-only.md) — Remove vitepress + typedoc-vitepress-theme; delete .vitepress; depend ONLY on plgg-press (+ typedoc devDeps); convert home frontmatter

## Implementation Steps

1. Diagnose the masking: the `../..:/app` bind mount in compose.yaml shadows any dist built into the image at build time; enumerate the sibling dists plgg-press imports (plgg, plgg-view, plgg-server, plgg-http, plgg-md, plgg-highlight, plgg-press).
2. Choose and implement the fix: either an entrypoint/command step that builds the sibling dists AFTER the mount is active (so they land on the mounted tree), or named volumes for each package's dist dir so the image-built dists survive the repo mount; install plgg-highlight's typescript where the build runs.
3. Update the Dockerfile to run `plgg-press dev` (keep Node 22, internal port 5173) and ensure the sibling-dist build is wired into startup.
4. Update workloads/guide/README.md to document the new flow (build siblings, `plgg-press dev`, port 5181 via tunnel) and remove the VitePress wording in compose.yaml's header comment.
5. Bring up `docker compose -f workloads/guide/compose.yaml up --build` and confirm the guide serves via plgg-press dev with sibling dists resolved (no 'Cannot find package' for any sibling or for typescript), live-reload working, on http://localhost:5181.

## Considerations

- The dev container previously only installed the guide package (vitepress); plgg-press imports seven sibling built dists, so the container must build them or mount built dists (item 22).
- Bind-mount ordering is the crux: dists built during image build are hidden once the host repo mounts over /app — build after the mount or use named volumes (item 22).
- plgg-highlight's typescript clean-runner masking applies here too: install it where the in-container build runs.
- Sequence after the vitepress-removal ticket so the container targets plgg-press, not VitePress.

## Final Report

Development completed as planned (last ticket of the migration). The bind-mount masking is fixed via a post-mount entrypoint build (Option A): workloads/guide/dev-entrypoint.sh installs each package's own node_modules in dependency order (the plgg-highlight install is the typescript clean-runner fix), runs scripts/build.sh so the 7 sibling dists land on the MOUNTED tree, then execs PORT=5173 npm run dev (plgg-press dev). Dockerfile de-VitePress'd (adds git for build.sh's git rev-parse; ENTRYPOINT; Node 22; EXPOSE 5173). compose.yaml keeps 5181:5173 + tunnel, per-package node_modules volumes isolate container deps while dists land on the mount. README documents the new flow.

### Discovered Insights

- **Insight**: `npm install` in packages/guide does NOT cascade — its node_modules holds only a plgg-press symlink + typescript. plgg-press's runtime graph relies on each package's OWN node_modules (the per-package model scripts/npm-install.sh uses), so the container must install each package in dependency order, not just the guide. The plgg-highlight install provides its own-path typescript (the clean-runner masking).
  **Context**: Named-volume seeding goes stale on rebuild and needs ~18 volumes; the entrypoint build always reflects current source and reuses scripts/build.sh.
- **Insight**: Docker is NOT installed in this environment, so `docker compose up --build` / `docker compose config` could not run headless. Verified equivalently: build.sh produces all 7 dists; plgg-press dev serves the guide (HTTP 200, <title>plgg</title>, full nav, live-reload EventSource, Host plgg-guide.qmu.dev 200 / evil 403); Node 22 native type-stripping is compatible. The actual container bring-up must be confirmed where Docker runs (the deploy/ship step).
  **Context**: A pre-existing foreign vitepress dev container still holds :5173 on this host — it predates the migration and will be replaced when the new container is brought up at ship.
