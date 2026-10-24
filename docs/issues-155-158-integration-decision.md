# Integration decision: issues #155–#158 and their PRs

Decision record, 2026-10-24. Covers the corpd consumer issues
[#155](https://github.com/qmu/plgg/issues/155),
[#156](https://github.com/qmu/plgg/issues/156),
[#157](https://github.com/qmu/plgg/issues/157) and
[#158](https://github.com/qmu/plgg/issues/158), and the open PRs #159–#180
that touch them. It fixes the merge order, the version bumps, the
consumer checks, and the condition under which each issue closes.

Evidence: PR bodies and head contents read with `gh` and `git show`,
`package.json` versions at each PR head, and pairwise
`git merge-tree --write-tree` dry-runs against `origin/main`. Nothing was
published, merged, or pushed to a PR branch.

Relation to [#176](https://github.com/qmu/plgg/pull/176): that PR is a
status ledger for the same four issues. This record reaches the same
code decisions, corrects two statements in #176 (below), and adds the
conflict map and close conditions. Keep one of the two when merging.

## Corrections to the status ledger (#176)

1. **#165 already closes #155.** Its body ends with `Fixes #155` and
   `Fixes #156`. #176 says it lacks `Fixes #155`, and the corpd comment
   on #155 says the same. Both are stale. No edit to #165 is needed for
   that.
2. **The publish step is pre-merge.** `.workaholic/deployments/npm.md`
   runs `publish-npm.sh` from the work branch before the merge, and it
   fires only when a version was bumped. So `plgg-view@0.0.3` has to be
   published from a branch that already contains #164 (see below), not
   after it lands.

## Where the PRs collide

Dry-run merges against `origin/main`, one pair at a time. Each conflict
is a textual conflict; the pair was not re-tested after resolution.

| Pair | Result | Where |
| --- | --- | --- |
| #165 × #173 | conflict | `scripts/check-all.sh` (both insert after `build.sh`) |
| #173 × #174 | conflict | `scripts/check-all.sh` |
| #173 × #179 | conflict | `scripts/check-all.sh` |
| #175 × #177 | conflict | `scripts/check-all.sh` (both insert after `gate-cross-runtime.sh`) |
| #164 × #166 | conflict | `plgg-view` `element.spec.ts`, `render.ts`, `render.spec.ts` |
| #165 × #166 | clean | (both change `package-lock.json`; auto-merged) |
| #160 × #165 | clean | |
| #160 × #163 | clean | |
| #163 × #165 / #173 | clean | |
| #174 × #175 | clean | |
| #177 × #179 | clean | |

`scripts/check-all.sh` is edited by #160, #163, #165, #173, #174, #175,
#177 and #179. Each gate is one appended block, so most conflicts are
about insertion point, not logic. Resolve them by keeping every gate and
keeping `build.sh` before `gate-cross-runtime.sh`.

## Integration order

Stage 0 — no overlap with the publish path, merge in any order:
#162 (dependabot ignore), #168 (residual-conditions doc), #169
(typecheck diagnostic), #176 or this record (docs), #178 (Node 24 Docker),
#160 (Node floor `>=22.13` for the `node:sqlite` packages), #159 then #161
(plgg-md autolinks; #161 is stacked on #159 and its base must move to
`main` after #159 lands), #163 (split-version gate).
Then #180, stacked on #168, after #168 lands.

Stage 1 — `plgg-bundle` path (issues #155, #156):
1. **#165** (bump `plgg-bundle` 0.0.6 → 0.0.7; `Fixes #155`, `Fixes #156`).
   It is the publish candidate for `plgg-bundle@0.0.7`.
2. **#173** (repeat-build gate, `Fixes #155`). Rebase onto #165; keep both
   gate blocks in `check-all.sh`.
3. **#179** (packed `plgg-bundle` under a TypeScript 7 consumer). Rebase
   onto #173.
4. **#174** (plgg tarball transpiled under a consumer TS 7). Rebase onto
   #179.

Stage 2 — Node 24 gates:
6. **#175** (public plgg tarball under Node 24 + consumer TS 7).
7. **#177** (public plgg-md tarball under Node 24 + consumer TS 7). Rebase
   onto #175; both insert after `gate-cross-runtime.sh`.

Stage 3 — `plgg-view` path (issues #157, #158):
8. **#166** (frame-batched `application` dispatch, `lazy()`; bumps
   `plgg-view` 0.0.2 → 0.0.3; `Fixes #157`).
9. **#164** (SVG shape builders and `raw` html reuse; `Fixes #158`). Rebase
   onto #166 and resolve the `render.ts` / `element.spec.ts` /
   `render.spec.ts` conflicts. Both edit `reconcile`'s region; #166 owns
   the lazy path and #164 owns the `raw` path.

Stage 3 must be complete before any `plgg-view` publish (see Publish).

## Version bumps

| Package | now on `main` | after this plan | Bumped by |
| --- | --- | --- | --- |
| `plgg-bundle` | 0.0.6 (npm: 0.0.6, has the bug) | 0.0.7 | #165 |
| `plgg-view` | 0.0.2 | 0.0.3 | #166 |

#164 has no version change. It must ship inside the same `plgg-view@0.0.3`
publish. npm does not allow re-publishing a version, so if 0.0.3 goes out
from #166 alone, #164 needs 0.0.4. Do not publish `plgg-view` until #164 is
in the same branch as the bump.

## Publish (developer-driven)

Publishing is a human step (`.workaholic/deployments/npm.md`). This
record does not publish. Sequence for the developer:

1. Ship `plgg-bundle@0.0.7` from the #165 branch, after `check-all.sh`
   is green with #173 and #179 included.
2. Ship `plgg-view@0.0.3` from a branch that contains #166 and #164.
3. Confirm each `name@version` resolves on the registry and that a scratch
   install imports it (`publish-npm.sh` does this).

## Close conditions

| Issue | Closes when | Not enough alone |
| --- | --- | --- |
| #155 EISDIR on a second run | `plgg-bundle@0.0.7` is on npm and a clean consumer runs `plgg-bundle` twice with no EISDIR | merging #165 or #173 |
| #156 consumer TS 7 breaks transpile | `plgg-bundle@0.0.7` on npm, a consumer with `typescript@7` builds, and corpd drops the `tsgo` alias | #165's own gate (it typechecks; #179 and #174 cover transpile) |
| #157 batching and `lazy` | `plgg-view@0.0.3` on npm, and corpd sees one render for several dispatches in one frame and `lazy` skipping `view`/diff | merging #166 |
| #158 SVG shapes and `raw` | `plgg-view@0.0.3` on npm, and corpd moves menu icons to typed builders with `.row > svg` placed correctly | merging #164 |

`Fixes #…` in a PR body closes the issue on merge. That can happen before
corpd's verification, because the registry check is not part of the merge.
If an issue closes early, reopen it until its close condition holds. Do not
rely on the keyword as the completion signal.

#158 has a residual gap that #164 does not close: `raw()` still wraps a
multi-node fragment in a `display:contents` `<span>`, and #164 leaves that
alone. The issue's own wording calls the no-wrap form optional
("できるとよい"), and corpd's plan is to stop using `raw()` for icons. So
the close condition is the builder migration, not the wrapper change. If
corpd needs `raw()` to be unwrapped, that is a new issue.

## Out of scope

Node 24 and TypeScript 7 conditions that outlive these four issues are
classified in the residual-conditions ledger from #168, extended by #180.
That file is not on `main` yet, so it is not linked here.

## Not done here

- No full sequential merge simulation. The table above is pairwise only;
  re-run the merges in the stated order and fix each conflict before
  shipping.
- Lockfile: #160, #165 and #166 all change `package-lock.json`. Pairs
  auto-merged, but regenerate the lockfile once after the last merge.
