---
created_at: 2026-06-30T01:35:12+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config, Infrastructure]
effort:
commit_hash:
category:
depends_on: [20260630013510-guide-dev-server.md, 20260630013511-guide-remove-vitepress-deps-and-config.md]
---

# Rewire deploy-guide.yml, serve-guide.sh, dev container (sibling dists), and gate-vite.sh

## Overview

Finish the migration at the ops layer: update deploy-guide.yml to build plgg-md/plgg-highlight (and install plgg-highlight's typescript, mirroring the plgg-bundle clean-runner fix) in dependency order, run `docs:api && node build` with DOCS_BASE=/plgg/, and upload packages/guide/dist (not .vitepress/dist); point serve-guide.sh + the workloads/guide Dockerfile/compose at the new dev server AND ensure the container builds the required sibling dists (plgg, plgg-view, plgg-server, plgg-http, plgg-md, plgg-highlight) the dev server imports; and tighten gate-vite.sh by removing BOTH the /guide/ exemptions so the no-vite gate enforces zero direct vite everywhere.

**Proof of value:** scripts/gate-vite.sh passes with both /guide/ exemptions removed (zero direct vite anywhere) and asserts vitepress/typedoc-vitepress-theme absent; a local deploy build (DOCS_BASE=/plgg/) produces packages/guide/dist with working base-prefixed links and highlighted API pages, and the dev container serves the guide with sibling dists resolved.

## Policies

The standard engineering policies this ticket answers to. The implementing session MUST read each linked policy before writing code and keep the change defensible against its Goal / Responsibility / Practices.

- `workaholic:implementation` / `policies/directory-structure.md` — workflow/script/container file locations
- `workaholic:implementation` / `policies/command-scripts-policy.md` — shell scripts follow the canonical-runner conventions
- `workaholic:operation` / `policies/ci-cd.md` — deploy workflow + gate are CI/CD operation concerns
- `workaholic:implementation` / `policies/vendor-neutrality.md` — the gate enforces zero direct vite; CI installs the existing typescript for plgg-highlight without adding deps

## Key Files

- `/home/ec2-user/projects/plgg/.github/workflows/deploy-guide.yml` - add plgg-md + plgg-highlight to the dependency-ordered build loop; install plgg-highlight's typescript like the plgg-bundle step; replace the VitePress build with node build; upload packages/guide/dist
- `/home/ec2-user/projects/plgg/scripts/serve-guide.sh` - update banner/command to run the plgg-native dev server (still :5181 external via the tunnel)
- `/home/ec2-user/projects/plgg/workloads/guide/Dockerfile` - run `node src/serve.js` instead of vitepress dev AND build the sibling dists the dev server imports (single-package install is insufficient)
- `/home/ec2-user/projects/plgg/workloads/guide/compose.yaml` - keep 5181→5173 mapping + repo mount; same tunnel
- `/home/ec2-user/projects/plgg/scripts/gate-vite.sh` - remove BOTH the find '-not -path */guide/*' exclusion AND the trailing '| grep -v /guide/' pipe; assert vitepress + typedoc-vitepress-theme absent from all package.json

## Dependencies

- Depends on [20260630013510-guide-dev-server.md](20260630013510-guide-dev-server.md) — Guide dev server: node:http + fs.watch rebuild with Host allowlist
- Depends on [20260630013511-guide-remove-vitepress-deps-and-config.md](20260630013511-guide-remove-vitepress-deps-and-config.md) — Remove vitepress + typedoc-vitepress-theme; delete .vitepress; set full file: dep set; convert home frontmatter

## Implementation Steps

1. Edit deploy-guide.yml: add plgg-md and plgg-highlight to the dependency-ordered build loop (after plgg/plgg-view); add an 'install plgg-highlight deps' step (npm ci in packages/plgg-highlight) so its typescript is present on the clean runner; replace the 'VitePress build' step with `npm ci && npm run docs:api && node src/build.js` (DOCS_BASE=/plgg/); change upload-pages-artifact path from .vitepress/dist to packages/guide/dist.
2. Edit workloads/guide/Dockerfile to run `node src/serve.js` and to build the sibling dists the dev server imports (plgg, plgg-view, plgg-server, plgg-http, plgg-md, plgg-highlight) — a guide-only install will not provide them; keep Node 22, repo mount, internal port 5173.
3. Update scripts/serve-guide.sh banner/command for the new dev server; keep the http://localhost:5181 message; verify compose.yaml's 5181→5173 mapping + plgg-guide.qmu.dev tunnel still work.
4. Edit scripts/gate-vite.sh: remove BOTH the `-not -path '*/guide/*'` find exclusion and the trailing `| grep -v '/guide/'` pipe; add an assertion that neither 'vitepress' nor 'typedoc-vitepress-theme' appears in any package.json.
5. Run scripts/gate-vite.sh (must pass with zero direct vite anywhere) and scripts/check-all.sh; dry-run the deploy build locally with DOCS_BASE=/plgg/ and confirm packages/guide/dist with working base-prefixed links and highlighted API pages.

## Considerations

- plgg-highlight imports typescript from its own node_modules (clean-runner masking, same as plgg-bundle): the deploy workflow AND the dev container MUST install it where the build runs, or highlighting silently breaks only in CI.
- The dev container previously only installed the guide package (vitepress); the new dev server imports six sibling built dists, so the container must build them or mount built dists.
- Sequence after ticket 14 so vitepress is already gone before the gate exemption is removed — no red-gate window.
