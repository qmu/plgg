# Status table: issues #155–#158, #168, #176

Status as of 2026-10-24, reconciled against the open PRs on
`qmu/plgg` and the npm registry state recorded in the issues.
Supersedes the table in #176 (which is stale on one point, see
below). It adds no code.

**npm state was not re-queried.** The sandbox could not reach the
npm registry (`npm view` and WebFetch were denied), so the
"published" column records what the issues and PR bodies say, not a
fresh check. Re-run `npm view <pkg> version` before closing any issue.

## Table

| Item | Met by open PR (state) | Published on npm | Not yet done |
| --- | --- | --- | --- |
| #155 `plgg-bundle` EISDIR on second run | `relocate.mjs` already removed on `main` (5b109cec). #165 bumps `plgg-bundle` 0.0.6 → 0.0.7 and says `Fixes #155` and `Fixes #156`. #173 adds a repeat-build gate (`Fixes #155`); its `check-all` run is currently **failing** | 0.0.6 (the version with the bug). 0.0.7 not confirmed | Fix #173's `check-all` failure. Merge #165. Publish 0.0.7. Corpd runs the bin twice in one directory on 0.0.7 |
| #156 `plgg-bundle` resolves consumer TS 7 | Same fix as #155, in #165 (`Fixes #156`). #165 also adds `gate-bundle-npm-consumer.sh` | Same as #155 | Publish 0.0.7. Corpd builds with consumer `typescript@7` and removes the `tsgo` alias workaround |
| #157 `plgg-view` frame batching and `lazy` | #166 (`Fixes #157`), bumps `plgg-view` 0.0.2 → 0.0.3 | 0.0.2 is the version in `main`. 0.0.3 not confirmed | Merge #166. Publish 0.0.3. Fix the guide's "no keyed-list reconcile" row (#166 edits that page) |
| #158 `plgg-view` SVG shapes and `raw` reuse | #164 (`Fixes #158`). No version bump. Edits `element.ts` and `render.ts`, which #166 also edits | Rides on the same `plgg-view` release as #157 | Rebase #164 after #166 (conflict expected). Publish once with #166. Corpd replaces `raw` icons and checks `.row > svg` |
| #168 Node 24 / TS 7 conditions outliving #155–#158 | Docs PR, open, CI green. Its items map to: #160 (engines floor), #162 (hold TS majors back), #163 (split-version gate), #178 (Node 24 in Docker workloads), #183 and #184 (packed `plgg-test` gate). Node 24 is not yet the CI matrix | n/a | CI still pins Node 22 (needs workflow-scope token). Gate that checks TS 7 API surface, not version strings. Generalise engines floor. Update `infrastructure.md` |
| #176 status ledger for #155–#158 | Docs PR, open, CI green. Says #165 lacks `Fixes #155`; that is **out of date**, #165 has it | n/a | Superseded by this table. Overlaps #181 and #182 |

## Items that no open PR covers

- Publishing `plgg-bundle` 0.0.7 and `plgg-view` 0.0.3. This is a
  gated release step (see `.workaholic/deployments/npm.md`). It needs a
  person with npm rights.
- Corpd verification on the published versions. Issues #155–#158 close
  only after this.
- Node 24 in the CI matrix (#168 item A).

## Duplicate docs

Four open PRs record overlapping status for the same issues: #168,
#176, #181, #182. Keep one. This table is the reference; the others
can close once it merges, or be merged into it by a reviewer.

## Merge order

1. Fix #173's `check-all` failure, or drop #173 (#165 already carries
   the `Fixes #155` close).
2. #165 (version bump, `Fixes #155` and `Fixes #156`).
3. #166, then rebase and merge #164.
4. Publish `plgg-bundle` 0.0.7 and `plgg-view` 0.0.3 (human, gated).
5. Corpd verifies on the published versions. Close #155–#158.
