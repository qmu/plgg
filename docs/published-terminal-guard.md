# Guard the terminal ledger against a concurrent npm publication

Use Node 24. Run from the repository root:

```sh
node scripts/guardPublishedTerminal.mjs \
  /tmp/plgg-terminal.json /tmp/plgg-terminal-resume.json \
  /path/to/integrated-producer-scripts
```

The optional third argument names the directory containing
`publishedTerminal.mjs` from qmu/plgg#225 and its dependencies
(`publishedCompletion.mjs` from qmu/plgg#214 and
`publishedTagLedger.ts` from qmu/plgg#220). Once integrated, omit it.
Do not replace this command with a direct producer invocation when a guarded
terminal commit is required. On main without those producers, the command
fails closed and saves `terminal-boundary-failed`; it cannot certify a release.

This is the missing **two-observation boundary**, not another consumer gate:

1. Atomically replace the restart checkpoint with `complete:false` and
   `restartFrom: "acquisition"` before registry access.
2. Read the official registry packuments for plgg, plgg-bundle and plgg-view
   concurrently, with no cache and a 30-second timeout per request. Retain
   only package names and validated `dist-tags.latest` versions.
3. Run the existing terminal producer into a unique candidate beside the
   target. Its consumer, integrity and failure-classification checks remain
   authoritative. Read the actual candidate bytes, require `complete:true`,
   and require exactly one acquired version per package matching the initial
   tag snapshot. A producer returning success without writing valid evidence
   cannot commit.
4. Re-read all three latest tags after candidate generation and immediately
   before atomic rename. If any tag changed, save `dist-tag-conflict` with
   both snapshots, remove the candidate and leave the existing terminal ledger
   byte-for-byte unchanged. Missing/invalid metadata also prevents commit.
5. Only matching snapshots allow rename. Exit 0 means `committed`; every
   other result exits 1. Checkpoint persistence errors also exit 1.

On conflict, run the **same command again**. It starts a fresh acquisition;
there is no path that promotes a previous candidate or reuses old probes.
The checkpoint records the initial/final allowlisted observations and a fixed
reason, never raw registry metadata, environment variables or diagnostics.
Atomic checkpoint writes use mode 0600 and clean up temporary files.
Checkpoints always have `complete:false`, even after `reason: "committed"`;
they are restart instructions, never release completion evidence.

A failed run can leave a ledger from an earlier run in place. Consumers must
check this invocation's exit code and checkpoint; an old `complete:true`
file alone must not be treated as proof of the latest attempt. A crash after
rename but before checkpoint persistence also requires a fresh run. Use one
writer per output/checkpoint pair.

Two observations do not provide a registry transaction: an update after the
final response or a tag changing away and back between observations cannot
be detected. This boundary rejects observed changes and acquisition/snapshot
mismatches; it does not claim npm compare-and-swap or prevent another publisher.
No npm publish, tag mutation or issue closure is performed here.

## Scope relative to existing PRs

Before implementation and again before PR creation, open PRs were checked:
qmu/plgg#220 checks a single post-acquisition observation;
qmu/plgg#221 atomically saves a supplied completion snapshot;
qmu/plgg#223 binds npm acquisition context;
qmu/plgg#225 aggregates producer failures and saves one terminal JSON;
qmu/plgg#227 fixes the recovery phase order. None compares the latest tags
before acquisition and immediately before the final ledger rename.
This guard imports #225 rather than copying those implementations. Its tests
are offline and run on main without those pending producer PRs.

```sh
node --test scripts/guardPublishedTerminal.spec.mjs
sh -eu scripts/tsc-plgg.sh
sh -eu scripts/test-plgg.sh
```

A fresh clone needs `npm ci --ignore-scripts` and `sh -eu scripts/build.sh`
first so the plgg-test declarations used by the plgg typecheck exist.
