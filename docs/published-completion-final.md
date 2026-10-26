# Final published-consumer evidence

`scripts/savePublishedCompletion.mjs` owns the final filesystem boundary after
qmu/plgg#214's published npm consumer producer. It does not install packages or
replace the consumer gates. On integration, run with Node 24:

```sh
node scripts/publishedCompletion.mjs /tmp/published-completion.json
# Run the saver even when the producer exits 1 with incomplete evidence.
node scripts/savePublishedCompletion.mjs /tmp/published-completion.json docs/published-completion-final.json
```

Exit 0 requires schema 1, the official npm registry, Node 24, consumer TS7,
exactly one version and SHA-256/SHA-512 for each of plgg, plgg-bundle and
plgg-view, all six unique passing checks, and the producer's complete flag.
Invalid JSON or incompatible evidence writes a minimal incomplete snapshot.
Valid but failing evidence retains versions, hashes, runtime and check outcomes.
Unknown fields and raw diagnostic strings are never forwarded.

The saver writes a mode-0600 exclusive temporary file beside the destination,
flushes and closes it, then renames it over the prior snapshot. Readers see a
whole old or new snapshot. Rename/write failure exits 1, cleans temporary bytes,
and leaves any prior destination unchanged; callers must honor the exit code,
not treat a previous complete file as fresh success. Unreadable input also exits
1 without replacing the prior destination. This is atomic visibility, not a
power-loss durability guarantee or a multi-writer ordering protocol.

The input SHA-256 binds the exact source bytes. Package hashes are validated for
shape and preserved from the trusted producer, which verifies downloaded npm
integrity. This reader does not independently authenticate a producer, validate
current npm tags, rehash tarballs, or prove source ancestry. Those boundaries
remain with qmu/plgg#214, qmu/plgg#220, qmu/plgg#218 and qmu/plgg#217 respectively.
The Node and compiler fields describe the producer's execution, not the saver.
Synthetic passing fixtures test persistence only and do not certify npm.

The checked-in `published-completion-final.json` now consumes the enhanced
qmu/plgg#214 producer's Node 24.22.1 observation. Public versions remain plgg
0.0.27, plgg-bundle 0.0.6 and plgg-view 0.0.2. Both TS6 CLI invocations and
fresh output executions finished, but the legacy launcher replaced the seeded
symlink (`legacy-symlink-mutated`, `second-build`). All six gates fail and
`complete` remains false. This is a dated Linux observation, not macOS
reproduction or issue closure.

A passing `bundle-restart` must now carry `evidence` schema version 1:
`sameConsumer: true`, `legacySymlink: "preserved"`, the exact bundle
`packageSha256` and two runs with values 41/42 and distinct SHA-256 output
hashes. The saver retains only those allowlisted fields. Missing proof,
reversed/duplicate/missing runs, malformed hashes, a changed package hash,
or a removed legacy link turns a claimed pass into `blocked` with
`restart-proof-required`. Old status-only snapshots must be regenerated.
A failed restart retains only allowlisted phase and reason codes, so the
final ledger identifies the second-start failure without raw subprocess logs.

The producer and saver changes update existing qmu/plgg#214 and qmu/plgg#221;
merge both before regenerating evidence. The source SHA-256 in this final file
must equal SHA-256 of #214's exact `docs/published-completion.json` bytes.
qmu/plgg#236 still requires publication, merged implementation and affected
runtime evidence before qmu/plgg#155 can close.

Regression tests run in `scripts/check-all.sh`, or directly:

```sh
node --test scripts/savePublishedCompletion.spec.mjs
```
