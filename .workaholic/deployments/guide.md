---
title: plgg guide (plggpress docs site)
environment: production
confirmation_method: api-probe
url: https://plgg.qmu.co.jp/
---

# Deployment: plgg guide (plggpress docs site)

The official documentation site under `packages/guide/`. Two surfaces:

| Surface | URL | Source |
| --- | --- | --- |
| GitHub Pages (canonical, public) | https://plgg.qmu.co.jp/ (custom domain; https://qmu.github.io/plgg/ redirects here) | `actions/deploy-pages` |
| Local tunnel (dev/preview) | https://plgg-guide.qmu.dev | `scripts/serve-guide.sh` → docker workload on host port 5181 behind cloudflared |

## How it deploys

- **Workflow:** `.github/workflows/deploy-guide.yml` (`Deploy Guide`).
- **Trigger:** push to `main` touching `packages/**` or the workflow file, plus `workflow_dispatch`. **Post-merge only** — there is no pre-merge deploy; the docs follow the code onto `main`.
- **Independent of the CalVer release pipeline** — docs ship on their own cadence.
- **Build:** builds all package dists in dependency order (`plgg plgg-http plgg-router plgg-view plgg-kit plgg-server plgg-fetch plgg-sql plgg-foundry`), then `npm run build` in `packages/guide` with `DOCS_BASE=/plgg/`, then `upload-pages-artifact` + `deploy-pages`.

## Prerequisite (one-time, satisfied 2026-06-24)

GitHub Pages must be enabled with **source = GitHub Actions** (`build_type: workflow`). The workflow does NOT auto-enable it (no `actions/configure-pages` with `enablement: true`). Enabled via:

```
gh api -X POST repos/qmu/plgg/pages -f build_type=workflow
```

If a future deploy fails at the `deploy` job, re-check that Pages is still enabled with the `workflow` build type.

## Procedure

Deploy-on-merge: merging the PR to `main` IS the deployment — the `Deploy Guide` workflow builds and publishes the site from the merge commit. There is no pre-merge deploy step. The pre-merge readiness proof is a green `scripts/check-all.sh` (fresh rebuild + full test suite) on the branch.

## Confirmation

**Pre-merge (readiness):** `scripts/check-all.sh` passes on the work branch.

**Post-merge (promotion):**

1. Confirm the `Deploy Guide` run for the merge commit **succeeded** (`gh run list --workflow=deploy-guide.yml`, then `gh run watch <id>`).
2. Confirm the canonical site **renders**: `https://plgg.qmu.co.jp/` returns HTTP 200 with valid TLS and shows the new content (e.g. the Guide / Packages nav and the per-package prose pages — there is no API reference section as of 2026-07-01), and `https://qmu.github.io/plgg/` 301-redirects to it. DNS (`plgg` CNAME `qmu.github.io`, DNS-only) is Terraform-managed in the corporate repo (`infra/terraform/cloudflare-dns/`); the Pages custom-domain + HTTPS enforcement are repo settings (`gh api repos/qmu/plgg/pages`).
3. (Optional, dev) If the local preview is wanted, run `scripts/serve-guide.sh` on this host and check `https://plgg-guide.qmu.dev` (cloudflared tunnel → :5181). This surface is only live while that container runs; it is not the CI-published site.

## Confirmations

- **2026-07-03 — PR #51 (`work-20260701-185044`), merge `efd21c0`: FAILED, then fixed.** `Deploy Guide` run 28607344216 failed at `build plggpress`: the workflow's hard-coded dist build list lacked `plggmatic` (and `plgg-cli`), which plggpress needs since the facade rewire (`fa9ab95`) — `plgg-bundle: EvalError: failed to read export surface: Cannot find module '.../plggpress/node_modules/plggmatic/dist/index.es.js'`. Local `check-all.sh` builds every package, so the gap only appears on the clean runner (same masking class as the plgg-bundle/plgg-highlight install steps). Site stayed on the previous deploy (stale-but-serving). Fix: `plgg-cli plggmatic` inserted into the build list before `plggpress`; the fix's own merge re-triggers the workflow and its confirmation covers PR #51's content.
- **2026-07-01 — PR #50 (`work-20260630-013457`), merge `6cc1a12`.** `Deploy Guide` run 28506802516 succeeded. Verified `https://qmu.github.io/plgg/` → HTTP 200; nav is Guide / Packages / GitHub (API reference removed with typedoc); `/api/` → 404; home hero renders. plgg-press replaced VitePress; monorepo third-party surface now `typescript` + `@types/node` only.
