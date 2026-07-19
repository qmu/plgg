import {
  SoftStr,
  Result,
  ok,
  err,
  pipe,
  chainResult,
} from "plgg";
import {
  SemDiagnostic,
  Language,
  Compiled,
  compileSource,
} from "plgg-ir-language";
import { ThesisNode } from "plgg-ir-thesis/domain/model";
import { thesisDialect } from "plgg-ir-thesis/domain/usecase/thesisDialect";
import { verifyThesis } from "plgg-ir-thesis/domain/usecase/verifyThesis";

/**
 * The Thesis language: exactly {@link thesisDialect},
 * finished — derived, so the two exports cannot drift.
 */
export const thesisLanguage: Language<ThesisNode> =
  thesisDialect;

/**
 * What compiling a thesis source produces: the analyzed
 * argumentation nodes (assertions + frames) plus the
 * canonical text. The cross-node verification passes
 * (frame conditions, reference closure, model checking,
 * grounded extension) layer onto this entry in the
 * following tickets.
 */
export type CompiledThesis = Readonly<{
  nodes: ReadonlyArray<ThesisNode>;
  canonical: SoftStr;
}>;

/**
 * Compiles one Thesis source through the language
 * pipeline `parse → expand → analyze → normalize`
 * (pass ①), then runs the thesis verification passes
 * (design.md §6, passes ②–⑤) over the analyzed nodes.
 * Unknown forms/attributes, malformed assertions/frames,
 * mixed logic kinds, and per-logic frame-condition
 * violations (cyclic 時間的/構成的, non-monotonic `:時点`,
 * unbalanced 移動的 transfer, mixed `:種`) are each a
 * ranged diagnostic; every diagnostic comes back in one
 * list.
 */
export const compileThesis = (
  source: SoftStr,
): Result<
  CompiledThesis,
  ReadonlyArray<SemDiagnostic>
> =>
  pipe(
    compileSource(thesisLanguage)(source),
    chainResult(
      (
        compiled: Compiled<ThesisNode>,
      ): Result<
        CompiledThesis,
        ReadonlyArray<SemDiagnostic>
      > =>
        pipe(
          verifyThesis(compiled.nodes),
          (
            diags: ReadonlyArray<SemDiagnostic>,
          ) =>
            diags.length > 0
              ? err(diags)
              : ok({
                  nodes: compiled.nodes,
                  canonical: compiled.canonical,
                }),
        ),
    ),
  );
