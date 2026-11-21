# Publish resume: fetch-context binding

`scripts/publishResumeContext.ts` binds a partway-publish resume
decision to the exact registry snapshot it was diagnosed against, and
rejects resuming against a different one.

## Why

`scripts/publishResume.ts` (qmu/plgg#222, not yet merged) plans what
to resume purely from a failure's position in the `--only` order — it
never records WHICH live registry state that plan assumed. Between a
failure and a developer actually re-running
`ONLY=... ./scripts/publish-npm.sh`, another publish can move a
package's version or its `latest` dist-tag. A resume command printed
against the old state would then either skip a package that still
needs publishing, or treat a package whose dist-tag moved underneath
it as untouched.

## The binding

`captureFetchContext(registry, fetchedAt, packages)` takes a registry
identifier, a UTC fetch time, and each package's
`{name, version, latestTag}` (the `latest` dist-tag's version, or
`null` when unpublished), and returns one `FetchContext` whose
`distTagGeneration` is an order-independent hash of that package list.
Two captures of the same registry reality always compare equal
regardless of query order; any version bump, `latest` retag, or
package added/removed changes the hash.

`validateResume(saved, current)` compares a resume attempt's freshly
re-fetched `current` context against the `saved` one its plan was
computed from, and returns `null` only when every one of these holds:
the same registry, `current.fetchedAt` not earlier than
`saved.fetchedAt`, the exact same named packages, and every version
and `latest` dist-tag unchanged. Otherwise it returns the single most
specific `ContextRejection` — `registry-mismatch`,
`non-monotonic-fetch`, `missing-package`, `unexpected-package`,
`package-version-mismatch`, or `dist-tag-generation-mismatch` (naming
exactly which packages' tags moved) — and `describeRejection` renders
it as the one-line reason a resume was refused.

## Scope

Pure: no filesystem, no network, no `npm` spawn. The caller is
responsible for fetching both `FetchContext`s from the live registry
(e.g. `npm view <name> version` + `npm view <name> dist-tags.latest`
per package) and for persisting the `saved` one alongside the resume
report at the moment of failure.

Checked against the currently open PRs before writing this: it does
not duplicate qmu/plgg#222's resume-plan ordering (`completed` /
`failed` / `pending`), qmu/plgg#223's consumer-acquisition ledger
binding, qmu/plgg#227's resume/rollback/npmVersionCheck/issueClose
phase ordering, or qmu/plgg#228's pre/post-finalization tag-drift
guard — each of those answers a different question. Wiring this
module into `scripts/publish.ts`'s actual resume path is deferred
until qmu/plgg#222 merges and owns that entry point; until then this
is an independently testable contract, same as the other open PRs in
this area.
