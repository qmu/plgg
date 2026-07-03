---
created_at: 2026-07-03T14:11:20+09:00
author: a@qmu.jp
type: housekeeping
layer: [Config]
effort:
commit_hash:
category:
depends_on:
---

# RESUME: /report + /ship `work-20260703-050355` (CI minimum + qmu reconciliation), then the queued follow-ups

## Overview

Session handoff (2026-07-03, /carry). The branch `work-20260703-050355` is **complete and green** — 19 commits, 6 archived tickets, empty todo queue, clean workspace — and is waiting only for `/report` + `/ship`. The developer reviewed the work iteratively on the dev preview (plgg-guide.qmu.dev) and closed with "excellent". A fresh session picks up at step 1 below; nothing on the branch needs more implementation.

## Position (verified at handoff)

- **Branch:** `work-20260703-050355`, 19 commits ahead of main, workspace clean, todo queue empty (this ticket aside).
- **Archived tickets on the branch (6):** minimum GitHub Actions under the local CI/CD policy (5 workflows → 2); plggpress tokens/typography/a11y reconciled to the current qmu.co.jp oracle; prose home (hero retired, SiteConfig Home vocabulary removed); in-article 目次 (plgg-md typed heading extraction); SVG sun/moon icons (plgg-view gained minimal svg/path vocabulary); guide sidebar reorganized into five role-based sections (Guide/Core/Library/plggmatic/plggpress).
- **Plus the sign-off refinement stream** (committed, spec-pinned): far-right chrome rail, flush-left sidebar with qmu's 29px pitch, linked-code hover vanish fix, no underline-on-hover cascade fix, 150ms + cubic-bezier(0.4,0,0.2,1) motion, snap-text-color refinement (deliberate divergence: only fills fade), 目次 styles restoration.
- **Gates last verified:** fresh `check-all.sh` exit 0 repeatedly (latest after the SVG ticket); plggpress 96 tests, plgg-view 129; guide build + dead-link gate green after the sidebar IA change; `tsc-plgg.sh` clean at HEAD.
- **Sign-off artifact:** https://claude.ai/code/artifact/ca418eda-ff9f-4f24-bef7-48b7a41bfbed (side-by-side vs the oracle; the sidebar-IA change postdates its screenshots — cosmetic staleness only).
- **Dev preview:** container `guide_guide_1` serves the branch live with the new IA (restarted 2026-07-03 ~14:00).

## Implementation Steps

1. **/report** on `work-20260703-050355`: standard flow. When judging deferred concerns, note two likely resolutions: `51-plggpress-visual-sign-off` (the sign-off artifact + the developer's iterative approvals of every visual change this branch) and the PR #52 concern about the Deploy Guide hard-coded build list (deploy-guide.yml now calls `./scripts/npm-install.sh` + `./scripts/build.sh` — no topology copy remains).
2. **/ship** (deploy-on-merge per `.workaholic/deployments/guide.md`): the merge re-triggers Deploy Guide; its green run + site probe (https://plgg.qmu.co.jp/ 200, new sidebar visible) is the confirmation. NOTE: the **slim run-tests gate ships on this very PR** — its green check run on the PR is the backstop gate's own proof; mention it in the story.
3. **At ship, complete the release-flow handover** (from the CI-minimum ticket's gate): `release.yml` is deleted on this branch, so after merge `publish-release.sh` publishes directly instead of deferring — follow `.workaholic/deployments/release.md` (CalVer tag scheme) on THIS ship, and **update the auto-memory** `reference_release_flow.md` (currently says CI-owned; becomes script-driven from /ship per the contract).
4. **Post-ship follow-ups (each needs its own /ticket):**
   - Heading-anchor `#`/`##`/`###` depth markers (OPEN item from the reconciliation; needs anchor-link markup in plgg-md's renderer — heading ids already exist, the TOC ticket's slugger is the source of truth).
   - Optional: port qmu's octocat SVG to the rail GitHub link (plgg-view's svg/path vocabulary now makes it possible; currently a vertical text label).
5. **Environment housekeeping (user-side or with explicit authorization):** `/tmp` is a 16GB tmpfs and `/tmp/.trash` held ~15GB (an rm→trash interceptor collects deletions there; qfs cargo target dirs dominate). This session purged only its own items; the rest awaits the developer. ENOSPC there corrupts in-flight command output (it silently ate a heredoc write once this session — re-verify artifacts after any ENOSPC).

## Considerations

- The snap-text-color motion model is a **deliberate divergence** from the oracle (developer decision 2026-07-03, spec-pinned) — future oracle re-diffs must not "fix" it back.
- plggmatic's dist freezes its re-export surface at build time: after ANY wrapped-library surface change, rebuild plggmatic or consumers see "does not provide an export named …".
- `site.config.ts` never hot-reloads on the dev preview; theme/content edits do. Dependency-graph changes need `--force-recreate --renew-anon-volumes`.
- The corporate repo (`../corporate`, branch `work-20260703-022248`) holds the shipped Cloudflare DNS Terraform stack — unrelated to this branch's ship, already applied.

## Quality Gate

**Acceptance criteria:** PR opened with the full 6-ticket story; slim gate green on the PR; merge confirmed by a green Deploy Guide run + site probe showing the five-section sidebar at https://plgg.qmu.co.jp/; a GitHub Release published by `publish-release.sh` per `.workaholic/deployments/release.md`; `reference_release_flow.md` memory updated. **Gate:** the ship's standard confirmation chain, plus the developer's merge consent as always.
