# Terminal npm context commit

`node scripts/commitNpmContext.ts CANDIDATE.json TERMINAL.json`

This additional save boundary refuses to finalize a Node 24 / consumer TS7
candidate assembled from different npm query contexts. It performs no network
requests or npm publication. It preserves an existing terminal file on rejection.

The candidate extends a previously verified consumer ledger:

```json
{
  "schemaVersion": 1,
  "complete": true,
  "node": "v24.22.1",
  "consumerTypeScript": "7.0.2",
  "packages": [
    { "name": "plgg", "version": "1.0.0" },
    { "name": "plgg-bundle", "version": "1.0.0" },
    { "name": "plgg-view", "version": "1.0.0" }
  ],
  "npmContext": {
    "registry": "https://registry.npmjs.org",
    "fetchedAt": "2026-10-25T12:00:00.000Z",
    "latest": {
      "plgg": "1.0.0",
      "plgg-bundle": "1.0.0",
      "plgg-view": "1.0.0"
    }
  },
  "npmResults": [
    {
      "name": "plgg",
      "version": "1.0.0",
      "latest": "1.0.0",
      "registry": "https://registry.npmjs.org",
      "fetchedAt": "2026-10-25T12:00:00.000Z"
    },
    {
      "name": "plgg-bundle",
      "version": "1.0.0",
      "latest": "1.0.0",
      "registry": "https://registry.npmjs.org",
      "fetchedAt": "2026-10-25T12:00:00.000Z"
    },
    {
      "name": "plgg-view",
      "version": "1.0.0",
      "latest": "1.0.0",
      "registry": "https://registry.npmjs.org",
      "fetchedAt": "2026-10-25T12:00:00.000Z"
    }
  ]
}
```

Each result carries its effective registry URL and the acquisition's start time
(canonical UTC milliseconds), not the individual HTTP response completion time.
The registry is compared exactly, including path and trailing slash. HTTPS URLs
with credentials, query strings or fragments are rejected. A collector must
preserve effective per-query configuration, including scoped registry overrides;
it must never overwrite provenance with the envelope's values to make it match.
The three packages need not share a version. Each result's version must equal
its consumer package version; its latest must equal both that version and the
context's latest for that package. Missing, duplicate and extra packages fail.
Even a later timestamp is a different acquisition and is rejected here.

`validateNpmContext` exposes fixed reasons: `invalid-terminal-candidate`,
`invalid-npm-context`, `invalid-npm-package-set`, `npm-registry-mismatch`,
`npm-fetch-time-mismatch`, `npm-latest-mismatch`. The CLI emits only
`npm-context-commit-rejected` and exits 1 on failure, without echoing input or
filesystem errors. Success copies the validated bytes through a private temporary
file and atomic rename. Rename failure cleans the temporary file.

## Integration and limits

On origin/main there is no terminal ledger producer yet. This is an independently
usable CLI, not an automatically connected publisher gate. After the producer PRs
merge, compose their successful consumer/hash validation with this boundary at the
final save, and supply the context and per-result provenance from the collector.
Never synthesize missing context for old ledgers. `complete: true` alone is not a
replacement for running consumer and tarball verification upstream.

This gate adds terminal-time cross-result consistency, without changing the
acquisition producer in qmu/plgg#223, the resume comparison in qmu/plgg#229, the
input capture in qmu/plgg#231, the moving-tag observation in qmu/plgg#228, the
SemVer floor in qmu/plgg#232, or event ordering in qmu/plgg#233. It does not prevent
forged JSON, tag movement after observation, concurrent last-writer wins, or loss
on power failure. Keep candidate files private; accepted bytes retain upstream
fields. No npm release or issue closure is performed.

Run `node --test scripts/commitNpmContext.spec.ts`; the existing `*.spec.ts` gate
in `scripts/check-all.sh` discovers these tests automatically.
