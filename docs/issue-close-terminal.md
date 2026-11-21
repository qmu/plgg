# Public request closure boundary

`node scripts/issueCloseLedger.ts COMPLETION.json TAGS.json SUPPLEMENTAL.json OUTPUT.json`

This command joins the public consumer completion from qmu/plgg#221,
registry/latest observations from qmu/plgg#220, the outstanding corpd-side
closure checks, and fresh GitHub PR merge facts. It writes one JSON containing
all four issue decisions with their merge commit, npm version, latest,
consumer checks, supplemental checks, and fixed blockers. It never closes an
issue, publishes npm packages, or merges a PR.

The policy follows qmu/plgg#219, using the canonical PRs rather than the
superseded implementations:

| Issue        | Required merged PRs                      | Public gate checks           | Supplemental closure checks                          |
| ------------ | ---------------------------------------- | ---------------------------- | ---------------------------------------------------- |
| qmu/plgg#155 | qmu/plgg#212                             | bundle-restart               | affected-runtime-repeat-build                        |
| qmu/plgg#156 | qmu/plgg#189, qmu/plgg#179, qmu/plgg#212 | consumer-ts7                 | consumer-declarations, corpd-tsgo-workaround-removed |
| qmu/plgg#157 | qmu/plgg#166                             | frame-dispatch, lazy-subtree | corpd-frame-lazy                                     |
| qmu/plgg#158 | qmu/plgg#216                             | svg-elements, raw-identity   | corpd-typed-svg-child-selector                       |

The minimum stable versions are plgg-bundle 0.0.7 and plgg-view 0.0.3.
Later stable releases are allowed; prereleases are blocked. A replacement PR
requires an explicit policy update and review, not merely closing the old PR.
The merged PR must target qmu/plgg main and include a merge timestamp and SHA.
A failed GitHub query produces a blocked PR fact.

## Inputs and integration

All inputs must come from trusted collectors. The boundary does not rerun
feature gates or authenticate manually authored JSON. The completion must have
passed qmu/plgg#221's validation; regenerate qmu/plgg#220's tags using those
**exact completion bytes**. Both inputs must declare complete, the completion
must identify Node 24 / consumer TS7, and every relevant recorded/published/
latest version must agree. Keep the existing hash, acquisition-context,
ancestry/parity, time-order and tag-stability boundaries in the release path;
this join does not replace them.

`docs/issue-close-supplemental.json` is a pending template bound by SHA-256 to
the observed completion bytes. After a new completion, replace its
`sourceSha256` with the hash of those bytes and rerun each supplemental check
against that exact release. Only record `status: "passed"` after observing:

- `affected-runtime-repeat-build`: two successful clean consumer app builds
  on the original affected runtime or an equivalent reproducing the old error.
- `consumer-declarations`: qmu/plgg#189's declaration-emission consumer gate.
- `corpd-tsgo-workaround-removed`: the corpd dependency configuration uses the
  single consumer TypeScript 7, with the alias/pinning workaround removed.
- `corpd-frame-lazy`: corpd observes one render per frame and unchanged lazy
  subtree reuse.
- `corpd-typed-svg-child-selector`: corpd icons use typed SVG builders and
  `.row > svg` selectors match. The raw wrapper limitation is not silently
  waived by the raw DOM identity gate.

Missing or duplicate issue/check/PR/package observations fail closed. Unknown
input fields and raw diagnostics are not copied to the public output. The CLI
reads PR facts using `gh api repos/qmu/plgg/pulls/<number>`; only allowlisted
merge facts survive into the result. Source hashes bind the four snapshots.

Consumers read only OUTPUT.json and require the relevant issue's `canClose`.
The top-level `complete` requires all four. The command exits 0 only when all
four can close; a saved blocked decision exits 1. A same-directory temporary
file and rename publish the entire decision in one operation, replacing even
a previous successful decision when newer evidence blocks closure. On input
or I/O failure it exits 1 with a fixed diagnostic and may preserve the old
file: callers must check the exit code and freshness, never reuse a previous
success after a failed invocation. Atomic replacement does not guarantee
power-loss durability or concurrent writer ordering; serialize the release
orchestrator. npm tags and GitHub state are observations at collection time,
not promises about future state.

## Recorded observation

`docs/issues-155-158-terminal.json` was generated using the existing published
JSON snapshots from qmu/plgg#221 (`docs/published-completion-final.json`) and
qmu/plgg#220 (`docs/published-tag-ledger.json`), the pending supplemental
checks, and live GitHub merge queries. **All four requests remain blocked.**
These npm results are historical snapshots, not a new live npm consumer run.
They report plgg-bundle 0.0.6 and plgg-view 0.0.2; the completion is incomplete,
and the tag ledger is bound to a different source file. This intentionally
cannot be promoted to a closable result. No merge, release or issue closure
was performed. The exact input hashes and PR observations are in the output.

To reproduce the observation, fetch the two named JSON files from their PR
heads with `gh api repos/qmu/plgg/contents/<path>?ref=refs/pull/<number>/head`,
decode their base64 content without reformatting, and invoke the command above
with the pending supplemental template. If upstream snapshots change, update
the template hash after checking the new input and rerun all checks. After
integration, use freshly generated completion and tag files instead.

The new `scripts/issueCloseLedger.spec.ts` runs automatically through the
existing `node --test scripts/*.spec.ts` check-all gate. No existing producer,
consumer fixture, publisher or static close-policy ledger is duplicated.
