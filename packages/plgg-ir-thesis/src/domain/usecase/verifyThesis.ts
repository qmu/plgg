import { SemDiagnostic } from "plgg-ir-language";
import {
  ThesisNode,
  isAssertionNode,
} from "plgg-ir-thesis/domain/model";
import { verifyAssertionFrame } from "plgg-ir-thesis/domain/usecase/verifyLogicFrame";

type Diags = ReadonlyArray<SemDiagnostic>;

/**
 * The cross-node / post-analysis verification of a whole
 * thesis (design.md §6, passes ②–⑤). Each pass runs over
 * the fully structurally-analyzed node list and returns
 * ranged counterexample diagnostics; an empty result
 * accepts the thesis. Pass ② (per-assertion logic frame
 * conditions) is wired here; the frame-level and
 * structure-level passes are added over the following
 * tickets.
 */
export const verifyThesis = (
  nodes: ReadonlyArray<ThesisNode>,
): Diags =>
  nodes
    .filter(isAssertionNode)
    .flatMap((n) =>
      verifyAssertionFrame(n.content),
    );
