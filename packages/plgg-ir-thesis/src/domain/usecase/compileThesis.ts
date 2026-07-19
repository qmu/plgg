import {
  SoftStr,
  Result,
  pipe,
  mapResult,
} from "plgg";
import {
  SemDiagnostic,
  Language,
  Compiled,
  compileSource,
} from "plgg-ir-language";
import { ThesisNode } from "plgg-ir-thesis/domain/model";
import { thesisDialect } from "plgg-ir-thesis/domain/usecase/thesisDialect";

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
 * (design.md §6, pass ①). Unknown forms/attributes,
 * malformed assertions/frames, and mixed logic kinds are
 * each a ranged diagnostic; every diagnostic of every
 * form comes back in one list.
 */
export const compileThesis = (
  source: SoftStr,
): Result<
  CompiledThesis,
  ReadonlyArray<SemDiagnostic>
> =>
  pipe(
    compileSource(thesisLanguage)(source),
    mapResult(
      (
        compiled: Compiled<ThesisNode>,
      ): CompiledThesis => ({
        nodes: compiled.nodes,
        canonical: compiled.canonical,
      }),
    ),
  );
