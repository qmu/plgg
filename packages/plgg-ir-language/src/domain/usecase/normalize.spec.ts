import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import {
  Sexp,
  ListExp,
  isListExp,
  isSymbolExp,
  listExp,
  symbolExp,
  parseSexps,
  printSexp,
} from "plgg-ir-syntax";
import {
  Language,
  Normalizer,
} from "plgg-ir-language/domain/model/Language";
import {
  normalizeSexps,
  canonicalText,
} from "plgg-ir-language/domain/usecase/normalize";

/**
 * The canonical-ordering toy rule: inside any
 * `(sorted ...)` list, atoms sort by their printed
 * text (a stable-ordering normalizer, design §16.10).
 * Recurses into children first so nesting normalizes
 * too.
 */
const sortRule: Normalizer = {
  name: "sort-sorted",
  apply: (exp: Sexp): Sexp =>
    !isListExp(exp)
      ? exp
      : pipe(
          listExp(
            exp.content.items.map((item) =>
              sortRule.apply(item),
            ),
            exp.content.range,
          ),
          (rebuilt: ListExp): Sexp =>
            rebuilt.content.items
              .slice(0, 1)
              .filter(isSymbolExp)
              .some(
                (h) =>
                  h.content.name === "sorted",
              )
              ? listExp(
                  [
                    ...rebuilt.content.items.slice(
                      0,
                      1,
                    ),
                    ...[
                      ...rebuilt.content.items.slice(
                        1,
                      ),
                    ].sort((a, b) =>
                      printSexp(a) < printSexp(b)
                        ? -1
                        : printSexp(a) >
                            printSexp(b)
                          ? 1
                          : 0,
                    ),
                  ],
                  rebuilt.content.range,
                )
              : rebuilt,
        ),
};

/**
 * A second rule proving registration ORDER applies:
 * renames the head symbol `alias` to `sorted` (so
 * running before {@link sortRule} means aliased lists
 * also get sorted).
 */
const aliasRule: Normalizer = {
  name: "alias-to-sorted",
  apply: (exp: Sexp): Sexp =>
    !isListExp(exp)
      ? exp
      : listExp(
          exp.content.items.map((item, i) =>
            i === 0 &&
            isSymbolExp(item) &&
            item.content.name === "alias"
              ? symbolExp(
                  "sorted",
                  item.content.range,
                )
              : aliasRule.apply(item),
          ),
          exp.content.range,
        ),
};

const language: Language<never> = {
  forms: [],
  operators: [],
  expanders: [],
  normalizers: [aliasRule, sortRule],
};

/**
 * Parses a (valid) source into top-level expressions.
 */
const parsed = (
  source: string,
): ReadonlyArray<Sexp> =>
  pipe(
    parseSexps(source),
    matchResult(
      (): ReadonlyArray<Sexp> => [],
      (exprs: ReadonlyArray<Sexp>) => exprs,
    ),
  );

test("normalizers apply in registration order", () =>
  // alias→sorted runs first, so the sort applies to
  // the renamed list too.
  check(
    canonicalText(language)(
      parsed("(alias c a b)"),
    ),
    toBe("(sorted a b c)"),
  ));

test("normalization recurses into nested lists", () =>
  check(
    canonicalText(language)(
      parsed("(keep (sorted z y x) end)"),
    ),
    toBe("(keep\n  (sorted x y z)\n  end)"),
  ));

test("normalizeSexps is idempotent (property)", () =>
  all(
    [
      "(sorted b a)",
      "(alias 3 1 2)",
      "(outer (sorted c b a) (alias b a))",
      "plain (unrelated list)",
      '(sorted "b" "a" 2 1 true)',
    ].map((source) =>
      pipe(
        normalizeSexps(language)(parsed(source)),
        (once: ReadonlyArray<Sexp>) =>
          check(
            normalizeSexps(language)(once).map(
              printSexp,
            ),
            toEqual(once.map(printSexp)),
          ),
      ),
    ),
  ));

test("equivalent sources normalize to identical canonical text", () =>
  check(
    canonicalText(language)(
      parsed("(sorted b a c)"),
    ),
    toBe(
      canonicalText(language)(
        parsed("(alias c b a)"),
      ),
    ),
  ));
