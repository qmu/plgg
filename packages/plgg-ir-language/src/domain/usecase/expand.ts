import {
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  match,
  matchOption,
  chainResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  listExp,
  isSymbolExp,
  symbolExp$,
  strExp$,
  numExp$,
  boolExp$,
  listExp$,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  semError,
  codeExpansionDepth,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import {
  Language,
  Expander,
  findExpander,
} from "plgg-ir-language/domain/model/Language";
import { allOrErrors } from "plgg-ir-language/domain/usecase/accumulate";

/**
 * The expander pass's result shape.
 */
type Expanded = Result<
  Sexp,
  ReadonlyArray<SemDiagnostic>
>;

/**
 * How many times one node may be rewritten before the
 * pass declares the expander self-producing
 * (`language.expansion-depth`).
 */
const DEPTH_LIMIT = 25;

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
 * Expands one node bottom-up: children first, then —
 * when the list's head names a registered expander —
 * the rewrite applies and its output is expanded
 * again (bounded by {@link DEPTH_LIMIT}).
 */
const expandAt =
  <N>(language: Language<N>, depth: number) =>
  (exp: Sexp): Expanded =>
    match(exp)(
      [symbolExp$(), (): Expanded => ok(exp)],
      [strExp$(), (): Expanded => ok(exp)],
      [numExp$(), (): Expanded => ok(exp)],
      [boolExp$(), (): Expanded => ok(exp)],
      [
        listExp$(),
        (list: ListExp): Expanded =>
          pipe(
            allOrErrors(
              list.content.items.map(
                expandAt(language, depth),
              ),
            ),
            chainResult(
              (
                items: ReadonlyArray<Sexp>,
              ): Expanded =>
                expandRebuilt(
                  language,
                  depth,
                )(
                  listExp(
                    items,
                    list.content.range,
                  ),
                ),
            ),
          ),
      ],
    );

/**
 * Applies a matching expander to a rebuilt list (its
 * children already expanded), re-expanding the
 * rewrite's output.
 */
const expandRebuilt =
  <N>(language: Language<N>, depth: number) =>
  (rebuilt: ListExp): Expanded =>
    pipe(
      symbolHead(rebuilt),
      matchOption(
        (): Expanded => ok(rebuilt),
        (head: SymbolExp): Expanded =>
          pipe(
            findExpander(
              language,
              head.content.name,
            ),
            matchOption(
              (): Expanded => ok(rebuilt),
              (expander: Expander): Expanded =>
                depth >= DEPTH_LIMIT
                  ? err([
                      semError(
                        codeExpansionDepth,
                        `expansion of ${JSON.stringify(head.content.name)} exceeded depth ${DEPTH_LIMIT} (self-producing expander?)`,
                        rebuilt.content.range,
                      ),
                    ])
                  : pipe(
                      expander.apply(rebuilt),
                      chainResult(
                        expandAt(
                          language,
                          depth + 1,
                        ),
                      ),
                    ),
            ),
          ),
      ),
    );

/**
 * The expand pass (design.md §32/§33): rewrites every
 * registered shorthand into its explicit form before
 * analysis, so the canonical representation never
 * contains sugar. Diagnostics accumulate across all
 * top-level expressions.
 */
export const expandSexps =
  <N>(language: Language<N>) =>
  (
    exprs: ReadonlyArray<Sexp>,
  ): Result<
    ReadonlyArray<Sexp>,
    ReadonlyArray<SemDiagnostic>
  > =>
    allOrErrors(exprs.map(expandAt(language, 0)));
