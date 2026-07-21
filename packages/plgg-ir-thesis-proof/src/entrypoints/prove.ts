import { proofReport } from "plgg-ir-thesis-proof/domain/usecase/proofReport";

/**
 * The runnable proof command (`npm run prove`). The thin
 * program checkpoint the owner runs on landing: it loads
 * each flagship example, runs its verification pass, and
 * prints `accept` or the ranged counterexample trace. All
 * logic lives in the pure {@link proofReport}; this only
 * prints its lines.
 *
 * Exported (not run at module top level) so the bundler
 * can evaluate this module during the build without
 * printing — `bin/prove.mjs` is the sole caller.
 */
export const runProve = (): void => {
  proofReport().forEach((line) =>
    console.log(line),
  );
};
