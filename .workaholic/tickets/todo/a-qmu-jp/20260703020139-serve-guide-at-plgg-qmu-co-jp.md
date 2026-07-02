---
created_at: 2026-07-03T02:01:39+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort:
commit_hash:
category:
depends_on: [20260703020138-deploy-guide-build-plggmatic-before-plggpress.md]
---

# Serve the plgg guide at `plgg.qmu.co.jp` (GitHub Pages custom domain)

## Overview

Put the plgg guide (GitHub Pages, repo `qmu/plgg`) on the custom domain `plgg.qmu.co.jp`. The `qmu.co.jp` zone is managed in the developer's Cloudflare account ("qmu"). GitHub Pages with a custom domain serves from the domain root, so the site's base path changes from `/plgg/` to `/`, and `qmu.github.io/plgg` starts redirecting to the custom domain automatically once configured.

Three coordinated pieces:

1. **DNS (Cloudflare, zone qmu.co.jp):** `CNAME plgg → qmu.github.io` (DNS-only/grey-cloud until the GitHub certificate is issued; can be proxied later). Needs either a scoped Cloudflare API token from the developer or the developer adds the record.
2. **GitHub Pages custom domain:** `gh api -X PUT repos/qmu/plgg/pages -f cname=plgg.qmu.co.jp` (build_type stays `workflow`), then enforce HTTPS once the cert is provisioned (`-F https_enforced=true`).
3. **Repo:** `.github/workflows/deploy-guide.yml` `DOCS_BASE` changes `/plgg/` → `/`; update `.workaholic/deployments/guide.md` (canonical URL becomes https://plgg.qmu.co.jp/, verify steps probe it); update any hardcoded `qmu.github.io/plgg` references (README, guide content) to the new canonical URL.

## Policies

- `workaholic:design` / `policies/vendor-neutrality.md` — the custom domain decouples the published URL from the hosting vendor: if Pages is ever replaced, the URL survives (bounded exit cost)
- `workaholic:operation` / CI/CD + delivery — deploy remains CI-owned; the domain change is config, not a new deploy path
- `workaholic:implementation` / `policies/directory-structure.md`, `policies/coding-standards.md` — universal; changes stay in the canonical workflow + deployment contract files

## Key Files

- `.github/workflows/deploy-guide.yml` - `DOCS_BASE: /plgg/` → `/` in the guide build step
- `.workaholic/deployments/guide.md` - canonical URL + Verify/Confirmation steps move to https://plgg.qmu.co.jp/
- `packages/guide/site.config.ts` (or wherever DOCS_BASE lands) - confirm the base path is consumed from the env, not duplicated
- `README.md` / guide content - any hardcoded qmu.github.io/plgg links

## Implementation Steps

1. Confirm with the developer: DNS via provided API token or manual record; proxy mode (recommend DNS-only until cert issued).
2. Add the CNAME in Cloudflare (or hand the exact record to the developer and wait for confirmation): `plgg.qmu.co.jp CNAME qmu.github.io`, DNS-only.
3. Set the Pages custom domain: `gh api -X PUT repos/qmu/plgg/pages -f cname=plgg.qmu.co.jp`; poll `gh api repos/qmu/plgg/pages` until the certificate state is issued; then `gh api -X PUT repos/qmu/plgg/pages -F https_enforced=true`.
4. Change `DOCS_BASE` to `/` in deploy-guide.yml; sweep hardcoded URL references.
5. Merge (workflow-file change triggers Deploy Guide); watch the run; probe `https://plgg.qmu.co.jp/` (200, correct content, internal links resolve at the new base) and confirm `https://qmu.github.io/plgg/` redirects.
6. Record the confirmation in `.workaholic/deployments/guide.md`.

## Quality Gate

**Acceptance criteria:**

- `dig +short plgg.qmu.co.jp CNAME` (or A via proxy) resolves; `gh api repos/qmu/plgg/pages` shows `cname: plgg.qmu.co.jp` with certificate issued
- `curl -sI https://plgg.qmu.co.jp/` → 200 with valid TLS; site nav renders; internal links work at base `/`
- `curl -sI https://qmu.github.io/plgg/` → 301 to https://plgg.qmu.co.jp/
- Deploy Guide run for the merge commit is green

**Verification method:** the curl/dig/gh probes above, run post-merge and recorded in the deployment contract.

**Gate:** all probes pass; confirmation recorded in `.workaholic/deployments/guide.md`.

## Considerations

- Depends on the build-order fix ticket landing first (a red Deploy Guide would mask this change's verification)
- Until the GitHub Pages certificate is issued, https://plgg.qmu.co.jp serves a certificate error — sequence DNS → Pages cname → wait for cert → enforce HTTPS → then flip DOCS_BASE, or accept a short window where the old URL is canonical
- The old base `/plgg/` is baked into published artifacts (search-engine links); GitHub's automatic redirect covers qmu.github.io/plgg/* paths
- The plgg-guide.qmu.dev tunnel preview (dev surface) is unaffected — different zone, different mechanism
