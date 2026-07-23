import {
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  matchOption,
  chainResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  sexpRange,
  isListExp,
  isSymbolExp,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  semError,
  codeInvalidForm,
  codeUnknownForm,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import {
  Scope,
  rootScope,
  mergeBindings,
} from "plgg-ir-language/domain/model/Scope";
import {
  Language,
  FormDef,
  AnalysisContext,
  findForm,
} from "plgg-ir-language/domain/model/Language";
import { checkExprOf } from "plgg-ir-language/domain/usecase/checkExpr";
import { partitionResults } from "plgg-ir-language/domain/usecase/accumulate";

/**
 * A form expression resolved to its list shape and
 * registered definition.
 */
type ResolvedForm<N> = Readonly<{
  list: ListExp;
  def: FormDef<N>;
}>;

/**
 * The head of a list, when it is a symbol.
 */
const symbolHead = (
  list: ListExp,
): Option<SymbolExp> =>
  list.content.items
    .slice(0, 1)
    .filter(isSymbolExp)
    .reduce<Option<SymbolExp>>(
      (_, h) => some(h),
      none(),
    );

/**
 * The resolver's result shape.
 */
type Resolved<N> = Result<
  ResolvedForm<N>,
  ReadonlyArray<SemDiagnostic>
>;

/**
 * Resolves one expression as a form: it must be a
 * `(head-symbol ...)` list whose head names a
 * registered form (`language.invalid-form` /
 * `language.unknown-form` otherwise — the vocabulary
 * is closed, design.md §34).
 */
const resolveForm =
  <N>(language: Language<N>) =>
  (exp: Sexp): Resolved<N> =>
    !isListExp(exp)
      ? err([
          semError(
            codeInvalidForm,
            "a form must be a (head-symbol ...) list",
            sexpRange(exp),
          ),
        ])
      : pipe(
          symbolHead(exp),
          matchOption(
            (): Resolved<N> =>
              err([
                semError(
                  codeInvalidForm,
                  "a form must start with a form-name symbol",
                  exp.content.range,
                ),
              ]),
            (head: SymbolExp): Resolved<N> =>
              pipe(
                findForm(
                  language,
                  head.content.name,
                ),
                matchOption(
                  (): Resolved<N> =>
                    err([
                      semError(
                        codeUnknownForm,
                        `unknown form ${JSON.stringify(head.content.name)}`,
                        head.content.range,
                      ),
                    ]),
                  (
                    def: FormDef<N>,
                  ): Resolved<N> =>
                    ok({ list: exp, def }),
                ),
              ),
          ),
        );

/**
 * Builds the {@link AnalysisContext} handed to every
 * form: the scope plus the two recursion seams.
 * Exported for `mapDialect`, which rebuilds a mapped
 * form's context closed over its own dialect.
 */
export const contextOf = <N>(
  language: Language<N>,
  scope: Scope,
): AnalysisContext<N> => ({
  scope,
  language,
  checkExpr: (exp, s) =>
    checkExprOf(language)(exp, s),
  analyzeForm: (exp, s) =>
    pipe(
      resolveForm(language)(exp),
      chainResult((r: ResolvedForm<N>) =>
        r.def.analyze(
          r.list,
          contextOf(language, s),
        ),
      ),
    ),
});

/**
 * The analysis passes (design.md §32): resolve every
 * top-level form, run each form's `declare` (pass 1 —
 * so forward references work), merge the declarations
 * into the root scope (duplicates diagnosed), then run
 * each form's `analyze` (pass 2) against the full
 * scope. Diagnostics accumulate across every stage and
 * every form; any error fails the whole run with all
 * of them.
 */
export const analyzeSexps =
  <N>(language: Language<N>) =>
  (
    exprs: ReadonlyArray<Sexp>,
  ): Result<
    ReadonlyArray<N>,
    ReadonlyArray<SemDiagnostic>
  > =>
    pipe(
      partitionResults(
        exprs.map(resolveForm(language)),
      ),
      (resolved) =>
        pipe(
          partitionResults(
            resolved.values.map((r) =>
              r.def.declare(r.list),
            ),
          ),
          (declared) =>
            pipe(
              mergeBindings(
                declared.values.flat(),
              ),
              (merged) =>
                pipe(
                  rootScope(merged.bindings),
                  (scope: Scope) =>
                    pipe(
                      partitionResults(
                        resolved.values.map((r) =>
                          r.def.analyze(
                            r.list,
                            contextOf(
                              language,
                              scope,
                            ),
                          ),
                        ),
                      ),
                      (analyzed) =>
                        pipe(
                          [
                            ...resolved.errors,
                            ...declared.errors,
                            ...merged.diagnostics,
                            ...analyzed.errors,
                          ],
                          (
                            all: ReadonlyArray<SemDiagnostic>,
                          ) =>
                            all.length === 0
                              ? ok(
                                  analyzed.values,
                                )
                              : err(all),
                        ),
                    ),
                ),
            ),
        ),
    );
