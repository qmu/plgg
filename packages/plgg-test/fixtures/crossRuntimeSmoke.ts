// Cross-runtime smoke: drives the plgg-test SCHEDULER on whichever
// runtime is executing this file, and exits non-zero if its contract
// does not hold.
//
// The mission's hard constraint is that the runner behaves identically
// on Node, Deno and Bun — the reason `worker_threads` was ruled out in
// favour of promises and child processes. This is what checks it, rather
// than asserting it: `scripts/gate-cross-runtime.sh` runs this file under
// every runtime present on the machine.
//
// Deliberately NOT covered here, because they are launcher concerns and
// genuinely Node-specific:
//   - `bin/plgg-test.mjs`, which spawns children with Node flags
//     (`--experimental-strip-types --import …`);
//   - the `module.register` resolver hook behind the `plgg-test/index`
//     self-alias;
//   - `NODE_V8_COVERAGE` collection.
// The scheduler below is the part that must be portable, and it is.
import { runFile } from "../src/Core/Runner.ts";
import { tally } from "../src/Core/Reporter.ts";

const here = new URL(".", import.meta.url)
  .pathname;

const main = async (): Promise<void> => {
  const results = await runFile(
    `${here}_crossRuntimeFixture.spec.ts`,
  );
  const verdict = tally(results);
  const order = results.map((r) =>
    r.names.join(" > "),
  );
  const expected = [
    "concurrent block > c1",
    "concurrent block > c2",
    "serial block > s1",
    "serial block > s2",
    "verdict > independent tests actually overlapped",
    "verdict > a serial block stayed indivisible",
    "verdict > beforeEach/afterEach still bracket a test",
  ];
  const problems = [
    ...(verdict.failed === 0
      ? []
      : [
          `${verdict.failed} test(s) failed: ` +
            results
              .filter(
                (r) => r.outcome === "failed",
              )
              .map(
                (r) =>
                  `${r.names.join(" > ")} — ${r.message}`,
              )
              .join("; "),
        ]),
    ...(verdict.passed === expected.length
      ? []
      : [
          `expected ${expected.length} passing tests, got ${verdict.passed}`,
        ]),
    ...(order.join("|") === expected.join("|")
      ? []
      : [
          `report order is not registration order: ${order.join(", ")}`,
        ]),
  ];
  process.stdout.write(
    problems.length === 0
      ? `cross-runtime smoke: OK — ${verdict.passed} passed, concurrency and suite.serial both behaved\n`
      : `cross-runtime smoke: FAILED\n  ${problems.join("\n  ")}\n`,
  );
  process.exitCode = problems.length === 0 ? 0 : 1;
};

void main();
