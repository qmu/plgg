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
} from "plgg";
import {
  Sexp,
  ListExp,
  SymbolExp,
  isSymbolExp,
  parseSexps,
} from "plgg-ir-syntax";
import { stringType } from "plgg-ir-language/domain/model/SemType";
import {
  SemDiagnostic,
  semError,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import {
  Binding,
  binding,
  lookup,
} from "plgg-ir-language/domain/model/Scope";
import {
  Language,
  Dialect,
  FormDef,
  declaresNothing,
} from "plgg-ir-language/domain/model/Language";
import { analyzeSexps } from "plgg-ir-language/domain/usecase/analyze";
import { compose } from "plgg-ir-language/domain/usecase/compose";
import { mapDialect } from "plgg-ir-language/domain/usecase/mapDialect";

/**
 * The narrow dialect's node.
 */
type AlphaNode = Readonly<{
  tag: "alpha";
  form: string;
}>;

/**
 * The wider composition's node.
 */
type WideNode =
  AlphaNode | Readonly<{ tag: "beta" }>;

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
 * `(refer <name>)` — resolves `<name>` as a value in
 * the scope it is analyzed in (exercises scope
 * pass-through).
 */
const referForm: FormDef<AlphaNode> = {
  name: "refer",
  declare: declaresNothing,
  analyze: (form, ctx) =>
    pipe(
      symbolAt(form, 1),
      matchOption(
        (): Result<
          AlphaNode,
          ReadonlyArray<SemDiagnostic>
        > =>
          err([
            semError(
              "alpha.bad-refer",
              "refer needs (refer <name>)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          pipe(
            lookup(
              "value",
              name.content.name,
            )(ctx.scope),
            matchOption(
              (): Result<
                AlphaNode,
                ReadonlyArray<SemDiagnostic>
              > =>
                err([
                  semError(
                    "alpha.unknown-value",
                    `unknown value ${name.content.name}`,
                    name.content.range,
                  ),
                ]),
              (): Result<
                AlphaNode,
                ReadonlyArray<SemDiagnostic>
              > =>
                ok({
                  tag: "alpha",
                  form: "refer",
                }),
            ),
          ),
      ),
    ),
};

/**
 * `(outer <child>)` — analyzes its child as a nested
 * form (exercises the mapped recursion seam).
 */
const outerForm: FormDef<AlphaNode> = {
  name: "outer",
  declare: declaresNothing,
  analyze: (form, ctx) =>
    form.content.items
      .slice(1, 2)
      .map((child: Sexp) =>
        ctx.analyzeForm(child, ctx.scope),
      )
      .reduce(
        (_, r) => r,
        err([
          semError(
            "alpha.bad-outer",
            "outer needs a child form",
            form.content.range,
          ),
        ]),
      ),
};

/**
 * `(inner)` — a leaf of the alpha vocabulary.
 */
const innerForm: FormDef<AlphaNode> = {
  name: "inner",
  declare: declaresNothing,
  analyze: () =>
    ok({ tag: "alpha", form: "inner" }),
};

const alpha: Dialect<AlphaNode> = {
  name: "alpha",
  forms: [referForm, outerForm, innerForm],
  operators: [],
  expanders: [],
  normalizers: [
    { name: "alpha-order", apply: (exp) => exp },
  ],
};

/**
 * `(let <name>)` — the wider dialect's declaration,
 * natively at the composition's node type.
 */
const letForm: FormDef<WideNode> = {
  name: "let",
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
              "beta.bad-let",
              "let needs (let <name>)",
              form.content.range,
            ),
          ]),
        (name: SymbolExp) =>
          ok([
            binding(
              "value",
              name.content.name,
              some(stringType),
              name.content.range,
            ),
          ]),
      ),
    ),
  analyze: () => ok({ tag: "beta" }),
};

const beta: Dialect<WideNode> = {
  name: "beta",
  forms: [letForm],
  operators: [],
  expanders: [],
  normalizers: [],
};

/**
 * The heterogeneous composition under test: alpha is
 * mapped to the wider node type, beta is native.
 */
const composed: Language<WideNode> = pipe(
  compose(
    mapDialect(
      (node: AlphaNode): WideNode => node,
    )(alpha),
    beta,
  ),
  matchResult(
    (): Language<WideNode> => ({
      forms: [],
      operators: [],
      expanders: [],
      normalizers: [],
    }),
    (language: Language<WideNode>) => language,
  ),
);

/**
 * Parses and analyzes a source with the composition.
 */
const analyzed = (source: string) =>
  pipe(
    parseSexps(source),
    matchResult(
      (): ReadonlyArray<Sexp> => [],
      (exprs: ReadonlyArray<Sexp>) => exprs,
    ),
    analyzeSexps(composed),
  );

test("a mapped dialect's nodes embed into the composition", () =>
  check(
    analyzed("(let x) (inner)"),
    okThen((nodes: ReadonlyArray<WideNode>) =>
      check(
        nodes.map((n) => n.tag),
        toEqual(["beta", "alpha"]),
      ),
    ),
  ));

test("the composition's scope reaches a mapped form", () =>
  all([
    // (refer x) resolves x declared by the OTHER
    // dialect's (let x) — the cross-dialect reference.
    check(
      analyzed("(let x) (refer x)"),
      okThen((nodes: ReadonlyArray<WideNode>) =>
        check(nodes.length, toBe(2)),
      ),
    ),
    check(
      analyzed("(let x) (refer y)"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["alpha.unknown-value"]),
          ),
      ),
    ),
  ]));

test("a mapped form's interior recursion stays closed over its own dialect", () =>
  all([
    check(
      analyzed("(outer (inner))"),
      okThen((nodes: ReadonlyArray<WideNode>) =>
        check(
          nodes.map((n) => n.tag),
          toEqual(["alpha"]),
        ),
      ),
    ),
    // `let` exists in the composition but not in
    // alpha — a mapped interior must not see it.
    check(
      analyzed("(outer (let z))"),
      errThen(
        (diags: ReadonlyArray<SemDiagnostic>) =>
          check(
            diags.map((d) => d.code),
            toEqual(["language.unknown-form"]),
          ),
      ),
    ),
  ]));

test("mapping preserves the registries and the name", () =>
  pipe(
    mapDialect(
      (node: AlphaNode): WideNode => node,
    )(alpha),
    (mapped: Dialect<WideNode>) =>
      all([
        check(mapped.name, toBe("alpha")),
        check(
          mapped.forms.map((f) => f.name),
          toEqual(["refer", "outer", "inner"]),
        ),
        check(
          mapped.normalizers.map((n) => n.name),
          toEqual(["alpha-order"]),
        ),
      ]),
  ));
