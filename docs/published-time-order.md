# npm terminal ledger time order

`node scripts/commitPublishedTimeOrder.mjs candidate.json terminal.json`
rejects terminal evidence unless `complete` is `true` and all four canonical
UTC millisecond timestamps in `npmTimeline` satisfy:

```text
fetchedAt <= preflightAt <= publishedAt <= checkedAt
```

These are the npm acquisition, preflight completion, publish completion, and
post-publish verification completion times for **one publish attempt**. Equal
milliseconds are allowed. Missing fields, offsets, date-only strings, impossible
calendar dates, and non-string values fail closed. Producers must record these
actual events, not substitute the time this boundary runs. Resuming an attempt
must retain its original acquisition and preflight times; a new acquisition
starts a new attempt. This boundary checks recorded chronology, not clock trust,
freshness, registry identity, consumer results, or version monotonicity.

Fixed reasons are `invalid-npm-timestamp`, `npm-time-order-reversed`,
`incomplete-terminal-evidence`, and `invalid-terminal-json`. CLI diagnostics
never echo input, filenames, or arbitrary exception text. Rejections leave an
existing terminal ledger untouched. Successful commits atomically replace it
with exactly the validated candidate bytes; the input is retained. The output
parent directory must already exist. I/O errors fail with `persistence-failed`.

## Integration with pending publication PRs

At implementation time the producers in qmu/plgg#221, qmu/plgg#223, and
qmu/plgg#225 are not on main. This PR adds an independently runnable commit
boundary; it does not claim the existing publisher invokes it automatically.
The producer must add `npmTimeline` with the four event timestamps above to its
candidate before opting into this stricter boundary. Existing top-level
`checkedAt` / `sourceCheckedAt` alone cannot establish all four events and must
not be guessed into a valid timeline.

qmu/plgg#228 exposes `options.rename`: pass `commitPublishedTimeOrder` there so
chronology is checked after final tag observation and before terminal replacement.
Its checkpoint remains `complete:false` on rejection and its existing catch
requires restart from acquisition. To retain this PR's specific rejection reason
in that checkpoint, its catch must map these fixed reasons explicitly instead
of collapsing them to `terminal-boundary-failed`. Callers of this CLI already
receive the fixed reason and a nonzero exit code.

qmu/plgg#232 owns comparison against previous package versions and writer locking.
When combining boundaries, validate chronology **inside that writer lock** before
its final rename; do not run two independent commit operations. Other validators
must still run. All writers must use the combined boundary; direct writes bypass
it. This module does not publish npm packages, move tags, close issues, coordinate
concurrent writers, or promise crash durability after a power loss.

Offline tests: `node --test scripts/commitPublishedTimeOrder.spec.mjs`.
