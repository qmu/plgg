# The publish recovery order contract

When `scripts/publish-npm.sh` fails partway through a multi-package publish
set, several follow-up efforts in this repo each gate one slice of what
happens next (qmu/plgg#206 decides what to integrate and when to roll back;
qmu/plgg#214 inspects the live npm bundle/view behavior; qmu/plgg#217 gates
integrated fixes against actual npm releases; qmu/plgg#220 binds the
completion ledger to npm tags; qmu/plgg#221 persists Node 24 / TS7 evidence
atomically; qmu/plgg#223 binds that evidence to one npm acquisition
context). None of them fixes the order those slices are allowed to run in.
`scripts/publishRecoveryContract.ts` is that order, expressed once as a
small state machine so a caller can validate a recovery log instead of
re-deriving the rule.

## The four phases, in the one fixed order

| phase             | may run when…                                   | reaches…     |
| ----------------- | ------------------------------------------------ | ------------ |
| `resume`          | the registry state is not yet settled            | `settled`†   |
| `rollback`        | the registry state is not yet settled            | `settled`†   |
| `npmVersionCheck` | the registry state is settled, not yet reconciled | `reconciled` |
| `issueClose`      | the registry state is reconciled                 | `closed`     |

† `resume` and `rollback` are **alternatives**, not two required steps:
whichever one first reaches `outcome: "ok"` settles the registry state.
Retrying the *same* phase while it keeps failing (`outcome: "failed"`) is
always allowed and never advances the state; retrying a phase that already
reached `"ok"`, or running an earlier-stage phase after a later one has
settled, is rejected — this is a single terminal order, not a graph you can
re-enter.

```
settling --resume ok OR rollback ok--> settled
settled  --npmVersionCheck ok------------> reconciled
reconciled --issueClose ok----------------> closed
```

- `resume`: continue the interrupted publish set (`publish-npm.sh`'s
  preflight already recomputes local-vs-registry, so re-running it only
  retries the packages that didn't make it).
- `rollback`: when resuming can't recover, recommend/pin consumers to the
  last known-good version (npm has no safe unpublish; this repo's rollback
  is a pin, never a deletion — see qmu/plgg#217's `rollbackTarget`).
- `npmVersionCheck`: reconcile the recorded intent against what the
  registry *actually* holds (version, tag, tarball hash) — never trust a
  local gate result as a stand-in for this.
- `issueClose`: close a tracking issue (e.g. qmu/plgg#155, #156) only once
  `npmVersionCheck` reached `"ok"`; a green local `check-all.sh` is not
  evidence the fix is live.

## Why this file exists

`validateRecoveryOrder` (see `publishRecoveryContract.ts`) folds a
chronological log of `{ phase, outcome }` attempts against this table and
returns the first attempt that breaks it, with one of a fixed set of reason
codes (`NPM_VERSION_CHECK_BEFORE_SETTLED`,
`NPM_VERSION_CHECK_AFTER_RECONCILED`, `ISSUE_CLOSE_BEFORE_RECONCILED`,
`RECOVERY_PHASE_AFTER_SETTLED`, `PHASE_AFTER_TERMINAL_CLOSE`) — the same
fail-closed, fixed-reason-code shape qmu/plgg#217's postpublish boundary
already uses. `publishRecoveryContract.schema.json` fixes the shape of one
log entry (JSON Schema can't express the stateful sequencing itself, which
is why the validator exists in TypeScript rather than schema alone).

This module does not re-implement any of #206/#214/#217/#220/#221/#223's
hash or tag comparisons; a future caller feeds their outcomes in as
`PhaseAttempt`s.
