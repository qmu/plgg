import { SemDiagnostic } from "plgg-ir-language";
import {
  ThesisNode,
  isAssertionNode,
} from "plgg-ir-thesis/domain/model";
import { verifyAssertionFrame } from "plgg-ir-thesis/domain/usecase/verifyLogicFrame";
import { verifyFrameAttacks } from "plgg-ir-thesis/domain/usecase/verifyFrameAttacks";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The cross-node / post-analysis verification of a whole
 * thesis (design.md §6, passes ②–⑤). Each pass runs over
 * the fully structurally-analyzed node list and returns
 * ranged counterexample diagnostics; an empty result
 * accepts the thesis. Pass ② (per-assertion logic frame
 * conditions) and the pass-③ attack reference closure +
 * typing are wired here; the remaining frame-level and
 * structure-level passes are added over the following
 * tickets.
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
];
