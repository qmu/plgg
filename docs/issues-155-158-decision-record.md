# Decision record: issues #155–#158 and their open PRs

2026-10-25, updated 2026-10-25 (second pass). Covers the four corpd
consumer requests — [#155](https://github.com/qmu/plgg/issues/155)
(plgg-bundle: EISDIR on a second app build),
[#156](https://github.com/qmu/plgg/issues/156) (plgg-bundle: relocate
pulls in the consumer's TypeScript instead of its own),
[#157](https://github.com/qmu/plgg/issues/157) (plgg-view: frame batching
+ `lazy()`), and [#158](https://github.com/qmu/plgg/issues/158)
(plgg-view: typed SVG shape elements + non-destructive `raw()` diffing) —
and the open PRs that implement, gate, publish-verify, or close them:
#164, #165, #166, #173, #179, #189, #190, #196, #211, #212, #213, #214,
#216, #217, #218, #219, #220.

The **second pass adds #213, #214, #216, #217, #218, #219, #220** — all
opened *after* the first pass of this record, which only knew about
#164–#212. The most consequential new fact: #216 (opened 8 minutes after
this record's first pass) **supersedes #164 and #196**, and collides
with #166 on the `plgg-view` version bump (both propose `0.0.3`) — see
"Where the PRs collide" and the revised Track B order below.

Evidence: `gh pr view --json body,files,mergeable,mergeStateStatus` for
each PR above, `git show <pr-head>:<path>` for real file contents (not
just titles), and `git merge-tree --write-tree` dry-runs between PR heads
and `origin/main` to find real textual conflicts. Nothing was merged,
published, or pushed to any PR branch while writing this.

## Relation to other status/ledger PRs

Four earlier docs-only PRs record overlapping status for the same four
issues: [#168](https://github.com/qmu/plgg/pull/168),
[#176](https://github.com/qmu/plgg/pull/176),
[#181](https://github.com/qmu/plgg/pull/181), and
[#182](https://github.com/qmu/plgg/pull/182), plus
[#185](https://github.com/qmu/plgg/pull/185) which already tried to
consolidate #168/#176/#181/#182 into one table. None of the five is
merged. #181 is the most accurate of the five (it already corrects a
stale claim in #176) but it was written against PRs #159–#180 only, so it
does not know about #189, #190, #211, or #212 — all opened after it. This
record **supersedes #176, #181, #182, and #185 for the #155–#158 scope**;
once this merges, close those four rather than merging them. #168's
broader Node 24 / TypeScript 7 ledger (extended by #180) is a separate,
wider concern — see "Out of scope" below — and is not superseded here.

Six more PRs were opened after this record's first pass, each checking
the others before submitting and each filling a gap the earlier ones
left open rather than duplicating them:

- **#213** — a pre-publish acceptance gate (`gate:corpd-consumer`) that
  packs the four implementation PRs' candidates and runs them through an
  isolated Node 24 / TypeScript 7 consumer. Confirmed (on a temporary,
  not-proposed worktree) that #164+#166+#189 together pass; confirmed a
  plain `main`-based tarball still fails, as expected.
- **#214** — a post-publish producer (`gate:published-completion`) that
  inspects the *actual* npm registry and writes
  `docs/published-completion.json`. Its live run found `plgg-bundle@0.0.6`
  / `plgg-view@0.0.2` still on the registry, 1/6 checks passing,
  `complete:false` — the only real registry data point in this whole
  cluster.
- **#217** — a post-publish *boundary* gate (`gate:postpublish`) that
  reads a `release-plan.json`, confirms each fix's ancestry is actually
  on `main` (not just claimed), cross-checks npm `latest`/`gitHead`
  against the plan, and returns a fixed rollback target on mismatch. Its
  live run against #212/#189/#166/#216's current heads returned
  `FIX_NOT_IN_MAIN` for all four, as expected pre-merge.
- **#218** — a consumer-*parity* gate (`gate:consumer-parity`) that takes
  one integration SHA and reruns #213's candidate probe and #214's
  published probe side by side, byte-comparing the actual tarballs. Its
  run returned `prerequisite-gates-unavailable` while #213/#214 remain
  open, as expected.
- **#220** — a tag-binding reader (`publishedTagLedger`) that takes
  #214's ledger and checks it against npm's current `latest` dist-tag and
  live metadata, catching the case where the tag moves after #214 last
  ran. Its live run found `plgg-bundle@0.0.6`, `plgg-view@0.0.2`,
  `plgg@0.0.27` all tag-consistent, but still refused `complete:true`
  because the underlying consumer checks (#213/#214) are not yet
  passing.
- **#219** — a static, machine-readable close ledger
  (`docs/issues-155-158-close-ledger.json`) with one entry per issue:
  implementing PR, required vs. published version, the exact
  `{check, command, expect, status}` tuples a developer or script can
  re-run, and the rollback condition. Every `status` is `"pending"` —
  it asserts nothing is done yet. This is the one PR in the cluster that
  plays the same role as this record's own "Close conditions" table
  below, in a form a script can consume; treat the two as companions,
  not duplicates — keep the table here in prose for people, keep
  `#219`'s JSON for gates.

None of #213/#214/#217/#218/#219/#220 duplicates another's gate, bumps a
package version, merges anything, publishes anything, or closes an
issue. They form a read-only verification pipeline layered *on top of*
the two implementation tracks below — see "Consumer confirmation &
close pipeline" for the order they run in and where to resume each on
failure.

## Current state on `main`

- `packages/plgg-bundle/package.json` is still `"version": "0.0.6"` — the
  version npm serves today, with both bugs.
- `bin/relocate.mjs`, the file both #155 and #156 point at, no longer
  exists on `main`: commit `5b109cec` ("Remove plgg-bundle relocate.mjs,
  run from dist") already deleted the relocate-and-symlink step and made
  the CLI self-bundle to `dist/cli.es.js`. That is the structural fix for
  the symlink-EISDIR crash (#155) and for the wrong-`node_modules`
  resolution (#156) that `relocate.mjs` caused. **But this fix has never
  been published** — 0.0.6 on npm predates it, so corpd is still carrying
  the one-shot workaround described in both issues.
- A second, narrower TypeScript-resolution bug survives *after* that
  removal: declaration (`.d.ts`) emission in
  `packages/plgg-bundle/src/domain/usecase/emitDts.ts` still resolved
  `typescript` by walking up from a `require.resolve` done at the
  package's own root, which does not reliably pick the package's own
  nested `typescript@6` over a consumer's top-level `typescript@7` in
  every layout. This is what PR #189 fixes (below). #156 is not fully
  closed by `5b109cec` alone.
- `packages/plgg-view/package.json` is still `"version": "0.0.2"`.

## What each PR actually contains

Read from `git show <pr-head>:<path>`, not from titles:

**plgg-bundle track (#155, #156):**

| PR | Real content | Touches |
| --- | --- | --- |
| #189 | Source fix: centralizes consumer-vs-own `typescript` resolution into `vendors/consumerCompiler.ts` and uses it from `emitDts.ts` and `vendors/nodeProc.ts`. Closes the residual #156 declaration-path gap left after `5b109cec`. Adds `scripts/gate-bundle-declarations-consumer.sh`. | `emitDts.ts`, `consumerCompiler.ts` (+spec), `nodeProc.ts`, `check-all.sh`, new gate script |
| #179 | Test-only: packs `plgg-bundle`, installs it into an isolated TypeScript 7 fixture consumer, and asserts the app build works. No source change. | `check-all.sh`, new `gate-bundle-ts7-consumer.ts` + fixtures |
| #212 | Version bump 0.0.6 → 0.0.7, a repeat-build regression spec (`bundle-repeat-build.spec.mjs`: packs and installs the app build twice into a scratch consumer and asserts the second run doesn't throw EISDIR), a publish smoke test (`smokeBundle.ts`/spec), and amends `.workaholic/deployments/npm.md`'s Confirmation step to require that second-build check before accepting a `plgg-bundle` publish. States it merges/consolidates #190 and #211. | `package.json`, `package-lock.json`, `check-all.sh`, `.workaholic/deployments/npm.md`, `scripts/publish.ts`, new `bundle-repeat-build.spec.mjs`, `smokeBundle.ts`(+spec) |
| #165 | Same 0.0.7 bump, plus its own `gate-bundle-npm-consumer.sh`. Body already carries `Fixes #155` and `Fixes #156`. | `package.json`, `package-lock.json`, `check-all.sh`, new `gate-bundle-npm-consumer.sh` |
| #211 | Same 0.0.7 bump, same `smokeBundle.ts`/spec and `npm.md` edit as #212 (#212 is its superset). | `package.json`, `.workaholic/deployments/npm.md`, `publish.ts`, `smokeBundle.ts`(+spec) |
| #190 | Test-only repeat-build spec (`bundle-repeat-build.spec.mjs`), folded into #212. | `bundle-repeat-build.spec.mjs` |
| #173 | Test-only repeat-build gate, shell-script form (`gate-bundle-repeat-build.sh`), the same concern as #190/#212 but a different, now-redundant implementation. | `check-all.sh`, new `gate-bundle-repeat-build.sh` |

**plgg-view track (#157, #158):**

| PR | Real content | Touches |
| --- | --- | --- |
| #166 | Source fix for #157: batches `application`'s dispatch→view→diff into one animation frame (sync mode selectable for tests), adds `lazy()` to skip re-running `view`/diff when its argument is referentially unchanged. Proposes bumping `plgg-view` 0.0.2 → 0.0.3. Fixed two real bugs caught by its own CI (a scheduler bookkeeping bug and a stale-arg lazy-diff bug). `Fixes #157`. **Now collides with #216 on the 0.0.3 version number** (see "Where the PRs collide" and the revised Track B order below); must be rebased and re-versioned to 0.0.4. | `element.ts`, `render.ts` (+both specs), `Html.ts`, `application.ts`, `effects.ts`, `collectCss.ts`, `foldHtml.ts`, `mapHtml.ts`, `client.ts`, `package.json`, guide doc |
| #216 | **Supersedes #164 and #196.** Source fix for #158: exports typed `rect`/`circle`/`ellipse`/`line`/`polyline`/`polygon`/`g` builders rendered in the SVG namespace, preserves unchanged `raw(html)` DOM (including raw children under reordered keyed rows), removes `patchKeyed`'s unreachable raw-comparison branch, and includes #196's `asSvgNumberList` caster. Bumps `plgg-view` 0.0.2 → 0.0.3. CI-green on its final head (`d8056527`); staged a pack/install dry-run against registry `plgg@0.0.27` under consumer TS7. `Fixes #158`. Not published yet — no authenticated npm session in the sandbox that produced it. | `element.ts`, `render.ts` (+both specs), `patchKeyed`, `asSvgNumberList`, test-DOM default namespace, `package.json` + lockfile, guide/example |
| #164 | Source fix for #158, same scope as #216 but without the keyed-raw fix or the caster. **Superseded by #216** — recommend closing without merging once #216 lands. | `element.ts`, `render.ts` (+both specs), `plgg-test` DOM env file |

`#196` ("asSvgNumberList caster") was written against issue **#167**, a
different plgg-view issue, not #158 — but #216 folded its caster
wholesale into the #158 implementation. **Superseded by #216** for this
scope; #167 itself is unaffected and stays open on its own merits.

## Where the PRs collide

`git merge-tree --write-tree` against `origin/main` and between PR heads:

| Pair | Result | Where |
| --- | --- | --- |
| #189 × #179 | conflict | `scripts/check-all.sh` (both append a gate line) |
| #179 × #212 | conflict | `scripts/check-all.sh` |
| #189 × #212 | conflict | `scripts/check-all.sh` |
| #164 × #166 | conflict | `packages/plgg-view/src/Html/model/element.spec.ts`, `Program/usecase/render.ts`, `render.spec.ts` |
| #216 × #166 | conflict (same fields) | `packages/plgg-view/package.json` version (`0.0.3` claimed by both), `element.spec.ts`/`render.ts`/`render.spec.ts` (same logic overlap as #164×#166, since #216 carries #164's SVG/raw path) |
| #165 × #212 | conflict (same fields) | `packages/plgg-bundle/package.json` version, `check-all.sh` |

Every `check-all.sh` conflict is additive — each PR appends one line
calling its own new gate script — so resolving them means keeping every
appended line, not picking a side. The `plgg-view` conflicts are real
logic overlap: #166 owns the frame/lazy path through `render.ts`; #216
(superseding #164) owns the SVG/`raw` path through the same file; both
edits must survive the rebase. #216's version bump makes it the one that
should own `0.0.3` (see Track B order below) — #166 rebases on top and
takes `0.0.4`, not the reverse, because #216 is further along
(CI-green on a final head, pack/install dry-run already run) while #166
predates it and has not been re-validated since.

## Dependency / integration order

The two tracks are independent packages with no file or registry
overlap (`plgg-view`'s only internal dependency is `plgg`, not
`plgg-bundle`) and can proceed in parallel.

**Track A — plgg-bundle (#155, #156), merge in this order:**

1. **#189** — merge first; it is the only PR with the actual source fix
   for the residual #156 declaration-resolution gap, and it touches no
   file any other PR in this track needs to have landed first.
2. **#179** — rebase onto #189 (trivial `check-all.sh` conflict: keep
   both appended lines); adds the TS7-consumer app-build gate that
   proves #156 is closed from the app side too.
3. **#212** — rebase onto #179 (trivial `check-all.sh` conflict); carries
   the 0.0.7 bump, the repeat-build regression spec that proves #155 is
   closed, and the `npm.md` amendment that makes that check mandatory
   before the next `plgg-bundle` publish is accepted.
4. **Close #165, #173, #190, #211 without merging.** #165's 0.0.7 bump
   and gate are superseded by #212's; #173's and #190's repeat-build
   specs are superseded by #212's `bundle-repeat-build.spec.mjs`; #211 is
   a strict subset of #212 (its own title says #212 "merge[s] #190 +
   #211"). Merging any of the four alongside #212 would re-collide on
   `package.json`'s version field and `check-all.sh` for no new coverage.

**Track B — plgg-view (#157, #158), merge in this order (revised):**

1. **#216** — merge first, not #166. #216 supersedes #164 and #196,
   already carries the `0.0.3` bump, and is the more validated of the
   two version-bump claimants (CI-green final head, pack/install dry-run
   against the live registry). Close #164 and #196 without merging once
   #216 lands — see "What each PR actually contains" above.
2. **#166** — rebase onto #216 and bump its own `package.json` to
   `0.0.4` (not `0.0.3` — that number is now #216's). Resolve the
   `element.spec.ts` / `render.ts` / `render.spec.ts` conflicts by
   keeping both #216's SVG-namespace/`raw`/keyed-raw changes and #166's
   frame/`lazy` changes in the merged file. This is the opposite landing
   order from this record's first pass, which assumed #166 owned the
   version bump before #216 existed.

Integration condition for both tracks, before merging any PR in the
sequence: `scripts/check-all.sh` green on the rebased branch (covers
`scripts/tsc-plgg.sh`'s whole-repo typecheck and `scripts/test-plgg.sh`),
including the new gate scripts each PR adds. None of #164/#166/#179/
#189/#212/#216 could run `npm`/`node` directly in the sandbox that
produced them; each relied on its own CI run (`run-tests.yml`) as the
real gate.
Re-run `check-all.sh` after each rebase in this record — a clean
pairwise dry-run is not the same as a green gate on the combined tree.

## npm publish order

Per `.workaholic/deployments/npm.md`: publish is a **developer-driven,
pre-merge** step. The agent's `/ship` preflight (`PREFLIGHT=1
./scripts/publish-npm.sh`) only detects a version bump already sitting
in a branch's `package.json`; it never decides what to bump. So the
publish step for each track happens only once Track A's branch (through
#212) or Track B's branch (through #216 rebased-onto by #166) exists
with the bump already in place — not before.

1. **plgg-bundle@0.0.7**, from the branch that already contains #189 +
   #179 + #212. Do not publish 0.0.7 from #165 or #211 alone — npm
   forbids re-publishing the same version number, so if 0.0.7 ships
   before #189's declaration fix or #212's repeat-build regression test
   are in the same tree, the only way to add them afterward is a second
   bump to 0.0.8.
2. **plgg-view@0.0.3**, from the branch that already contains #216
   alone (its own `Fixes #158`, superseding #164/#196) — publish this
   first since #216 is already further validated. **Then
   plgg-view@0.0.4**, from the branch that already contains #166
   rebased onto that same #216 tree with its own `package.json` bumped
   to `0.0.4`. Revised from this record's first pass, which assumed one
   `0.0.3` publish covering both #166 and #164 — that is no longer
   possible since #216 (not #164) now owns `0.0.3`, and #166's fix is
   independently useful enough to ship as its own `0.0.4` rather than
   wait on a second rebase.
3. The three publishes (`plgg-bundle@0.0.7`, `plgg-view@0.0.3`,
   `plgg-view@0.0.4`) have no dependency on each other or shared file
   between packages, but `plgg-view@0.0.4` does depend on
   `plgg-view@0.0.3` already being on `main` (it rebases onto it) — so
   within the view track the order is fixed even though it can run in
   parallel with the bundle track's `0.0.7`.
4. After each publish, the Confirmation step in `npm.md` runs
   automatically (`npm view <name>@<version>` resolves, a scratch
   install + `import()` succeeds, and for `plgg-bundle` — once #212 is
   in — the second-build regression check specifically). Record the
   published `name@version` pair in the PR/story before merging.

## Rollback on failure

- **Before the developer runs `publish-npm.sh`:** nothing has left the
  branch. Declining the ask-and-wait step at `/ship` leaves the PR
  unmerged — per `npm.md` this decline *is* the rollback path; no
  registry or `main` state needs to be undone.
- **After publish, before merge, if the Confirmation check fails**
  (registry doesn't resolve within the poll window, or the scratch
  install/import/`--help` check fails): npm does not allow deleting or
  re-publishing the same version. Bump to the next free version — 0.0.8
  for plgg-bundle; for plgg-view, 0.0.4 **only if** #166 has not yet
  claimed it (re-check #219's ledger / the registry `latest` dist-tag
  first), otherwise 0.0.5, since #216 and #166 are two separate publishes
  now and a failed-and-retried #216 publish must not collide with #166's
  already-planned 0.0.4 — fix whatever the Confirmation check caught,
  and re-run the full procedure from preflight. Do not merge the PR that
  staged the failed version; its `package.json` must move to the new
  version number before it can merge.
- **After merge:** the merge and the GitHub Release are downstream of a
  passed Confirmation, so there is no planned rollback path from "merged
  but broken" other than the normal one — open a new fix, bump again,
  publish again. This record does not change that.
- **If a Track A or Track B PR fails `check-all.sh` after rebase** (new
  conflict-resolution regression): fix it on the branch before
  proceeding to the next PR in that track's order; do not merge a red
  branch and do not let it block the other, independent track.

## Consumer confirmation & close pipeline

Six more gates/ledgers (added after this record's first pass) sit
between "merged to `main`" and "issue closed." Run them in this order;
each step names where to resume if it fails, matched to what its own PR
body already reported from its last real run against current open-PR
heads (none integrated yet, so every step below is expected to fail
today — that is not a defect in the gates, it is the correct
not-yet-integrated signal).

1. **Integrate** each track per "Dependency / integration order" above
   (Track A through #212; Track B through #216 then #166-on-#216). —
   *Resume point on failure:* fix the failing rebase/`check-all.sh` on
   that track's branch; do not advance to step 2 for that track.
2. **#213 candidate gate** (`npm run gate:corpd-consumer`) against the
   integrated branch, before any publish. Its own run against
   `main`-only code correctly failed (frame/lazy not integrated); it
   passed on a temporary worktree combining #164+#166+#189. — *Resume
   point on failure:* the implementation itself is wrong or incomplete;
   fix it on the track branch and re-run step 1's `check-all.sh` before
   retrying this gate. Do not publish while this gate is red.
3. **Publish** per "npm publish order" above
   (`plgg-bundle@0.0.7`, `plgg-view@0.0.3`, `plgg-view@0.0.4`),
   gated by `npm.md`'s Confirmation step. — *Resume point on failure:*
   see "Rollback on failure" above (bump-and-retry; never re-publish a
   version number).
4. **#214 producer** (`npm run gate:published-completion`) reads the
   live registry and writes `docs/published-completion.json`. Its last
   real run (Linux/Node 22.23.4, pre-integration) found `plgg-bundle@0.0.6`
   / `plgg-view@0.0.2`, 1/6 checks passing, `complete:false` — expected,
   since nothing above had published yet. — *Resume point on failure
   after a real publish:* if this still shows the old version or
   `complete:false` after step 3's Confirmation passed, the publish
   itself under-shipped (e.g. wrong branch tagged); redo step 3 from
   preflight on the correct branch, do not proceed to step 5/6.
5. **#217 postpublish boundary** (`npm run gate:postpublish --
   release-plan.json`) cross-checks each fix's ancestry on `main`
   against npm `latest`/`gitHead`. Its last real run against
   #212/#189/#166/#216's *current* (pre-merge) heads returned
   `FIX_NOT_IN_MAIN` for all four, correctly — that is this gate's
   fail-closed default before step 1 lands. — *Resume point on
   failure:* a `FIX_NOT_IN_MAIN` after step 1 claims to be merged means
   step 1 did not actually land on `main`; re-verify the merge. A
   version/`gitHead` mismatch after step 3 means step 3 published from
   the wrong commit; redo step 3.
6. **#218 consumer parity** (`npm run gate:consumer-parity -- <SHA>`)
   reruns #213 and #214 side by side for one integration SHA and
   byte-compares the tarballs. Its last run correctly returned
   `prerequisite-gates-unavailable` (steps 2 and 4 hadn't both run for
   the same SHA yet). — *Resume point on failure:* a real
   `tarball-mismatch:<package>` after steps 2–4 all passed means the
   published tarball's bytes diverged from what was integrated
   (manifest rewrite, dirty tree at publish time); redo step 3 from a
   clean checkout of the exact integrated SHA.
7. **#220 tag-binding reader** (`publishedTagLedger`) checks #214's
   ledger against npm's current `latest` dist-tag/metadata, catching
   drift after step 4 ran. Its last run found all three packages
   tag-consistent but still refused `complete:true` because steps 2/4
   weren't both passing yet. — *Resume point on failure:* a tag/version
   mismatch after a real publish means `latest` moved since step 4 ran
   (e.g. an unrelated publish in between); re-run step 4, then this
   step, before trusting step 8.
8. **#219 close ledger** (`docs/issues-155-158-close-ledger.json`) is
   the per-issue summary: once every `{check, command, expect}` tuple
   for an issue's row flips from `"pending"` to passing (steps 2–7 above
   for that issue's package), that issue — and only that issue — is
   ready to close. Close #155/#156 independently from #157/#158; the two
   tracks do not need to finish together.

## Close conditions

| Issue | Closes when | Not enough alone |
| --- | --- | --- |
| #155 (EISDIR on second build) | `plgg-bundle@0.0.7` (containing #212's regression spec) is live on the npm registry, the pipeline above (steps 2–7) passes for `plgg-bundle`, and a clean consumer following the issue's repro runs `npx plgg-bundle` twice with no EISDIR | Merging #189/#179/#212 to `main` — the issue is about the npm-installed experience, not `main`; a green #213 candidate gate alone — that is pre-publish |
| #156 (consumer TypeScript 7 captured) | `plgg-bundle@0.0.7` (containing #189's `consumerCompiler` fix) is live, the pipeline above passes for `plgg-bundle`, a TS7 consumer fixture builds and emits declarations without resolving the consumer's `typescript`, and corpd drops its `tsgo` alias workaround | `5b109cec` alone (fixes the app-build path, not declaration emission) or merging #189 without publishing |
| #157 (frame batching + `lazy`) | `plgg-view@0.0.4` (containing #166, rebased onto #216's `0.0.3`) is live and corpd observes one render per animation frame across several same-frame dispatches, with `lazy`-wrapped subtrees skipping `view`/diff, and the pipeline above passes for that version | Merging #166 to `main` without the npm publish; publishing only `plgg-view@0.0.3` (that is #216/#158's version, not #166/#157's) |
| #158 (SVG shapes + non-destructive `raw`) | `plgg-view@0.0.3` (containing #216, which supersedes #164/#196) is live and corpd's menu icons render via the typed `rect`/`circle`/etc. builders with `.row > svg` selectors matching, and the pipeline above passes for that version | Merging #216 (or #164) to `main` without the npm publish; also note the single-root `raw()` `<span>` wrapper is intentionally *not* part of this close condition (see #216's/#164's own scope notes) — if corpd later needs that removed, file a new issue rather than reopening #158 |

A `Fixes #…` keyword closes its issue on merge, which can happen before
the npm publish and the pipeline above actually resolve the corpd-side
symptom (merge, publish, and consumer-confirmation are three different
gates, in that order). If any of #155–#158 closes on merge before its
row above is independently true, reopen it until the registry state,
the pipeline, and corpd's own verification match this table — do not
treat the keyword-close as the completion signal. #219's close ledger
is the machine-checkable form of this same table; keep both in sync if
either changes.

## Out of scope

Issues #170–#172 and PRs built around them (#168's broader ledger as
extended by #180, #182's all-27-package table, #187, #193, #197, #199,
#200–#209) are a separate concern — Node 24 CI and the `workloads/guide`
/ `workloads/development` Docker base images — unrelated to the four
corpd consumer requests this record resolves. Nothing here changes their
disposition.

## Not verified here

- No sandbox network access to the npm registry while writing either
  pass of this record (`npm view` / registry WebFetch both denied),
  matching the same limitation #164, #166, #181, #185, #189, #213,
  #214, #215, #216, #217, #219, and #220 each already noted
  independently. This second pass instead trusts #214's and #220's own
  *live* registry runs (reported in their PR bodies) for current
  registry fact: `plgg-bundle@0.0.6`, `plgg-view@0.0.2`, `plgg@0.0.27`,
  1/6 consumer checks passing, `complete:false` — none of the tracks
  below have published yet.
- No full three-PR sequential merge was executed for either track; the
  conflict table above is pairwise (`git merge-tree`) plus one three-way
  check-all.sh spot check across #189/#179/#212, plus #213's own
  temporary (not proposed) worktree combining #164+#166+#189. Re-run
  and fix each rebase in the stated order before shipping. The revised
  Track B order (#216 then #166) has not itself been dry-run merge-tree
  checked here beyond the pairwise #216×#166 conflict already listed
  above — do that before rebasing for real.
- `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh` were not run against
  this document's branch beyond what this change itself needs (it adds
  only a Markdown file edit, no package source).
- This job's own attempts to reach corpd's task API (`/api/tasks/.../post`)
  and to run `gh`/`git` network commands required interactive approval
  this unattended run had no one to grant for some calls (consistent
  with #217's and #219's own notes about this); where a call needed
  approval it was skipped rather than retried in a loop.
