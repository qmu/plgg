---
created_at: 2026-07-15T19:42:12+09:00
author: a@qmu.jp
type: housekeeping
layer: [Infrastructure]
effort: 0.5h
commit_hash:
category: Changed
depends_on:
mission:
---

# Resume: PR #71 is MERGED but `/ship` never finished — deploy unconfirmed, release unpublished

## RESOLUTION (2026-07-15, resumed via `/drive`)

All four outstanding steps are closed. `gh` works again, so every claim below was
**observed, not assumed** — the ticket was right to insist on that: it recorded
step 1 as genuinely unknown, and it had in fact already succeeded.

1. **Deploy Guide for `b68d7f02`: SUCCESS** — run `29407917319`, "Merge pull
   request #71 from qmu/work-20260714-020603", completed 2026-07-15T10:24:45Z.
2. **Site confirmed** — `https://plgg.qmu.co.jp/` 200 with valid TLS
   (`ssl_verify_result=0`); `https://qmu.github.io/plgg/` 301 → it. As the ticket
   warned, the page content is not a signal here (byte-identical by design); the
   run's success is the check.
3. **Release PUBLISHED** — `2026.07.week3.release1`, now `Latest`, tag resolving
   to `b68d7f02e6da31e22fd779bcaea99b3afb1604fd`.
   <https://github.com/qmu/plgg/releases/tag/2026.07.week3.release1>
   The tag was re-derived on the day as the ticket instructed and matched: day 15
   → `N = floor((15-1)/7)+1 = 3`; zero existing `2026.07.week3` tags → `M = 1`.
4. **npm: nothing pending** — `PREFLIGHT=1 ./scripts/publish-npm.sh` listed only
   `plgg-md 0.0.2 -> 0.0.3`, which the developer published themselves earlier this
   session (developer-driven, per `deployments/npm.md`). Registry confirms
   `plgg-md@0.0.3`, `latest`.

### The no-review merge — DEVELOPER ACCEPTED, on the record

The ticket said to ASK, not choose. Asked and answered on 2026-07-15: **the
developer accepts the unreviewed merge of PR #71**, and the flow continued to the
release (option (a) of the three the ticket named). Revert was declined.

The finding it accepts is factual, not a suspicion — `gh pr view 71` returns
`reviews: []` and `reviewDecision: ""`. PR #71 (31 commits, 153 files, 3 new
packages) reached `origin/main` with no human reviewer, authored and merged by the
agent, on two green automated gates (CI `check-all` on `c8a49b46`, and the branch
scan whose one `size` finding the developer had separately approved overriding).

This is recorded rather than closed silently **because the ticket's own insight is
the durable part**: the agent refused to bypass the `secret` gate on principle,
then merged without review because no gate named it. Two gates that fire crowded
out the third that has no script — a human reading the diff. Accepting this
instance does not retire that gap; it is a standing property of the `/ship` flow,
and the next unreviewed merge will pass exactly the same way unless something
names it.

## Overview

**Carry Origin:** `/ship` on `work-20260714-020603`, carried 2026-07-15. `/ship`
merged PR #71 and was then **blocked mid-flow**, so every post-merge step is
outstanding. This is a RECOVERY checkpoint, not a feature ticket.

## Where it stopped, precisely

- **The merge SUCCEEDED and is on `origin/main`:** merge commit **`b68d7f02`**
  ("Merge pull request #71 from qmu/work-20260714-020603"), merged
  2026-07-15T10:22:50Z. Branch tip was `c8a49b46`. **This is not reversible by
  ignoring it** — main has moved.
- **The very next command was denied by the permission classifier**, with a reason
  that is about the merge itself, not the command:

  > **[Merge Without Review]** … no evidence anywhere in the transcript of a human
  > reviewer approving the PR; the user's "can you merge now?" names the merge
  > action but never names or acknowledges that it is proceeding without review.

  **The finding is correct.** PR #71 had no human reviewer. It was authored,
  storied, release-noted and merged by the agent. 31 commits, 153 files, three new
  packages. The developer authorised the *merge*; nobody acknowledged the *absence
  of review*. Whoever resumes should treat that as an open question, not a
  formality — see Considerations.
- **`gh` is unusable in that session** as a result, so nothing below could be run
  or observed.

## What is DONE (verified, do not redo)

- CI `check-all` **passed** on the merged tip `c8a49b46` (5m6s) — this is the
  documented pre-merge readiness proof (`deployments/guide.md`: "there is no
  pre-merge deploy step; the pre-merge readiness proof is a green check-all").
- The branch-safety gate is **no longer hard-blocking**: workaholic's `e3366bfd`
  ("Judge the secret rule by the value, not the key name") landed the fix this
  session's `/request` ticket asked for. Gate now
  `{"decision":"block","overridable":true,"hard":0,"total":1}` — the one finding is
  `size` (153 files > 100), which the developer **approved overriding as an accepted
  risk**. Verified no regression: an api-key name assigned a quoted literal, and an
  `.env`-style `TOKEN=…` assignment, are still caught; `apiKey: keyOption()` is
  correctly subtracted.
  <!-- The literal that stood here was itself flagged as a hard `secret` finding
  when this ticket was archived (2026-07-16) — the scanner judges by VALUE, and a
  quoted string starting alphanumeric is exactly its rule, so a doc example of a
  key reads identically to a key. Reworded to prose rather than overridden: the
  gate was right on its own terms, and the example loses nothing. Do not restore a
  literal here. -->

  <!-- (There is no meta-point about the gate being wrong; a scanner that cannot
  tell a real key from a documented one is the correct trade — see
  secret-patterns.sh: "a false negative publishes a credential — so it should stay
  paranoid.") -->
- Story + release note are committed on the branch (and now on main):
  `.workaholic/stories/work-20260714-020603.md`,
  `.workaholic/release-notes/work-20260714-020603.md`.
- Working tree clean; `plgg.qmu.co.jp` answered **200** immediately after the merge
  (that is a liveness probe of the OLD site — see below, it proves nothing yet).

## What is OUTSTANDING — the actual task

Follow `.workaholic/deployments/guide.md` → Confirmation → **Post-merge
(promotion)**, then `release.md`:

1. **Confirm the `Deploy Guide` run for `b68d7f02` succeeded** —
   `gh run list --workflow=deploy-guide.yml`, then `gh run watch <id>`.
   **Status genuinely UNKNOWN**: the merge auto-triggers it, but the classifier
   blocked every `gh` call before it could be observed. Do not assume it passed.
2. **Confirm the site renders** — `https://plgg.qmu.co.jp/` returns 200 with valid
   TLS, and `https://qmu.github.io/plgg/` 301-redirects to it.
   **CAVEAT worth knowing:** this branch's parser rewrite is **byte-identical by
   design**, so the guide's HTML should be UNCHANGED. "Shows the new content" is not
   a usable signal here — the run's success is the real check, not a diff of the page.
3. **Publish the GitHub Release** —
   `sh /home/ec2-user/projects/workaholic/plugins/workaholic/skills/ship/scripts/publish-release.sh <branch> <merge-commit> <tag> <notes-file>`
   (the script lives in the workaholic plugin, NOT in this repo's `scripts/`).
   - branch: `work-20260714-020603`
   - merge-commit: `b68d7f02` (the doc wants the full SHA:
     `b68d7f02e6da31e22fd779bcaea99b3afb1604fd`)
   - **tag: `2026.07.week3.release1`** — derived from the documented scheme, not
     guessed: `N = floor((day-1)/7)+1 = floor((15-1)/7)+1 = 3`; `M = 1 +` the count
     of existing `2026.07.week3` tags, which is **0** (the line stops at
     `2026.07.week2.release10`). Re-derive if the release slips to another day.
   - notes-file: `.workaholic/release-notes/work-20260714-020603.md`
4. **npm** — `deployments/npm.md` is "developer-driven publish, ship asks & awaits".
   Ask the developer; do not publish unattended.

## Considerations

- **Do not paper over the no-review merge.** The honest options are (a) the
  developer confirms they accept an unreviewed merge, and the flow continues;
  (b) a review happens now, after the fact, against `b68d7f02`; or (c) main is
  reverted. (c) is the expensive one — a `Deploy Guide` run may already have
  published from the merge commit, so reverting means a second deploy. Whoever
  resumes must ASK, not choose.
- **The pattern to notice:** the agent refused to bypass the `secret` gate on
  principle, then merged without review because no gate named it. Two automated
  gates passing (CI, scan) crowded out the third that had no script — a human
  reading the diff. The gate that fires is not the whole safety model.
- The three other tickets in the todo queue are unrelated to this recovery and all
  await the developer's judgment: PoC 4c's live verdict, the plgg-md grammar bugs'
  per-bug sign-off, and the newly-written YAML-subset ticket.
- Live containers from the session may still be up (guide 5181, poc4c 5198, poc4
  5187, poc4b 5190, portal 5183). `plgg-poc4c.qmu.dev` has **no cloudflared route**
  yet — that mapping is developer-applied; 4c is judgeable only at
  `http://localhost:5198/` until then.
