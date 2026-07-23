import { SemDiagnostic } from "plgg-ir-language";
import {
  ThesisNode,
  isAssertionNode,
} from "plgg-ir-thesis/domain/model";
import { verifyAssertionFrame } from "plgg-ir-thesis/domain/usecase/verifyLogicFrame";
import { verifyFrameAttacks } from "plgg-ir-thesis/domain/usecase/verifyFrameAttacks";
import { verifyFrameRelations } from "plgg-ir-thesis/domain/usecase/verifyFrameRelations";
import { verifyModelChecks } from "plgg-ir-thesis/domain/usecase/verifyRequirements";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The cross-node / post-analysis verification of a whole
 * thesis (design.md §6, passes ②–⑤). Each pass runs over
 * the fully structurally-analyzed node list and returns
 * ranged counterexample diagnostics; an empty result
 * accepts the thesis. Pass ② (per-assertion logic frame
 * conditions), pass ③ (attack reference closure + typing,
 * then frame simulation / totality / composition), and
 * pass ④ (`:要求` model checking, circular reasoning,
 * intra-stance consistency) are wired here; the
 * structure-level pass is added in the following ticket.
 */
export const verifyThesis = (
  nodes: ReadonlyArray<ThesisNode>,
): Diags => [
  ...nodes
    .filter(isAssertionNode)
    .flatMap((n) =>
      verifyAssertionFrame(n.content),
    ),
  ...verifyFrameAttacks(nodes),
  ...verifyFrameRelations(nodes),
  ...verifyModelChecks(nodes),
];
