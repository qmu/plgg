# Integration / registry consumer parity

Run `node scripts/gate-consumer-parity.mjs <full-integration-commit-SHA>`
from a clean checkout of the integration commit, under Node 24, after installing
workspace dependencies and Chromium. Exit 0 means both consumer gates passed
and all three shared artifacts (`plgg-bundle`, `plgg-view`, `plgg`) have the
integration commit's versions and identical tarball SHA-256 values. Every other
outcome exits 1 with fixed reason codes in `.consumer-parity/result.json`.

This is an additive coordinator, dependent on qmu/plgg#213
(`scripts/gate-corpd-consumer.mjs`) and qmu/plgg#214
(`scripts/publishedCompletion.mjs`). Merge those prerequisites before running
acceptance. Missing modules fail with `prerequisite-gates-unavailable`; this PR
does not copy their implementations. qmu/plgg#215 owns the integration/release
order; qmu/plgg#216 owns the SVG implementation. No package is published here.
The offline regression suite is registered in `scripts/check-all.sh`.

The coordinator runs fresh probes, checks the candidate revision and clean
tracked-tree fingerprint, rehashes the candidate tarballs, compares registry
versions against package manifests read from the specified git commit, and
requires complete behavioral evidence on both sides. Missing/duplicate package
records, incomplete/duplicate checks, old versions and different bytes fail
closed. Candidate evidence stays in `.corpd-consumer/parity/`; registry evidence
is regenerated in `.consumer-parity/published.json`. The aggregate is overwritten
before probing, so a failed run cannot preserve an old green aggregate. Only
fixed reasons are emitted by the coordinator; prerequisite diagnostic logs stay
local and must be reviewed before sharing.

The equality is deliberately byte-for-byte, not a claim that two separately
packed or publisher-rewritten tarballs are equivalent. If the publisher changes
manifest dependencies or archive metadata, `tarball-mismatch:<package>` remains
failed even when behavior passes. Do not waive it by comparing versions alone;
use the same release artifact in the candidate and registry probes or extend
the prerequisite gates to accept the staged release artifacts in a subsequent
change. This gate does not claim macOS/Node 23 issue closure or registry publish
success when its prerequisites are absent.
