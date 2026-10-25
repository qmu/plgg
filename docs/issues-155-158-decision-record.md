# Decision record: issues #155–#158 and their open PRs

2026-10-25. Covers the four corpd consumer requests —
[#155](https://github.com/qmu/plgg/issues/155) (plgg-bundle: EISDIR on a
second app build), [#156](https://github.com/qmu/plgg/issues/156)
(plgg-bundle: relocate pulls in the consumer's TypeScript instead of its
own), [#157](https://github.com/qmu/plgg/issues/157) (plgg-view: frame
batching + `lazy()`), and [#158](https://github.com/qmu/plgg/issues/158)
(plgg-view: typed SVG shape elements + non-destructive `raw()` diffing) —
and the open PRs that implement, gate, or publish fixes for them: #164,
#165, #166, #173, #179, #189, #190, #211, #212.

Evidence: `gh pr view --json body,files,mergeable` for each PR above,
`git show <pr-head>:<path>` for the real file contents (not just titles),
and `git merge-tree --write-tree` dry-runs between PR heads and
`origin/main` (`bba7ca80`) to find real textual conflicts. Nothing was
merged, published, or pushed to any PR branch while writing this.

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
| #166 | Source fix for #157: batches `application`'s dispatch→view→diff into one animation frame (sync mode selectable for tests), adds `lazy()` to skip re-running `view`/diff when its argument is referentially unchanged. Bumps `plgg-view` 0.0.2 → 0.0.3. Fixed two real bugs caught by its own CI (a scheduler bookkeeping bug and a stale-arg lazy-diff bug). `Fixes #157`. | `element.ts`, `render.ts` (+both specs), `Html.ts`, `application.ts`, `effects.ts`, `collectCss.ts`, `foldHtml.ts`, `mapHtml.ts`, `client.ts`, `package.json`, guide doc |
| #164 | Source fix for #158: widens the SVG tag set / gives SVG-descendant elements the SVG namespace so `rect`/`circle`/`ellipse`/`line`/`polyline`/`polygon`/`g` render instead of becoming `HTMLUnknownElement`, and makes `raw()` idempotent (same html string → no DOM rebuild; changed html → rebuilt). `Fixes #158`. Explicitly leaves the "don't wrap a single-root `raw()` fragment in `<span>`" ask out of scope, per the issue's own "できるとよい" (optional) framing. | `element.ts`, `render.ts` (+both specs), `plgg-test` DOM env file |

`#196` ("asSvgNumberList caster") is for issue **#167**, a different
plgg-view issue, not #158 — out of scope here.

## Where the PRs collide

`git merge-tree --write-tree` against `origin/main` and between PR heads:

| Pair | Result | Where |
| --- | --- | --- |
| #189 × #179 | conflict | `scripts/check-all.sh` (both append a gate line) |
| #179 × #212 | conflict | `scripts/check-all.sh` |
| #189 × #212 | conflict | `scripts/check-all.sh` |
| #164 × #166 | conflict | `packages/plgg-view/src/Html/model/element.spec.ts`, `Program/usecase/render.ts`, `render.spec.ts` |
| #165 × #212 | conflict (same fields) | `packages/plgg-bundle/package.json` version, `check-all.sh` |

Every `check-all.sh` conflict is additive — each PR appends one line
calling its own new gate script — so resolving them means keeping every
appended line, not picking a side. The `plgg-view` conflicts are real
logic overlap: #166 owns the frame/lazy path through `render.ts`, #164
owns the SVG/`raw` path through the same file; both edits must survive
the rebase.

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

**Track B — plgg-view (#157, #158), merge in this order:**

1. **#166** — merge first (it carries the 0.0.3 version bump).
2. **#164** — rebase onto #166 and resolve the `element.spec.ts` /
   `render.ts` / `render.spec.ts` conflicts by keeping both the
   frame/`lazy` changes (#166) and the SVG-namespace/`raw` changes (#164)
   in the merged file. #164 carries no version bump of its own, so it
   must land in the same pre-publish branch as #166's 0.0.3 — see
   publish order below.

Integration condition for both tracks, before merging any PR in the
sequence: `scripts/check-all.sh` green on the rebased branch (covers
`scripts/tsc-plgg.sh`'s whole-repo typecheck and `scripts/test-plgg.sh`),
including the new gate scripts each PR adds. None of #164/#166/#179/
#189/#212 could run `npm`/`node` directly in the sandbox that produced
them; each relied on its own CI run (`run-tests.yml`) as the real gate.
Re-run `check-all.sh` after each rebase in this record — a clean
pairwise dry-run is not the same as a green gate on the combined tree.

## npm publish order

Per `.workaholic/deployments/npm.md`: publish is a **developer-driven,
pre-merge** step. The agent's `/ship` preflight (`PREFLIGHT=1
./scripts/publish-npm.sh`) only detects a version bump already sitting
in a branch's `package.json`; it never decides what to bump. So the
publish step for each track happens only once Track A's branch (through
#212) or Track B's branch (through #164 rebased on #166) exists with the
bump already in place — not before.

1. **plgg-bundle@0.0.7**, from the branch that already contains #189 +
   #179 + #212. Do not publish 0.0.7 from #165 or #211 alone — npm
   forbids re-publishing the same version number, so if 0.0.7 ships
   before #189's declaration fix or #212's repeat-build regression test
   are in the same tree, the only way to add them afterward is a second
   bump to 0.0.8.
2. **plgg-view@0.0.3**, from the branch that already contains #164
   rebased onto #166. Same constraint: #164 has no version bump of its
   own, so publishing 0.0.3 from #166 alone and landing #164 afterward
   would require bumping #164's work to 0.0.4 to ship it.
3. The two packages have no dependency on each other and no shared
   file, so they can be bumped and published in the same `/ship` cycle
   or in either order; `publish-npm.sh` publishes whichever packages
   are bumped, in `build.sh`'s dependency order, in one run.
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
  re-publishing the same version. Bump to the next version (0.0.8 for
  plgg-bundle, 0.0.4 for plgg-view), fix whatever the Confirmation check
  caught, and re-run the full procedure from preflight. Do not merge the
  PR that staged the failed version; its `package.json` must move to the
  new version number before it can merge.
- **After merge:** the merge and the GitHub Release are downstream of a
  passed Confirmation, so there is no planned rollback path from "merged
  but broken" other than the normal one — open a new fix, bump again,
  publish again. This record does not change that.
- **If a Track A or Track B PR fails `check-all.sh` after rebase** (new
  conflict-resolution regression): fix it on the branch before
  proceeding to the next PR in that track's order; do not merge a red
  branch and do not let it block the other, independent track.

## Close conditions

| Issue | Closes when | Not enough alone |
| --- | --- | --- |
| #155 (EISDIR on second build) | `plgg-bundle@0.0.7` (containing #212's regression spec) is live on the npm registry and a clean consumer following the issue's repro runs `npx plgg-bundle` twice with no EISDIR | Merging #189/#179/#212 to `main` — the issue is about the npm-installed experience, not `main` |
| #156 (consumer TypeScript 7 captured) | `plgg-bundle@0.0.7` (containing #189's `consumerCompiler` fix) is live, a TS7 consumer fixture builds and emits declarations without resolving the consumer's `typescript`, and corpd drops its `tsgo` alias workaround | `5b109cec` alone (fixes the app-build path, not declaration emission) or merging #189 without publishing |
| #157 (frame batching + `lazy`) | `plgg-view@0.0.3` (containing #166) is live and corpd observes one render per animation frame across several same-frame dispatches, with `lazy`-wrapped subtrees skipping `view`/diff | Merging #166 to `main` without the npm publish |
| #158 (SVG shapes + non-destructive `raw`) | `plgg-view@0.0.3` (containing #164) is live and corpd's menu icons render via the typed `rect`/`circle`/etc. builders with `.row > svg` selectors matching | Merging #164 to `main` without the npm publish; also note the single-root `raw()` `<span>` wrapper is intentionally *not* part of this close condition (see #164's own scope note) — if corpd later needs that removed, file a new issue rather than reopening #158 |

A `Fixes #…` keyword closes its issue on merge, which can happen before
the npm publish that actually resolves the corpd-side symptom (merge and
publish are two different gates in `/ship`, publish first). If any of
#155–#158 closes on merge before its row above is independently true,
reopen it until the registry state and corpd's own verification match
this table — do not treat the keyword-close as the completion signal.

## Out of scope

Issues #170–#172 and PRs built around them (#168's broader ledger as
extended by #180, #182's all-27-package table, #187, #193, #197, #199,
#200–#209) are a separate concern — Node 24 CI and the `workloads/guide`
/ `workloads/development` Docker base images — unrelated to the four
corpd consumer requests this record resolves. Nothing here changes their
disposition.

## Not verified here

- No sandbox network access to the npm registry while writing this
  (`npm view` / registry WebFetch both denied), matching the same
  limitation #181 and #185 already noted. The "current state" section
  above relies on `main`'s `package.json` values, which is the same
  baseline every prior status PR used.
- No full three-PR sequential merge was executed for either track; the
  conflict table above is pairwise (`git merge-tree`) plus one three-way
  check-all.sh spot check across #189/#179/#212. Re-run and fix each
  rebase in the stated order before shipping.
- `scripts/tsc-plgg.sh` and `scripts/test-plgg.sh` were not run against
  this document's branch beyond what this change itself needs (it adds
  only a Markdown file).
