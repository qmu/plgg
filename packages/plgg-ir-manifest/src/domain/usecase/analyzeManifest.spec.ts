import {
  test,
  check,
  all,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import {
  Sexp,
  parseSexps,
  boolExp,
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  SemType,
  integerType,
  decimalType,
  booleanType,
  stringType,
  dateType,
  nominalType,
  paramType,
} from "plgg-ir-language";
import { parseFieldType } from "plgg-ir-manifest/domain/usecase/analyzeManifest";
import { compileManifest } from "plgg-ir-manifest/domain/usecase/compileManifest";

const at = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

/**
 * Compiles a module wrapping the given entity (and
 * sibling) clauses, mapping the outcome to diagnostic
 * codes (`["ok"]` on success).
 */
const codesOf = (
  moduleChildren: string,
): ReadonlyArray<
  string | ReadonlyArray<string>
> =>
  pipe(
    compileManifest(
      `(plgg-ir 1 (module m ${moduleChildren}))`,
    ),
    matchResult(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        diags.map((d) => d.code),
      (): ReadonlyArray<string> => ["ok"],
    ),
  );

/**
 * The first parsed expression of a valid source (a
 * `true` literal fallback).
 */
const firstExpr = (source: string): Sexp =>
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
  );

/**
 * The primitive/nominal cases {@link parseFieldType}
 * must map.
 */
const TYPE_CASES: ReadonlyArray<
  readonly [string, SemType]
> = [
  ["boolean", booleanType],
  ["integer", integerType],
  ["decimal", decimalType],
  ["string", stringType],
  ["date", dateType],
  ["client-id", nominalType("client-id")],
];

test("parseFieldType maps primitives, nominals, and parameterized types", () =>
  all([
    ...TYPE_CASES.map(([source, expected]) =>
      check(
        parseFieldType(firstExpr(source)),
        okThen((t: SemType) =>
          check(t, toEqual(expected)),
        ),
      ),
    ),
    check(
      parseFieldType(firstExpr("(money JPY)")),
      okThen((t: SemType) =>
        check(
          t,
          toEqual(paramType("money", ["JPY"])),
        ),
      ),
    ),
    check(
      parseFieldType(firstExpr("(money 5)")),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["manifest.field.malformed"]),
          ),
      ),
    ),
    check(
      parseFieldType(firstExpr('"text"')),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["manifest.field.malformed"]),
          ),
      ),
    ),
  ]));

test("entity structure is closed and named", () =>
  all([
    check(
      codesOf("(entity)"),
      toEqual(["manifest.entity.malformed"]),
    ),
    check(
      codesOf("(entity e (mystery x))"),
      toEqual(["manifest.entity.unknown-form"]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string)) (relation a (target e) (cardinality one)))",
      ),
      toEqual([
        "manifest.entity.duplicate-member",
      ]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string)) (field a (type string)))",
      ),
      toEqual([
        "manifest.entity.duplicate-member",
      ]),
    ),
  ]));

test("field structure is closed: one type, known clauses", () =>
  all([
    check(
      codesOf("(entity e (field))"),
      toEqual(["manifest.field.malformed"]),
    ),
    check(
      codesOf("(entity e (field a))"),
      toEqual(["manifest.field.malformed"]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string) (type integer)))",
      ),
      toEqual(["manifest.field.malformed"]),
    ),
    check(
      codesOf("(entity e (field a (type)))"),
      toEqual(["manifest.field.malformed"]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string) (mystery)))",
      ),
      toEqual(["manifest.field.unknown-form"]),
    ),
  ]));

test("validation rules are a closed vocabulary (§9)", () =>
  all([
    check(
      codesOf(
        "(entity e (field a (type string) (validate (required) (max-length 5) (length-between 1 2))))",
      ),
      toEqual(["ok"]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string) (validate (email-format))))",
      ),
      toEqual(["manifest.field.bad-validation"]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string) (validate required)))",
      ),
      toEqual(["manifest.field.bad-validation"]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string) (validate (max-length))))",
      ),
      toEqual(["manifest.field.bad-validation"]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string) (validate (length-between 1))))",
      ),
      toEqual(["manifest.field.bad-validation"]),
    ),
    check(
      codesOf(
        "(entity e (field a (type string) (validate (required-when))))",
      ),
      toEqual(["manifest.field.bad-validation"]),
    ),
  ]));

test("required-when conditions type-check against sibling fields (§9)", () =>
  all([
    check(
      codesOf(
        '(entity customer (field customer-type (type string)) (field corporate-number (type string) (validate (required-when (= customer-type "corporation")))))',
      ),
      toEqual(["ok"]),
    ),
    // a non-boolean condition is rejected
    check(
      codesOf(
        "(entity e (field a (type string)) (field b (type string) (validate (required-when a))))",
      ),
      toEqual([
        "manifest.expression.non-boolean",
      ]),
    ),
    // unknown sibling fields are compile errors
    check(
      codesOf(
        "(entity e (field b (type string) (validate (required-when (= missing 1)))))",
      ),
      toEqual(["language.unknown-name"]),
    ),
  ]));

test("invariants are boolean cross-field conditions (§9)", () =>
  all([
    check(
      codesOf(
        "(entity contract (field starts-at (type date)) (field ends-at (type date)) (invariant (before starts-at ends-at)))",
      ),
      toEqual(["ok"]),
    ),
    check(
      codesOf(
        "(entity contract (field starts-at (type date)) (invariant starts-at))",
      ),
      toEqual([
        "manifest.expression.non-boolean",
      ]),
    ),
    check(
      codesOf("(entity e (invariant))"),
      toEqual(["manifest.entity.malformed"]),
    ),
    // nominal domain types stay distinct (§8)
    check(
      codesOf(
        "(entity e (field customer-id (type customer-id)) (field organization-id (type organization-id)) (invariant (= customer-id organization-id)))",
      ),
      toEqual(["language.type-mismatch"]),
    ),
  ]));

test("relations need a name, a target, and a valid cardinality", () =>
  all([
    check(
      codesOf("(entity e (relation))"),
      toEqual(["manifest.relation.malformed"]),
    ),
    check(
      codesOf(
        "(entity e (relation r (cardinality one)))",
      ),
      toEqual(["manifest.relation.malformed"]),
    ),
    check(
      codesOf(
        "(entity e (relation r (target e)))",
      ),
      toEqual(["manifest.relation.malformed"]),
    ),
    check(
      codesOf(
        "(entity e (relation r (target e) (cardinality several)))",
      ),
      toEqual(["manifest.relation.malformed"]),
    ),
    check(
      codesOf(
        "(entity e (relation r (target e) (cardinality one)))",
      ),
      toEqual(["ok"]),
    ),
  ]));

test("diagnostics accumulate across module children", () =>
  // the entity's field error and the unknown module
  // form are BOTH reported in one run (§35); the
  // errored entity is excluded from verification, so
  // its relation is not double-reported
  check(
    codesOf(
      "(entity e (field a) (relation r (target x) (cardinality one))) (mystery)",
    ),
    toEqual([
      "manifest.field.malformed",
      "manifest.module.unknown-form",
    ]),
  ));

test("verification runs across healthy entities", () =>
  check(
    codesOf(
      "(entity e (relation r (target ghost) (cardinality one)))",
    ),
    toEqual(["manifest.relation.unknown-target"]),
  ));

test("argument-less optional clauses fold to absent", () =>
  all([
    // (column)/(table)/(inverse) without a symbol
    // argument contribute nothing
    check(
      codesOf(
        "(entity e (table) (field a (type string) (column)) (relation r (target e) (cardinality one) (inverse)))",
      ),
      toEqual(["ok"]),
    ),
    check(
      codesOf(
        "(entity e) (aggregate a (root e) (consistency eventual))",
      ),
      toEqual(["ok"]),
    ),
  ]));
