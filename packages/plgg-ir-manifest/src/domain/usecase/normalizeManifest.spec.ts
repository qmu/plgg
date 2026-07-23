import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import {
  Sexp,
  parseSexps,
  printSexp,
  boolExp,
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import { manifestStableOrder } from "plgg-ir-manifest/domain/usecase/normalizeManifest";

const at = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

/**
 * Parses one expression, normalizes it, and prints
 * the canonical text.
 */
const normalized = (source: string): string =>
  pipe(
    parseSexps(source),
    matchResult(
      (): Sexp => boolExp(true, at),
      (exprs: ReadonlyArray<Sexp>): Sexp =>
        exprs
          .slice(0, 1)
          .reduce<Sexp>(
            (_, e) => e,
            boolExp(true, at),
          ),
    ),
    manifestStableOrder.apply,
    printSexp,
  );

test("module children sort: entities by name, then aggregates", () =>
  check(
    normalized(
      "(module m (aggregate agg (root b)) (entity b) (entity a))",
    ),
    toBe(
      "(module m\n  (entity a)\n  (entity b)\n  (aggregate agg\n    (root b)))",
    ),
  ));

test("entity clauses sort: table, fields, relations, invariants", () =>
  check(
    normalized(
      "(entity e (invariant (before a b)) (relation r (cardinality one) (target e)) (field b (validate (required) (max-length 5)) (type string)) (field a (type string)) (table t))",
    ),
    toBe(
      "(entity e\n" +
        "  (table t)\n" +
        "  (field a\n    (type string))\n" +
        "  (field b\n    (type string)\n    (validate\n      (max-length 5)\n      (required)))\n" +
        "  (relation r\n    (target e)\n    (cardinality one))\n" +
        "  (invariant\n    (before a b)))",
    ),
  ));

test("expression operand order is never touched", () =>
  all([
    check(
      normalized("(invariant (before b a))"),
      toBe("(invariant\n  (before b a))"),
    ),
    check(
      normalized(
        "(validate (required-when (= z a)))",
      ),
      toBe(
        "(validate\n  (required-when\n    (= z a)))",
      ),
    ),
  ]));

test("aggregate members sort by printed text", () =>
  check(
    normalized(
      "(aggregate a (consistency immediate) (members c b) (root r))",
    ),
    toBe(
      "(aggregate a\n  (root r)\n  (members b c)\n  (consistency immediate))",
    ),
  ));

test("non-structural heads and atoms pass through", () =>
  all([
    check(
      normalized("(before b a)"),
      toBe("(before b a)"),
    ),
    check(normalized("42"), toBe("42")),
    check(normalized("()"), toBe("()")),
  ]));

test("web forms order canonically; layout stays verbatim", () =>
  all([
    check(
      normalized(
        "(view v (layout (show b) (show a)) (query (lookup p (through x)) (include c) (one e (authorized-by pol) (where (= a b)))) (scope agg) (subject (parameter p) (entity e)))",
      ),
      toBe(
        "(view v\n" +
          "  (subject\n    (entity e)\n    (parameter p))\n" +
          "  (scope agg)\n" +
          "  (query\n    (one e\n      (where\n        (= a b))\n      (authorized-by pol))\n    (include c)\n    (lookup p\n      (through x)))\n" +
          "  (layout\n    (show b)\n    (show a)))",
      ),
    ),
    check(
      normalized(
        "(action a (ensure (valid e)) (effect (set f x)) (authorize (policy p)) (input (field b (type string)) (field a (type string))) (subject e))",
      ),
      toBe(
        "(action a\n" +
          "  (subject e)\n" +
          "  (input\n    (field a\n      (type string))\n    (field b\n      (type string)))\n" +
          "  (authorize\n    (policy p))\n" +
          "  (effect\n    (set f x))\n" +
          "  (ensure\n    (valid e)))",
      ),
    ),
    check(
      normalized(
        "(projection p (fields b a) (from e))",
      ),
      toBe(
        "(projection p\n  (from e)\n  (fields a b))",
      ),
    ),
  ]));

test("normalization is idempotent (property)", () =>
  all(
    [
      "(module m (entity b) (entity a) (aggregate z (root a) (members y x)))",
      "(entity e (relation r (inverse i) (required) (cardinality one) (target e)) (field f (column c) (validate (length-between 1 2) (required)) (type (money JPY))))",
      "(validate (required) (max-length 2) (length-between 1 2))",
      "(plgg-ir 1 (module m (entity a)))",
    ].map((source) =>
      pipe(normalized(source), (once: string) =>
        check(
          pipe(
            parseSexps(once),
            matchResult(
              (): string => "reparse-failed",
              (exprs: ReadonlyArray<Sexp>) =>
                exprs
                  .slice(0, 1)
                  .map((e) =>
                    printSexp(
                      manifestStableOrder.apply(
                        e,
                      ),
                    ),
                  )
                  .join(""),
            ),
          ),
          toBe(once),
        ),
      ),
    ),
  ));
