/**
 * Meta-harness — the bootstrap trust anchor (guardrail 6).
 *
 * Uses ONLY plain `throw`/`console` (never plgg-test's own assertion
 * API) to prove the anti-false-green guard against the CLOSED set of
 * drop-shapes before any self-spec is trusted. Each case must be
 * recorded as a FAILED test by the runner:
 *   (a) body returns void/undefined while an assertion was computed
 *   (b) body returns a different (passing) Result than the one computed
 *   (c) async Promise<Assertion> not awaited (fire-and-forget)
 *   (d) proc/all short-circuits or swallows an inner Err
 *   (e) body returns a non-Result truthy value
 * Plus: a returned Fail is failed; a returned Pass is passed; `all`
 * with one Err among many fails AND surfaces every Err.
 *
 * Run: node --import <register> src/Core/_meta.ts → "META OK" + exit 0
 * only if every property holds.
 */
import { runFile } from "plgg-test/Core/Runner";
import { tally } from "plgg-test/Core/Reporter";
import {
  fileURLToPath,
} from "node:url";
import {
  dirname,
  join,
} from "node:path";

const check = (
  label: string,
  cond: boolean,
): void => {
  if (!cond) {
    console.error(
      `META FAIL: ${label}`,
    );
    process.exit(1);
  }
};

const fixture = (
  name: string,
): string =>
  join(
    dirname(
      fileURLToPath(import.meta.url),
    ),
    "..",
    "..",
    "fixtures",
    name,
  );

const main =
  async (): Promise<void> => {
    const results = await runFile(
      fixture(
        "_metaFixture.spec.ts",
      ),
    );
    const byName = new Map(
      results.map((r) => [
        r.names[
          r.names.length - 1
        ] ?? "",
        r.outcome,
      ]),
    );
    const outcome = (
      name: string,
    ): string =>
      byName.get(name) ?? "MISSING";

    // Happy paths.
    check(
      "returned Pass → passed",
      outcome(
        "returns a passing assertion",
      ) === "passed",
    );
    check(
      "returned Fail → failed",
      outcome(
        "returns a failing assertion",
      ) === "failed",
    );
    // Drop-shapes (each must FAIL).
    check(
      "(a) void return → failed",
      outcome(
        "drops the assertion and returns void",
      ) === "failed",
    );
    check(
      "(b) different passing Result → failed",
      outcome(
        "returns a bare domain Result not an assertion",
      ) === "failed",
    );
    check(
      "(c) not-awaited async assertion → failed",
      outcome(
        "fires an async assertion without returning it",
      ) === "failed",
    );
    check(
      "(e) non-Result truthy → failed",
      outcome(
        "returns a non-Result truthy value",
      ) === "failed",
    );
    // `all` aggregation surfaces every failure.
    check(
      "(d) all reports failed when one of many fails",
      outcome(
        "all with one failure among several fails",
      ) === "failed",
    );

    const v = tally(results);
    check(
      "exit code is non-zero when failures exist",
      v.failed > 0,
    );

    console.log("META OK");
    process.exit(0);
  };

void main();
