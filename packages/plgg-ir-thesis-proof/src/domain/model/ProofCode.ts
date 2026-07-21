/**
 * The proof example's counterexample diagnostic codes,
 * in the family-wide `namespace.kebab-case` shape. Each
 * names one way a rebuttal frame fails the completeness
 * property it declares; the verification passes return
 * them as ranged {@link SemDiagnostic} counterexamples,
 * and an empty result accepts.
 */

/**
 * 遮断 (severing) is not satisfied: after removing the
 * relations the rebuttal attacks, a derivation path from
 * a premise concept to the ルート concept still survives.
 * The diagnostic names the surviving path.
 */
export const codeSurvivingPath =
  "thesis-proof.surviving-path";

/**
 * 被覆 (coverage) is not satisfied: a 関係 of the target
 * assertion has no attack mapped onto it. The diagnostic
 * names the unattacked relation.
 */
export const codeUnattackedRelation =
  "thesis-proof.unattacked-relation";
