import { proofVocabulary } from "plgg-ir-thesis-proof/domain/usecase/proofVocabulary";

/**
 * The runnable proof command (`npm run prove`). This is
 * the thin program checkpoint the owner runs on landing:
 * it loads each flagship example, runs its verification
 * pass, and prints `accept` or a ranged counterexample
 * trace. In the scaffold it only proves the wiring —
 * the verification report lands in the final ticket.
 */
const main = (): void => {
  console.log(
    `plgg-ir-thesis-proof — vocabulary: ${proofVocabulary().join(" ")}`,
  );
};

main();
