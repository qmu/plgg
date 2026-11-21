import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateRecoveryOrder,
  phaseStageRank,
  RECOVERY_PHASE_ORDER,
  type PhaseAttempt,
} from "./publishRecoveryContract.ts";

test("an empty log is valid, settling has not started", () => {
  const result = validateRecoveryOrder([]);
  assert.deepEqual(result, { ok: true, state: "settling" });
});

test("resume ok -> npmVersionCheck ok -> issueClose ok reaches closed", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "resume", outcome: "ok" },
    { phase: "npmVersionCheck", outcome: "ok" },
    { phase: "issueClose", outcome: "ok" },
  ];
  assert.deepEqual(validateRecoveryOrder(log), {
    ok: true,
    state: "closed",
  });
});

test("a failed phase may be retried in place", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "resume", outcome: "failed" },
    { phase: "resume", outcome: "failed" },
    { phase: "resume", outcome: "ok" },
    { phase: "npmVersionCheck", outcome: "failed" },
    { phase: "npmVersionCheck", outcome: "ok" },
    { phase: "issueClose", outcome: "failed" },
    { phase: "issueClose", outcome: "ok" },
  ];
  assert.deepEqual(validateRecoveryOrder(log), {
    ok: true,
    state: "closed",
  });
});

test("rollback settles the log when resume never does", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "resume", outcome: "failed" },
    { phase: "rollback", outcome: "ok" },
    { phase: "npmVersionCheck", outcome: "ok" },
  ];
  assert.deepEqual(validateRecoveryOrder(log), {
    ok: true,
    state: "reconciled",
  });
});

test("npmVersionCheck before resume/rollback has settled is rejected", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "npmVersionCheck", outcome: "ok" },
  ];
  assert.deepEqual(validateRecoveryOrder(log), {
    ok: false,
    violation: {
      reason: "NPM_VERSION_CHECK_BEFORE_SETTLED",
      index: 0,
      phase: "npmVersionCheck",
    },
  });
});

test("issueClose before npmVersionCheck has reconciled is rejected", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "resume", outcome: "ok" },
    { phase: "issueClose", outcome: "ok" },
  ];
  assert.deepEqual(validateRecoveryOrder(log), {
    ok: false,
    violation: {
      reason: "ISSUE_CLOSE_BEFORE_RECONCILED",
      index: 1,
      phase: "issueClose",
    },
  });
});

test("rollback after resume already settled is rejected, not a free retry", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "resume", outcome: "ok" },
    { phase: "rollback", outcome: "ok" },
  ];
  assert.deepEqual(validateRecoveryOrder(log), {
    ok: false,
    violation: {
      reason: "RECOVERY_PHASE_AFTER_SETTLED",
      index: 1,
      phase: "rollback",
    },
  });
});

test("npmVersionCheck repeated after it already reconciled is rejected", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "resume", outcome: "ok" },
    { phase: "npmVersionCheck", outcome: "ok" },
    { phase: "npmVersionCheck", outcome: "ok" },
  ];
  assert.deepEqual(validateRecoveryOrder(log), {
    ok: false,
    violation: {
      reason: "NPM_VERSION_CHECK_AFTER_RECONCILED",
      index: 2,
      phase: "npmVersionCheck",
    },
  });
});

test("nothing may follow a closed log", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "resume", outcome: "ok" },
    { phase: "npmVersionCheck", outcome: "ok" },
    { phase: "issueClose", outcome: "ok" },
    { phase: "resume", outcome: "ok" },
  ];
  assert.deepEqual(validateRecoveryOrder(log), {
    ok: false,
    violation: {
      reason: "PHASE_AFTER_TERMINAL_CLOSE",
      index: 3,
      phase: "resume",
    },
  });
});

test("the first violation in the log wins, not the last", () => {
  const log: ReadonlyArray<PhaseAttempt> = [
    { phase: "issueClose", outcome: "ok" },
    { phase: "resume", outcome: "ok" },
  ];
  const result = validateRecoveryOrder(log);
  assert.equal(result.ok, false);
  assert.equal(
    result.ok === false && result.violation.reason,
    "ISSUE_CLOSE_BEFORE_RECONCILED",
  );
});

test("phaseStageRank groups resume and rollback at the same stage", () => {
  assert.equal(phaseStageRank("resume"), phaseStageRank("rollback"));
  assert.ok(phaseStageRank("resume") < phaseStageRank("npmVersionCheck"));
  assert.ok(
    phaseStageRank("npmVersionCheck") < phaseStageRank("issueClose"),
  );
});

test("RECOVERY_PHASE_ORDER lists all four phases in the fixed order", () => {
  assert.deepEqual(RECOVERY_PHASE_ORDER, [
    "resume",
    "rollback",
    "npmVersionCheck",
    "issueClose",
  ]);
});
