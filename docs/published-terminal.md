# One terminal result for published Node 24 / TS7 evidence

`scripts/publishedTerminal.mjs` executes the existing published consumer producer
(qmu/plgg#214), then the dist-tag binder (qmu/plgg#220) against **that same
in-memory producer result**. It saves one allowlisted terminal JSON, including
package versions and tarball SHA-256/SHA-512, all six consumer outcomes, current
latest-tag observations, source JSON SHA-256, runtime/compiler versions and
fixed failure categories. It does not publish packages or close issues.

After integrating those two producer PRs:

```sh
node scripts/publishedTerminal.mjs artifacts/published-terminal.json
```

Run under Node 24 with npm and Chromium available (the existing producer accepts
`CHROMIUM_PATH`). The optional second argument is the directory containing
`publishedCompletion.mjs`, its fixture directory, and `publishedTagLedger.ts`.
This supports reviewing the open producers without copying their code into main.
Without those prerequisites, the command still writes an incomplete terminal
result and exits 1. The offline tests run independently of the open PRs.

| Fixed reason           | Boundary                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `npm-acquisition`      | Missing/invalid package version or hashes; failed consumer install                                |
| `consumer-compile`     | The TS7 consumer probe fails after installation (includes its build/typecheck/negative control)   |
| `test`                 | Bundle restart, browser behavior, or producer infrastructure fails                                |
| `dist-tag`             | Current latest/version/integrity does not match, or tag evidence cannot be obtained               |
| `environment`          | The runner is not Node 24                                                                         |
| `invalid-evidence`     | Wrong source schema/runtime/compiler, missing/duplicate/unknown check, or inconsistent completion |
| `producer-unavailable` | Producer import, execution, JSON read/parse, or binder execution throws                           |

Reasons are unique and ordered; several can coexist. A blocked check with no
phase was never executed and adds no compile/test failure by itself. A consumer
failure alone does not become a dist-tag failure: the tag binder's
`consumer-checks-incomplete` is already represented at the consumer boundary.
No child-process diagnostics or arbitrary producer fields are copied.

A same-directory exclusive 0600 temporary file is renamed over the terminal
path. An unsuccessful run replaces an older success. Persistence failure exits
1 and removes the temporary file; a failed rename preserves the previous file,
so callers **must check exit status**, not merely the existence of JSON.
Exit 0 requires successful persistence and every boundary passing. Atomic rename
does not guarantee durability after power loss or ordering of concurrent writers.
The producer and binder are trusted local code; this is not a signed attestation.

This is the execution/classification boundary missing between qmu/plgg#214,
qmu/plgg#220, qmu/plgg#221 and qmu/plgg#223. It reuses #214's tarball acquisition
and consumer probes and #220's live tag comparison. It does not replace #223's
separate exact-version re-acquisition audit or #221's standalone save command.

## Recorded registry run

`docs/published-terminal.json` was generated with Node 24.22.1 and consumer
TypeScript 7.0.2 against the official npm registry. It records plgg 0.0.27,
plgg-bundle 0.0.6 and plgg-view 0.0.2. Acquisition and all three latest-tag
matches succeeded. Bundle restart passed; the TS7 consumer and four view
checks failed (1/6 passed). The terminal result is therefore `complete:false`,
with `consumer-compile` and `test`, and the CLI exited 1.

The unmodified producers were reviewed at qmu/plgg#214 commit
`74f8b886ef8ef7014aaea270918261eeb0f0a1cd` and qmu/plgg#220 commit
`120ea65b2cdbcdd2f448d99c3b96b93fa7517e5f`, materialized outside the checkout.
The JSON is an observation of those published versions, not evidence that the
pending implementation fixes are released. Regenerate after publication.

Validation: `scripts/build.sh`, `scripts/tsc-plgg.sh`, `scripts/test-plgg.sh`
(491 passed), and `node --test scripts/publishedTerminal.spec.mjs` (10 passed).
The first typecheck ran before plgg-test declarations had been built and failed;
the post-build typecheck passed. The full `check-all.sh` was not run.
