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
  matchOption,
  chainResult,
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  isSymbolExp,
  listExp,
  symbolExp,
} from "plgg-ir-syntax";
import {
  SemType,
  booleanType,
  integerType,
  stringType,
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
import {
  Compiled,
  compileSource,
} from "plgg-ir-language/domain/usecase/pipeline";

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
 * Maps a type symbol to a semantic type (primitives by
 * name, anything else nominal).
 */
const typeOf = (name: string): SemType =>
  name === "boolean"
    ? booleanType
    : name === "integer"
      ? integerType
      : name === "string"
        ? stringType
        : nominalType(name);

/**
 * `(def <name> <type>)`.
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
 * `(check <expr>)` — boolean-typed expression.
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
 * The full toy language: forms, operators, the
 * `(flag n)` → `(def n boolean)` shorthand, and a
 * normalizer sorting `(sorted ...)` children.
 */
const language: Language<ToyNode> = {
  forms: [defForm, checkForm],
  operators: [
    defineOperator(
      ">=",
      fixedSignature(
        [integerType, integerType],
        booleanType,
      ),
    ),
    defineOperator(
      "and",
      fixedSignature(
        [booleanType, booleanType],
        booleanType,
      ),
    ),
  ],
  expanders: [
    {
      name: "flag",
      apply: (form: ListExp) =>
        ok(
          listExp(
            [
              symbolExp(
                "def",
                form.content.range,
              ),
              ...form.content.items.slice(1),
              symbolExp(
                "boolean",
                form.content.range,
              ),
            ],
            form.content.range,
          ),
        ),
    },
  ],
  normalizers: [],
};

const compile = compileSource(language);

test("the full pipeline compiles a valid source", () =>
  check(
    compile(
      "; a toy program\n(def age integer)\n(flag active)\n(check (and (>= age 18) active))",
    ),
    okThen((compiled: Compiled<ToyNode>) =>
      all([
        check(
          compiled.nodes.map((n) => n.form),
          toEqual(["def", "def", "check"]),
        ),
        // the canonical text contains the EXPANDED
        // form, never the shorthand (design §33)
        check(
          compiled.canonical,
          toBe(
            "(def age integer)\n\n(def active boolean)\n\n(check\n  (and\n    (>= age 18)\n    active))",
          ),
        ),
      ]),
    ),
  ));

test("equivalent sources compile to identical canonical text", () => {
  const a = compile(
    "(def active boolean)  ; explicit",
  );
  const b = compile("(flag active)");
  return all([
    check(
      pipe(a, (r) =>
        r.__tag === "Ok"
          ? r.content.canonical
          : "a-failed",
      ),
      toBe(
        pipe(b, (r) =>
          r.__tag === "Ok"
            ? r.content.canonical
            : "b-failed",
        ),
      ),
    ),
    check(
      pipe(a, (r) => r.__tag),
      toBe("Ok"),
    ),
  ]);
});

test("syntax diagnostics surface through the pipeline", () =>
  check(
    compile("(def age integer"),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["syntax.unterminated-list"]),
        ),
    ),
  ));

test("semantic diagnostics surface with expected/actual", () =>
  check(
    compile(
      "(def name string)\n(check (>= name 18))",
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => [d.code, d.message]),
          toEqual([
            [
              "language.type-mismatch",
              "operand 1: expected integer but found string",
            ],
          ]),
        ),
    ),
  ));

test("compiling canonical output is idempotent (property)", () =>
  all(
    [
      "(def age integer) (check (>= age 18))",
      "(flag active) (check active)",
      "(def a integer) (def b boolean)",
    ].map((source) =>
      check(
        pipe(compile(source), (first) =>
          first.__tag === "Ok"
            ? pipe(
                compile(first.content.canonical),
                (second) =>
                  second.__tag === "Ok" &&
                  second.content.canonical ===
                    first.content.canonical,
              )
            : false,
        ),
        toBe(true),
      ),
    ),
  ));
