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

The checked-in `published-completion-final.json` was generated on Node 24.22.1
from the unmodified qmu/plgg#214 producer at
`74f8b886ef8ef7014aaea270918261eeb0f0a1cd`, fetched into a temporary directory
with its browser fixture. Consumer TypeScript 7.0.2 was installed and its
version checked by that producer. The npm versions were plgg 0.0.27,
plgg-bundle 0.0.6 and plgg-view 0.0.2. Only bundle-restart passed: consumer-ts7,
SVG, raw identity, frame dispatch and lazy subtree failed (1/6 passed).
The final snapshot correctly remains `complete: false`; it is a dated
observation, not issue closure, a release, a CI claim, or macOS reproduction.

Regression tests run in `scripts/check-all.sh`, or directly:

```sh
node --test scripts/savePublishedCompletion.spec.mjs
```
