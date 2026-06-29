---
created_at: 2026-06-30T01:35:13+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013508-plgg-press-dev-server-live-reload.md, 20260630013511-wire-new-packages-into-gate.md, 20260630013512-guide-remove-vitepress-depend-on-plgg-press-only.md]
---

# Rewire deploy-guide.yml, serve-guide.sh, dev container (plgg-press + sibling dists), and gate-vite.sh

## Overview

Finish the migration at the ops layer: update deploy-guide.yml to build plgg-md/plgg-highlight/plgg-press (and install plgg-highlight's typescript via plgg-press, mirroring the plgg-bundle clean-runner fix) in dependency order, run `docs:api && plgg-press build` with DOCS_BASE=/plgg/, and upload packages/guide/dist (not .vitepress/dist); point serve-guide.sh + the workloads/guide Dockerfile/compose at `plgg-press dev` AND ensure the container builds the required sibling dists (plgg, plgg-view, plgg-server, plgg-http, plgg-md, plgg-highlight, plgg-press) the facade imports; and tighten gate-vite.sh by removing BOTH the /guide/ exemptions so the no-vite gate enforces zero direct vite everywhere.

**Proof of value:** scripts/gate-vite.sh passes with both /guide/ exemptions removed (zero direct vite anywhere) and asserts vitepress/typedoc-vitepress-theme absent; a local deploy build (DOCS_BASE=/plgg/) produces packages/guide/dist via `plgg-press build` with working base-prefixed links and highlighted API pages, and the dev container serves the guide via `plgg-press dev` with sibling dists resolved.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — workflow/script/container file locations
- `workaholic:implementation` / `policies/coding-standards.md` — workflow/script edits follow the repo's shell + YAML conventions
- `workaholic:implementation` / `policies/command-scripts.md` — shell scripts follow the canonical-runner conventions
- `workaholic:operation` / `policies/ci-cd.md` — deploy workflow + gate are CI/CD operation concerns
- `workaholic:implementation` / `policies/vendor-neutrality.md` — the gate enforces zero direct vite; CI installs the existing typescript for plgg-highlight (via plgg-press) without adding deps

## Key Files

- `/home/ec2-user/projects/plgg/.github/workflows/deploy-guide.yml` - add plgg-md + plgg-highlight + plgg-press to the dependency-ordered build loop; install plgg-highlight's typescript like the plgg-bundle step; replace the VitePress build with `plgg-press build`; upload packages/guide/dist
- `/home/ec2-user/projects/plgg/scripts/serve-guide.sh` - update banner/command to run `plgg-press dev` (still :5181 external via the tunnel)
- `/home/ec2-user/projects/plgg/workloads/guide/Dockerfile` - run `plgg-press dev` instead of vitepress dev AND build the sibling dists the facade imports (single-package install is insufficient)
- `/home/ec2-user/projects/plgg/workloads/guide/compose.yaml` - keep 5181->5173 mapping + repo mount; same tunnel
- `/home/ec2-user/projects/plgg/scripts/gate-vite.sh` - remove BOTH the find '-not -path */guide/*' exclusion AND the trailing '| grep -v /guide/' pipe; assert vitepress + typedoc-vitepress-theme absent from all package.json

## Dependencies

- Depends on [20260630013508-plgg-press-dev-server-live-reload.md](20260630013508-plgg-press-dev-server-live-reload.md) — plgg-press dev(): node:http + fs.watch rebuild, Host allowlist, and DEV-ONLY SSE live-reload
- Depends on [20260630013511-wire-new-packages-into-gate.md](20260630013511-wire-new-packages-into-gate.md) — Wire plgg-md + plgg-highlight + plgg-press into scripts/build.sh and check-all.sh with per-package test runners
- Depends on [20260630013512-guide-remove-vitepress-depend-on-plgg-press-only.md](20260630013512-guide-remove-vitepress-depend-on-plgg-press-only.md) — Remove vitepress + typedoc-vitepress-theme; delete .vitepress; depend ONLY on plgg-press (+ typedoc devDeps); convert home frontmatter

## Implementation Steps

1. Edit deploy-guide.yml: add plgg-md, plgg-highlight, and plgg-press to the dependency-ordered build loop (after plgg/plgg-view/plgg-server/plgg-http); add an 'install plgg-highlight deps' step (npm ci in packages/plgg-highlight) so its typescript is present on the clean runner; replace the 'VitePress build' step with `npm ci && npm run docs:api && plgg-press build` (DOCS_BASE=/plgg/); change upload-pages-artifact path from .vitepress/dist to packages/guide/dist.
2. Edit workloads/guide/Dockerfile to run `plgg-press dev` and to build the sibling dists the facade imports (plgg, plgg-view, plgg-server, plgg-http, plgg-md, plgg-highlight, plgg-press) — a guide-only install will not provide them; keep Node 22, repo mount, internal port 5173.
3. Update scripts/serve-guide.sh banner/command for `plgg-press dev`; keep the http://localhost:5181 message; verify compose.yaml's 5181->5173 mapping + plgg-guide.qmu.dev tunnel still work.
4. Edit scripts/gate-vite.sh: remove BOTH the `-not -path '*/guide/*'` find exclusion and the trailing `| grep -v '/guide/'` pipe; add an assertion that neither 'vitepress' nor 'typedoc-vitepress-theme' appears in any package.json.
5. Run scripts/gate-vite.sh (must pass with zero direct vite anywhere) and scripts/check-all.sh; dry-run the deploy build locally with DOCS_BASE=/plgg/ and confirm packages/guide/dist with working base-prefixed links and highlighted API pages.

## Considerations

- plgg-highlight imports typescript from its own node_modules (clean-runner masking, same as plgg-bundle): the deploy workflow AND the dev container MUST install it where the build runs (reached transitively via plgg-press), or highlighting silently breaks only in CI.
- The dev container previously only installed the guide package (vitepress); plgg-press imports seven sibling built dists, so the container must build them or mount built dists.
- Sequence after ticket 15 so vitepress is already gone before the gate exemption is removed — no red-gate window.
