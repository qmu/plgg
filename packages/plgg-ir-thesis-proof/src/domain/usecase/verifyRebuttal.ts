import {
  SoftStr,
  pipe,
  matchOption,
} from "plgg";
import {
  SemDiagnostic,
  semError,
} from "plgg-ir-language";
import {
  Assertion,
  Relation,
  Frame,
} from "plgg-ir-thesis";
import {
  codeSurvivingPath,
  codeUnattackedRelation,
} from "plgg-ir-thesis-proof/domain/model/ProofCode";
import {
  Path,
  findPath,
  renderPath,
} from "plgg-ir-thesis-proof/domain/usecase/reachablePath";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The two orthogonal formulations of 反論の完全性
 * (rebuttal completeness, metamodel-semantics.md
 * §反論の完全性) a rebuttal frame may declare via `:要求`.
 * 遮断 (severing) is the default — logical completeness is
 * what earns the name "反論".
 */
export type Requirement = "遮断" | "被覆";

/**
 * The premise concepts of an assertion: the concepts with
 * no incoming relation (the leaves a derivation starts
 * from). The ルート concept always has incoming edges, so
 * it is never a premise.
 */
const premisesOf = (
  target: Assertion,
): ReadonlyArray<SoftStr> =>
  target.concepts
    .map((c) => c.name)
    .filter(
      (name) =>
        !target.relations.some(
          (r) => r.to === name,
        ),
    );

/**
 * The names of the target's relations that the frame
 * attacks — every `攻撃` target that resolves to a
 * relation of the target assertion. A target that
 * resolves to nothing (the ストローマン case) simply
 * matches no relation here, so the graph checks never
 * crash on it.
 */
const attackedRelationNames = (
  target: Assertion,
  frame: Frame,
): ReadonlyArray<SoftStr> =>
  target.relations
    .map((r) => r.name)
    .filter((name) =>
      frame.attacks.some(
        (a) => a.target === name,
      ),
    );

/**
 * 遮断 (severing / cut): remove every relation the frame
 * attacks, then check no premise concept still reaches
 * the ルート. Accepts (empty) when no derivation path
 * survives; otherwise the surviving path is the
 * counterexample — `¬⟨any*⟩root` failing on the residual
 * graph.
 */
export const verifySevering = (
  target: Assertion,
  frame: Frame,
): Diags => {
  const attacked = attackedRelationNames(
    target,
    frame,
  );
  const remaining: ReadonlyArray<Relation> =
    target.relations.filter(
      (r) => !attacked.includes(r.name),
    );
  return pipe(
    findPath(
      remaining,
      premisesOf(target),
      target.root,
    ),
    matchOption(
      (): Diags => [],
      (path: Path): Diags => [
        semError(
          codeSurvivingPath,
          `遮断が成立していない — 導出経路 ${renderPath(path)} が生き残っている`,
          frame.range,
        ),
      ],
    ),
  );
};

/**
 * 被覆 (coverage): check every relation of the target has
 * at least one attack mapped onto it. Accepts (empty)
 * when all are attacked; otherwise each unattacked
 * relation is a counterexample — `[U](edge → attacked)`
 * failing on that edge.
 */
export const verifyCoverage = (
  target: Assertion,
  frame: Frame,
): Diags => {
  const attacked = attackedRelationNames(
    target,
    frame,
  );
  return target.relations.flatMap(
    (r): Diags =>
      attacked.includes(r.name)
        ? []
        : [
            semError(
              codeUnattackedRelation,
              `被覆が成立していない — 関係 ${r.name} (${r.from} → ${r.to}) に攻撃対応が宣言されていない`,
              r.range,
            ),
          ],
  );
};

/**
 * Verifies a rebuttal `frame: 継続論 → 撤退論` against the
 * requirement it declares — 遮断 (default) or 被覆 —
 * returning ranged counterexample diagnostics, or an
 * empty list to accept.
 */
export const verifyRebuttal = (
  target: Assertion,
  frame: Frame,
  requirement: Requirement,
): Diags =>
  requirement === "遮断"
    ? verifySevering(target, frame)
    : verifyCoverage(target, frame);
