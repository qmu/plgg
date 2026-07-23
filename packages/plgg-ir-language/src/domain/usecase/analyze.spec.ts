import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import {
  Result,
  Option,
  ok,
  err,
  some,
  none,
  pipe,
  matchResult,
  matchOption,
  chainResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  isSymbolExp,
  parseSexps,
} from "plgg-ir-syntax";
import {
  SemType,
  booleanType,
  integerType,
  stringType,
  decimalType,
  dateType,
  nominalType,
  isAssignable,
  formatSemType,
} from "plgg-ir-language/domain/model/SemType";
import {
  SemDiagnostic,
  semError,
  semMismatch,
  codeTypeMismatch,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import {
  Binding,
  binding,
} from "plgg-ir-language/domain/model/Scope";
import {
  TypedExpr,
  typedExprType,
} from "plgg-ir-language/domain/model/TypedExpr";
import {
  Language,
  FormDef,
  defineOperator,
  fixedSignature,
  declaresNothing,
} from "plgg-ir-language/domain/model/Language";
import { analyzeSexps } from "plgg-ir-language/domain/usecase/analyze";

/**
 * The toy dialect's node.
 */
type ToyNode = Readonly<{
  form: string;
  name: string;
}>;

/**
 * The symbol at `items[index]` of a form, if present.
 */
const symbolAt = (
  form: ListExp,
  index: number,
): Option<SymbolExp> =>
  form.content.items
    .slice(index, index + 1)
    .filter(isSymbolExp)
    .reduce<Option<SymbolExp>>(
      (_, s) => some(s),
      none(),
    );

/**
 * Maps a type symbol to a semantic type: the shared
 * primitives by name, anything else nominal.
 */
const typeOf = (name: string): SemType =>
  name === "boolean"
    ? booleanType
    : name === "integer"
      ? integerType
      : name === "decimal"
        ? decimalType
        : name === "string"
          ? stringType
          : name === "date"
            ? dateType
            : nominalType(name);

/**
 * `(def <name> <type>)` — declares a value binding
 * (pass 1) and produces a node (pass 2).
 */
const defForm: FormDef<ToyNode> = {
  name: "def",
  declare: (form) =>
    pipe(
      symbolAt(form, 1),
      matchOption(
        (): Result<
          ReadonlyArray<Binding>,
          ReadonlyArray<SemDiagnostic>
        > =>
          err([
            semError(
              "toy.bad-def",
              "def needs (def <name> <type>)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          pipe(
            symbolAt(form, 2),
            matchOption(
              (): Result<
                ReadonlyArray<Binding>,
                ReadonlyArray<SemDiagnostic>
              > =>
                err([
                  semError(
                    "toy.bad-def",
                    "def needs a type symbol",
                    form.content.range,
                  ),
                ]),
              (type: SymbolExp) =>
                ok([
                  binding(
                    "value",
                    name.content.name,
                    some(
                      typeOf(type.content.name),
                    ),
                    name.content.range,
                  ),
                ]),
            ),
          ),
      ),
    ),
  analyze: (form) =>
    pipe(
      symbolAt(form, 1),
      matchOption(
        (): Result<
          ToyNode,
          ReadonlyArray<SemDiagnostic>
        > =>
          err([
            semError(
              "toy.bad-def",
              "def needs (def <name> <type>)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          ok({
            form: "def",
            name: name.content.name,
          }),
      ),
    ),
};

/**
 * `(check <expr>)` — type-checks its expression to
 * boolean (pass 2 only).
 */
const checkForm: FormDef<ToyNode> = {
  name: "check",
  declare: declaresNothing,
  analyze: (form, ctx) =>
    pipe(
      form.content.items
        .slice(1, 2)
        .map((exp: Sexp) =>
          ctx.checkExpr(exp, ctx.scope),
        )
        .reduce<
          Result<
            TypedExpr,
            ReadonlyArray<SemDiagnostic>
          >
        >(
          (_, r) => r,
          err([
            semError(
              "toy.bad-check",
              "check needs an expression",
              form.content.range,
            ),
          ]),
        ),
      chainResult(
        (
          e: TypedExpr,
        ): Result<
          ToyNode,
          ReadonlyArray<SemDiagnostic>
        > =>
          isAssignable(booleanType)(
            typedExprType(e),
          )
            ? ok({ form: "check", name: "" })
            : err([
                semMismatch(
                  codeTypeMismatch,
                  `check requires boolean but found ${formatSemType(typedExprType(e))}`,
                  form.content.range,
                  "boolean",
                  formatSemType(typedExprType(e)),
                ),
              ]),
      ),
    ),
};

/**
 * `(group ...)` — analyzes each child as a nested
 * form (exercises `ctx.analyzeForm`).
 */
const groupForm: FormDef<ToyNode> = {
  name: "group",
  declare: declaresNothing,
  analyze: (form, ctx) =>
    pipe(
      form.content.items
        .slice(1)
        .map((child: Sexp) =>
          ctx.analyzeForm(child, ctx.scope),
        ),
      (results) =>
        results.reduce(
          (
            acc: Result<
              ToyNode,
              ReadonlyArray<SemDiagnostic>
            >,
            r,
          ) =>
            pipe(
              acc,
              chainResult(() => r),
            ),
          ok({ form: "group", name: "" }),
        ),
    ),
};

const language: Language<ToyNode> = {
  forms: [defForm, checkForm, groupForm],
  operators: [
    defineOperator(
      ">=",
      fixedSignature(
        [integerType, integerType],
        booleanType,
      ),
    ),
  ],
  expanders: [],
  normalizers: [],
};

/**
 * Parses and analyzes a source with the toy dialect.
 */
const analyzed = (source: string) =>
  pipe(
    parseSexps(source),
    matchResult(
      (): ReadonlyArray<Sexp> => [],
      (exprs: ReadonlyArray<Sexp>) => exprs,
    ),
    analyzeSexps(language),
  );

test("forms declare then analyze; forward references resolve", () =>
  // `check` references `age` BEFORE its def — the
  // two-phase analysis makes it resolve (design §14).
  check(
    analyzed(
      "(check (>= age 18)) (def age integer)",
    ),
    okThen((nodes: ReadonlyArray<ToyNode>) =>
      check(
        nodes.map((n) => n.form),
        toEqual(["check", "def"]),
      ),
    ),
  ));

test("unknown forms are compile errors (closed vocabulary)", () =>
  check(
    analyzed("(entity client)"),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["language.unknown-form"]),
        ),
    ),
  ));

test("a form must be a list with a symbol head", () =>
  all([
    check(
      analyzed("42"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["language.invalid-form"]),
          ),
      ),
    ),
    check(
      analyzed("(42 def)"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["language.invalid-form"]),
          ),
      ),
    ),
  ]));

test("duplicate declarations are diagnosed with the first location", () =>
  check(
    analyzed(
      "(def age integer) (def age string)",
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        all([
          check(
            diags.map((d) => d.code),
            toEqual(["language.duplicate-name"]),
          ),
          check(
            diags.flatMap((d) =>
              d.related.map((r) => r.message),
            ),
            toEqual(["first declared here"]),
          ),
        ]),
    ),
  ));

test("declare-pass and analyze-pass diagnostics accumulate", () =>
  check(
    analyzed(
      "(def) (check (>= missing 18)) (unknown x)",
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual([
            "language.unknown-form",
            "toy.bad-def",
            "toy.bad-def",
            "language.unknown-name",
          ]),
        ),
    ),
  ));

test("nested forms analyze through ctx.analyzeForm", () =>
  all([
    check(
      analyzed(
        "(def age integer) (group (check (>= age 18)))",
      ),
      okThen((nodes: ReadonlyArray<ToyNode>) =>
        check(nodes.length, toBe(2)),
      ),
    ),
    check(
      analyzed("(group (entity x))"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["language.unknown-form"]),
          ),
      ),
    ),
  ]));

test("type errors in checks carry expected/actual", () =>
  check(
    analyzed(
      "(def name string) (check (>= name 18))",
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.message),
          toEqual([
            "operand 1: expected integer but found string",
          ]),
        ),
    ),
  ));
