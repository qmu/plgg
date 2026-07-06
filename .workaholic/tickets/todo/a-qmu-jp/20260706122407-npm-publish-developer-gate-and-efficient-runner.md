---
created_at: 2026-07-06T12:24:07+09:00
author: a@qmu.jp
type: enhancement
layer: [Infrastructure, Config]
effort: 4h
commit_hash:
category: Changed
depends_on: []
---

# npm publish becomes a developer-driven, PRE-merge gate (only when a version is bumped) + `publish-npm.sh` refined for efficient release

## Overview

At `/ship`, npm publishing is currently an **agent-executed, publish-if-newer** step declared in `.workaholic/deployments/npm.md` as running *post-merge, after the GitHub Release*. When no package version is bumped it is a **silent no-op** — which is exactly what happened on PR #60: the branch merged to `main` and the guide deployed with **zero signal about npm** and no prompt to the developer. The developer's instruction: *"you should ask me to npm publish first and after my publish you continue"* — npm publish must become an **explicit, developer-driven, ask-and-await gate that runs BEFORE the merge**, and it must **only fire when a package version was actually bumped**.

Two coupled parts (implement together — the "only when bumped" pause depends on the bump-detection the refined script provides):

**Part 1 — Process/contract (developer-driven PRE-merge gate).** Rewrite `npm.md` so the **developer** is the actor and `/ship` is the requester/waiter: when a bumped package is detected, the ship **pauses before the merge**, asks the developer to run the publish themselves, **waits** for the developer to confirm the publish is done, then runs the post-publish verification, records the outcome, and only then continues to the merge (which is the deploy-on-merge guide deploy) + GitHub Release. When nothing is bumped, no prompt is raised and the ship notes "nothing to publish."

**Part 2 — Script efficiency (`publish-npm.sh`).** Refine the canonical runner so a release is cheaper to run: (a) target **only bumped packages** (local version newer than the registry) instead of walking/building every package; (b) print a **preflight** listing which packages will publish at which versions before doing anything; (c) **de-duplicate the gate/build** — reuse a green `check-all.sh` from the same ship session (existing `SKIP_GATE=1`) and avoid rebuilding dists that are already fresh. The staged `file:`-rewrite, publish-if-newer idempotency, and per-package online verification semantics are preserved.

## Decisions (recorded from the Quality-Gate interrogation)

1. **Ordering: PRE-merge.** The developer-driven publish pause sits **before** the merge — ship asks → developer publishes from the branch → developer confirms → ship verifies + records → **then** merges (guide deploy-on-merge) + publishes the GitHub Release. This is a deliberate change from today's post-merge contract wording and must be stated explicitly in `npm.md`, reconciled with ship's "merge last, confirmation-gated" essence (the pre-merge publish IS a branch-level production action, gated before the irreversible merge).
2. **Trigger: only when a version is bumped.** The ship raises the npm prompt **only** when at least one non-private package's local `version` exceeds the registry version. No bump ⇒ no prompt; the ship records "nothing to publish." (Not "every ship.")
3. **Actor: the developer runs the publish.** The ship does not auto-run the publish; it asks the developer to run `scripts/publish-npm.sh` (backgrounded to a log — npm hangs on some capture pipes) and waits for confirmation.
4. **Verification + audit stay.** After the developer's publish, the ship still runs the post-publish confirmation (`npm view` + scratch-dir install/import) and **records the outcome** (versions published, or "nothing to publish") into the story/PR so the ship is auditable — replacing the evidence-free silent skip.
5. **Canonical script only.** The command the developer runs is the canonical `scripts/publish-npm.sh`; no ad-hoc `npm publish` that bypasses the staged `file:`-rewrite + verification.
6. **Script efficiency scope:** bump-only targeting + preflight display + gate/build de-duplication (NOT post-publish-verification parallelization — deliberately out of scope this round).

## Policies

- `workaholic:operation` / `policies/ci-cd.md` — **central**. The developer-driven pause is the human-in-the-loop control for an effectively **irreversible** action (npm forbids re-publishing a version; unpublish is a restricted 72h window). It directly fixes the policy failure the developer flagged: *treating a green process as proof absent any evidence of what happened* (the silent no-op merge). Releases stay bracketed by verification (pre: `check-all.sh` green; post: `npm view` + scratch install) and **linked to change history** (record the publish outcome in the story/PR). Credentials remain runtime-only (ambient `~/.npmrc`, never in `npm.md` or the script).
- `workaholic:implementation` / `policies/command-scripts.md` — one canonical runner; the efficiency refinement **adjusts `publish-npm.sh`**, it does not add a parallel script. The build topology must keep deriving from `build.sh` (never fork a second copy — the deploy-guide.yml PR #51 drift is the cautionary precedent).
- `workaholic:implementation` / `policies/coding-standards.md` + `policies/directory-structure.md` — house sh style (`#!/bin/sh -eu`, `REPO_ROOT=$(git rev-parse --show-toplevel)`); release logic lives in `scripts/`.
- `workaholic:design` / `policies/vendor-neutrality.md` — zero new dependencies (npm + node + existing scripts only; no changesets/lerna/np).

## Key Files

- `.workaholic/deployments/npm.md` — **PRIMARY change surface (Part 1).** Rewrite `## Procedure` (developer is actor; ship asks + pauses + waits; PRE-merge; only-when-bumped), keep/clarify `## Confirmation` (runs after the developer's publish), retitle the frontmatter/tagline from "script-driven from /ship" to "developer-driven manual publish (ship asks & awaits)". `confirmation_method` stays `api-probe` (the post-publish check is unchanged; developer-actor semantics live in the Procedure prose — there is no frontmatter actor field).
- `.workaholic/deployments/index.md` — update the npm link label ("script-driven from /ship" → "developer-driven …") to match the retitled contract.
- `scripts/publish-npm.sh` — **change surface (Part 2).** Bump-only targeting, preflight listing, gate/build de-duplication; preserve staged `file:`-rewrite, publish-if-newer, per-package verification, `--tag latest` (past the 1.0.0 ghost), and log-redirect note.
- `scripts/build.sh` — owns the dependency topology the publish order must keep deriving from (do not fork a second copy).
- `scripts/check-all.sh` — the pre-publish gate; the de-dup reuses a same-session green run via `SKIP_GATE=1`.
- `.workaholic/deployments/release.md` — sibling GitHub Release contract (context: the GitHub Release still publishes at/after merge; only npm moves pre-merge).

## Scope boundary (plgg-owned vs upstream)

The plgg repo owns the two amendable artifacts (`npm.md` contract + `publish-npm.sh`). The `/ship` **flow mechanics** (how it displays a Procedure, issues `AskUserQuestion`, pauses) live UPSTREAM in the `workaholic` plugin and are out of scope for this plgg ticket. This is workable because the ship SKILL already executes the matched target's `## Procedure` literally and has a confirm-before-deploy (`AskUserQuestion`) gate — so **encoding "ship must ASK the developer to publish and WAIT, pre-merge, only when bumped" as `npm.md`'s `## Procedure` prose is sufficient** to change behavior with no plugin change. If, during `/drive`, the contract-prose approach proves insufficient (e.g. the ship agent can't reliably honor a "developer-driven, wait-for-human" procedure and needs a first-class `manual`/`developer-driven` `confirmation_method` or a pre-merge ordering hook), that is an **out-of-repo follow-up in the workaholic plugin** — record it as a deferred concern, do not expand this ticket into the plugin.

## Quality Gate

**Acceptance — all of the following must hold** (developer-selected):

1. **Contract rewritten** — `npm.md` `## Procedure`/`## Confirmation`/title express: developer is the actor; ship ASKS + PAUSES + WAITS; **PRE-merge**; **only when a version is bumped**. `index.md` label synced to the developer-driven model.
2. **Post-publish verification + record kept** — after the developer's publish, the ship runs `npm view` + scratch install/import and records the outcome (published versions, or "nothing to publish") into the story/PR.
3. **Canonical script only** — the process names `scripts/publish-npm.sh` (backgrounded to a log) as the command the developer runs; no ad-hoc `npm publish`.
4. **Script efficiency delivered** — `publish-npm.sh` targets only bumped packages, prints a preflight of what will publish before acting, and de-duplicates the gate/build against a same-session green `check-all.sh`; existing safety semantics (staged `file:`-rewrite, publish-if-newer, per-package verification) preserved.

**Verification method (no automated test — it is a Markdown contract + shell script):**

- **Walkthrough (contract):** a documented dry-run of the amended `/ship`, showing the flow **pauses → asks → waits → verifies → records**, pre-merge, and does so **only** when a bump exists (and stays silent + notes "nothing to publish" when none does).
- **Script (executable checks):** `sh -n scripts/publish-npm.sh` passes; a **no-bump run** publishes nothing and exits cleanly after the preflight shows an empty publish set; a **simulated single-bump run** shows a preflight listing exactly that one package/version and targets only it (verify without an actual publish where possible, e.g. via the preflight/dry-run path, so the gate does not require a real irreversible publish). `check-all.sh` stays green.
- **Edge cases to cover:** no bump at all (silent, recorded as "nothing to publish"); exactly one package bumped; multiple packages bumped in dependency order; a package private/skipped; the developer declines/aborts at the pause (ship must NOT merge — the branch stays open, mirroring ship's confirmation-gate rollback); `~/.npmrc` auth absent (fail clearly, no secret written anywhere).

## Out of scope / Notes

- Post-publish-verification parallelization/speedup (deliberately deferred — decision 6).
- Any change to the `workaholic` ship plugin (see Scope boundary — contract-prose is the plgg-side mechanism; plugin work is a flagged follow-up only if needed).
- Versioning policy itself is unchanged (independent per-package semver; releasing = bump `version` on a branch — this ticket only changes *how* that bump is turned into a publish at ship time).
- Cross-refs: origin ticket `archive/work-20260703-050355/20260703153000-npm-publish-canonical-runner.md` (created `publish-npm.sh` + `npm.md`); memory `reference_release_flow`, `feedback_command_scripts_policy`.
