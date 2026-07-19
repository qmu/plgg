import { proofReport } from "plgg-ir-thesis-proof/domain/usecase/proofReport";

/**
 * The runnable proof command (`npm run prove`). The thin
 * program checkpoint the owner runs on landing: it loads
 * each flagship example, runs its verification pass, and
 * prints `accept` or the ranged counterexample trace. All
 * logic lives in the pure {@link proofReport}; this only
 * prints its lines.
 */
const main = (): void => {
  proofReport().forEach((line) =>
    console.log(line),
  );
};

main();
