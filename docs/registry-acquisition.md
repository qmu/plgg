# Registry acquisition boundary

`scripts/registryAcquisition.mjs` consumes the final Node 24 / TS7
completion ledger from qmu/plgg#221. It adds one acquisition context to
that evidence and every package: registry identifier, UTC acquisition
start time (`fetchedAt`), a unique acquisition ID and the exact input
bytes' SHA-256. The consumer check time stays separate in `consumer.checkedAt`.
All metadata and tarballs are fetched after that acquisition start.

```sh
node scripts/registryAcquisition.mjs \
  docs/published-completion-final.json \
  docs/registry-acquisition.json
node --test scripts/registryAcquisition.spec.mjs
```

Only the official HTTPS npm registry is accepted. Exact package-version
metadata must identify the requested name/version and match the consumer
ledger's integrity. The actual downloaded tarball must match both its
SHA-256 and SHA-512. Credentials and redirects are rejected; npm config,
mirrors, cached metadata and mutable dist-tags are not used.

`validateRegistryEvidence(value, inputBytes)` is the read boundary. It
rejects different acquisition times, registries, operation IDs, source
hashes, versions, duplicate/missing packages and altered consumer results.
Even two acquisitions of identical versions cannot exchange package
records. This is a consistency boundary for trusted local producers,
not a signature or protection against someone rewriting the entire JSON.

The acquisition context, versions and normalized consumer evidence are
written to one temporary file and renamed over the output. Acquisition
failure replaces stale success with an incomplete record, without raw
errors. Read/write/rename errors exit 1 and can leave the previous output;
always honor the exit status. Output directories must already exist.
The write provides atomic replacement, not crash durability or concurrent
writer ordering. `complete` requires all six consumer checks to pass;
matching npm artifacts alone cannot turn incomplete consumer evidence green.

This supplements qmu/plgg#220's live tag check and qmu/plgg#221's final
consumer persistence without changing their files. Integrate qmu/plgg#221
and generate its final input before running the command. The input file
is not currently on main. No consumer probes are rerun by this command.

## Recorded live acquisition

`docs/registry-acquisition.json` was generated using the final ledger from
qmu/plgg#221 commit `d0dd90094103ce8f21ef2ce99cbb00a08db8b279`.
Node 24.22.1 fetched official npm metadata and tarballs for plgg 0.0.27,
plgg-bundle 0.0.6 and plgg-view 0.0.2; both hashes matched for each.
The inherited checks are 1/6 passed, so completion remains false and the
CLI exits 1. This does not claim a new consumer run, a publication,
a merge or issue closure. Regenerate after the upstream fixes publish.
