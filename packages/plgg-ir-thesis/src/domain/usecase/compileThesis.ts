import {
  SoftStr,
  Result,
  ok,
  err,
  pipe,
  chainResult,
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
import { verifyThesis } from "plgg-ir-thesis/domain/usecase/verifyThesis";
import { groundedExtension } from "plgg-ir-thesis/domain/usecase/groundedExtension";

/**
 * The Thesis language: exactly {@link thesisDialect},
 * finished — derived, so the two exports cannot drift.
 */
export const thesisLanguage: Language<ThesisNode> =
  thesisDialect;

/**
 * What compiling a thesis source produces: the analyzed
 * argumentation nodes (assertions + frames), the canonical
 * versioned `(plgg-ir-thesis 1 ...)` IR text, and the
 * structure-level surviving set — the Dung grounded
 * extension over the attack graph (design.md §5.12).
 */
export type CompiledThesis = Readonly<{
  nodes: ReadonlyArray<ThesisNode>;
  canonical: SoftStr;
  surviving: ReadonlyArray<SoftStr>;
}>;

/**
 * Wraps the normalized bare canonical text in the
 * versioned root envelope `(plgg-ir-thesis 1 ...)`
 * (design.md §6, §33).
 */
const versionedIr = (bare: SoftStr): SoftStr =>
  `(plgg-ir-thesis 1 ${bare})`;

/**
 * The deterministic, idempotent canonical normalization of
 * a thesis source, as re-parseable **bare** top-level
 * forms (`normalize ∘ normalize = normalize`). This is the
 * inner text the versioned IR envelope wraps; running it on
 * its own output yields identical text. Structural only —
 * it does not run the verification passes.
 */
export const normalizeThesisSource = (
  source: SoftStr,
): Result<
  SoftStr,
  ReadonlyArray<SemDiagnostic>
> =>
  pipe(
    compileSource(thesisLanguage)(source),
    mapResult(
      (c: Compiled<ThesisNode>): SoftStr =>
        c.canonical,
    ),
  );

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
                  canonical: versionedIr(
                    compiled.canonical,
                  ),
                  surviving: groundedExtension(
                    compiled.nodes,
                  ),
                }),
        ),
    ),
  );
