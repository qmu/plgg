# Post-publication source boundary for qmu/plgg#155–158

Run `npm run gate:postpublish -- /absolute/path/release-plan.json` from the
repository root (Node with native TypeScript stripping, Git and network access).
The command fetches `origin/main` before evaluating all four issues, reads the
live npm `latest` metadata once per package, and downloads the official tarball
when the source checks pass. It exits 0 only when all four rows match; otherwise
it prints a fresh JSON result and exits 1. Nothing is published or installed.
Raw command output, environment variables and transport errors are never printed.

The input is an array of exactly four objects, one each for issues 155–158:

```json
[
  { "issue": 155, "package": "plgg-bundle", "commit": "<40-character integrated fix SHA>", "version": "0.0.7", "rollback": "0.0.6" },
  { "issue": 156, "package": "plgg-bundle", "commit": "<40-character integrated fix SHA>", "version": "0.0.7", "rollback": "0.0.6" },
  { "issue": 157, "package": "plgg-view", "commit": "<40-character integrated fix SHA>", "version": "0.0.3", "rollback": "0.0.2" },
  { "issue": 158, "package": "plgg-view", "commit": "<40-character integrated fix SHA>", "version": "0.0.3", "rollback": "0.0.2" }
]
```

Replace the placeholders with reviewed fix commits retained in main's history;
for squash merges use the resulting squash commit. Versions above are illustrative,
not a claim that those releases exist or are good. The release owner supplies a
previously verified consumer rollback version, which must differ from the target.
Both rows of a package must agree on target and rollback versions. Only stable
three-component versions and full lowercase SHAs are accepted. Unknown input
fields are discarded; do not put credentials in input files.

Each row requires: fix ancestor of freshly fetched main; latest npm version equal
to the plan; npm gitHead ancestor of main containing the fix; package manifest at
that gitHead with the same name/version; and SHA-512 of the downloaded bytes equal
to npm integrity. Pre-merge publication is supported when the published branch
commit remains an ancestor after merge. A squash that drops that commit fails
closed: inspect the release evidence rather than weakening the ancestry test.
Missing gitHead or SHA-512 also fails closed. The output includes only validated
observed version, gitHead and integrity, never arbitrary registry fields or URLs.

| Fixed reason | Meaning |
| --- | --- |
| `MATCH` | All source/publication checks passed |
| `INVALID_PLAN` | Missing/duplicate issue, invalid field, or conflicting package targets |
| `FIX_NOT_IN_MAIN` | Selected fix not integrated or unavailable in local history |
| `INVALID_REGISTRY_METADATA` | Missing or malformed npm identity/gitHead/integrity |
| `REGISTRY_VERSION_MISMATCH` | Actual latest differs from planned release |
| `PUBLISHED_COMMIT_MISMATCH` | Published source not integrated or does not contain fix |
| `PUBLISHED_VERSION_MISMATCH` | Source manifest differs from npm identity/version |
| `UNSAFE_TARBALL_URL` | Tarball is not the exact official HTTPS package/version URL |
| `TARBALL_INTEGRITY_MISMATCH` | Downloaded bytes differ from registry SHA-512 |
| `EVIDENCE_UNAVAILABLE` | Git fetch, network, source manifest or other evidence unavailable |

On a failed row `rollbackTarget` is the exact planned `package@version`; on success
it is null. This is a consumer pin recommendation, not an automatic unpublish,
dist-tag change or assertion that rollback fixes these issues. npm versions cannot
be overwritten; repair forward with a new version and rerun the gates. A malformed
plan or failed initial fetch cannot safely select rollback targets and yields only
a top-level fixed failure reason.

This boundary does not reimplement qmu/plgg#213's candidate behavior tests,
qmu/plgg#214's live-registry behavioral ledger, qmu/plgg#215's sequencing decisions,
or qmu/plgg#216's SVG implementation. It does not execute input-supplied commands,
load those PRs' artifacts, prove build reproducibility, or close issues. npm gitHead
is publisher metadata, not cryptographic provenance linking source to built code.
Use their behavior evidence alongside this source/publication check before closing
qmu/plgg#155–158. Unit tests run automatically through the existing
`scripts/*.spec.ts` check-all entry; the network gate stays explicit.
