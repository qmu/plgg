import {
  SoftStr,
  Result,
  pipe,
  mapErr,
  chainResult,
  mapResult,
} from "plgg";
import {
  Sexp,
  SyntaxDiagnostic,
  parseSexps,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  fromSyntaxDiagnostic,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import { Language } from "plgg-ir-language/domain/model/Language";
import { expandSexps } from "plgg-ir-language/domain/usecase/expand";
import { analyzeSexps } from "plgg-ir-language/domain/usecase/analyze";
import {
  normalizeSexps,
  canonicalText,
} from "plgg-ir-language/domain/usecase/normalize";

/**
 * What a full pipeline run produces: the dialect's
 * analyzed nodes, the normalized trees, and the
 * canonical text (design.md §32).
 */
export type Compiled<N> = Readonly<{
  nodes: ReadonlyArray<N>;
  normalized: ReadonlyArray<Sexp>;
  canonical: SoftStr;
}>;

/**
 * The canonical pipeline
 * `parse → expand → analyze (resolve/type-check/
 * verify via forms) → normalize → canonical print`
 * over one source text. Every stage's diagnostics
 * come back in one list; nothing throws. This is the
 * single entry point a dialect exposes to its
 * consumers.
 */
export const compileSource =
  <N>(language: Language<N>) =>
  (
    source: SoftStr,
  ): Result<
    Compiled<N>,
    ReadonlyArray<SemDiagnostic>
  > =>
    pipe(
      parseSexps(source),
      mapErr(
        (
          diags: ReadonlyArray<SyntaxDiagnostic>,
        ): ReadonlyArray<SemDiagnostic> =>
          diags.map(fromSyntaxDiagnostic),
      ),
      chainResult(expandSexps(language)),
      chainResult(
        (expanded: ReadonlyArray<Sexp>) =>
          pipe(
            analyzeSexps(language)(expanded),
            mapResult(
              (
                nodes: ReadonlyArray<N>,
              ): Compiled<N> =>
                pipe(
                  normalizeSexps(language)(
                    expanded,
                  ),
                  (
                    normalized: ReadonlyArray<Sexp>,
                  ): Compiled<N> => ({
                    nodes,
                    normalized,
                    canonical:
                      canonicalText(language)(
                        expanded,
                      ),
                  }),
                ),
            ),
          ),
      ),
    );
