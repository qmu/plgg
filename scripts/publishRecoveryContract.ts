/**
 * The machine-readable contract fixing ONE order across a failed npm
 * publish's recovery: resume (or, failing that, rollback) settles the
 * registry state; only then may npmVersionCheck reconcile the recorded
 * intent against the live registry; only then may issueClose fire.
 *
 * This repo accumulated several publish-evidence efforts (qmu/plgg#206,
 * #214, #217, #220, #221, #223) that each gate one slice -- fix-in-main,
 * tarball hashes, registry tags, atomic persistence -- but none of them
 * fixes the CROSS-CUTTING order a recovery is allowed to run its phases
 * in. `validateRecoveryOrder` is that order, expressed once so a caller
 * can fail closed on a misordered log instead of re-deriving it. See
 * publishRecoveryContract.md for the phase table and
 * publishRecoveryContract.schema.json for a log entry's shape.
 */

/** The four recovery phases, in the order this contract fixes them. */
export type RecoveryPhase =
  | "resume"
  | "rollback"
  | "npmVersionCheck"
  | "issueClose";

export const RECOVERY_PHASE_ORDER: ReadonlyArray<RecoveryPhase> =
  ["resume", "rollback", "npmVersionCheck", "issueClose"];

export type PhaseOutcome = "ok" | "failed";

/** One recorded attempt at a phase. A phase may be retried while
 * `outcome` is `"failed"`; a log is a chronological list of attempts. */
export type PhaseAttempt = Readonly<{
  phase: RecoveryPhase;
  outcome: PhaseOutcome;
}>;

export type OrderViolationReason =
  | "NPM_VERSION_CHECK_BEFORE_SETTLED"
  | "NPM_VERSION_CHECK_AFTER_RECONCILED"
  | "ISSUE_CLOSE_BEFORE_RECONCILED"
  | "RECOVERY_PHASE_AFTER_SETTLED"
  | "PHASE_AFTER_TERMINAL_CLOSE";

export type OrderViolation = Readonly<{
  reason: OrderViolationReason;
  index: number;
  phase: RecoveryPhase;
}>;

/**
 * The fold's running state, named for what it certifies rather than for
 * which phase produced it (two different phases -- resume, rollback --
 * both lead to "settled").
 */
export type RecoveryState =
  | "settling"
  | "settled"
  | "reconciled"
  | "closed";

export type RecoveryLogResult =
  | Readonly<{ ok: true; state: RecoveryState }>
  | Readonly<{ ok: false; violation: OrderViolation }>;

const violation = (
  reason: OrderViolationReason,
  index: number,
  phase: RecoveryPhase,
): RecoveryLogResult => ({ ok: false, violation: { reason, index, phase } });

const settled = (state: RecoveryState): RecoveryLogResult => ({
  ok: true,
  state,
});

/**
 * One transition: given the state certified by every prior attempt and
 * the next attempt in the log, either the next state or the fixed
 * reason this attempt breaks the contract.
 */
const nextState = (
  state: RecoveryState,
  attempt: PhaseAttempt,
  index: number,
): RecoveryLogResult => {
  if (state === "closed") {
    return violation("PHASE_AFTER_TERMINAL_CLOSE", index, attempt.phase);
  }
  switch (attempt.phase) {
    case "resume":
    case "rollback":
      return state === "settling"
        ? settled(attempt.outcome === "ok" ? "settled" : "settling")
        : violation("RECOVERY_PHASE_AFTER_SETTLED", index, attempt.phase);
    case "npmVersionCheck":
      if (state === "settling") {
        return violation(
          "NPM_VERSION_CHECK_BEFORE_SETTLED",
          index,
          attempt.phase,
        );
      }
      return state === "reconciled"
        ? violation(
            "NPM_VERSION_CHECK_AFTER_RECONCILED",
            index,
            attempt.phase,
          )
        : settled(attempt.outcome === "ok" ? "reconciled" : "settled");
    case "issueClose":
      return state === "settling" || state === "settled"
        ? violation("ISSUE_CLOSE_BEFORE_RECONCILED", index, attempt.phase)
        : settled(attempt.outcome === "ok" ? "closed" : "reconciled");
  }
};

/**
 * Fold a whole recovery log against the fixed order, stopping at (and
 * reporting) the first attempt that breaks it. An empty log is valid --
 * recovery hasn't started -- in state `"settling"`.
 */
export const validateRecoveryOrder = (
  attempts: ReadonlyArray<PhaseAttempt>,
): RecoveryLogResult =>
  attempts.reduce<RecoveryLogResult>(
    (acc, attempt, index) =>
      acc.ok ? nextState(acc.state, attempt, index) : acc,
    settled("settling"),
  );

/**
 * The 0-based stage rank of `phase`: resume and rollback share stage 0
 * (alternative routes to "settled", never both required), so a caller
 * doing a coarse "is A allowed to precede B" check can compare ranks
 * without mistaking the two for a required sequence.
 */
const STAGE_RANK: Readonly<Record<RecoveryPhase, number>> = {
  resume: 0,
  rollback: 0,
  npmVersionCheck: 1,
  issueClose: 2,
};

export const phaseStageRank = (phase: RecoveryPhase): number =>
  STAGE_RANK[phase];
