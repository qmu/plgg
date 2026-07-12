import {
  test,
  check,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { ok, err, pipe, matchResult } from "plgg";
import {
  Sexp,
  ListExp,
  sourcePos,
  sourceRange,
  boolExp,
  symbolExp,
  listExp,
  parseSexps,
  printSexps,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  semError,
} from "plgg-ir-language/domain/model/SemDiagnostic";
import { Language } from "plgg-ir-language/domain/model/Language";
import { expandSexps } from "plgg-ir-language/domain/usecase/expand";

const at = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(1, 1, 2),
);

/**
 * Parses a source (assumed lexically valid) into its
 * top-level expressions.
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

/**
 * A language with one shorthand:
 * `(flag <name>)` → `(def <name> boolean)`
 * (the design §33 shape), plus a deliberately
 * self-producing expander and a failing one.
 */
const language: Language<never> = {
  forms: [],
  operators: [],
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
    {
      name: "loop",
      apply: (form: ListExp) => ok(form),
    },
    {
      name: "broken",
      apply: (form: ListExp) =>
        err([
          semError(
            "toy.broken",
            "cannot expand",
            form.content.range,
          ),
        ]),
    },
  ],
  normalizers: [],
};

test("a shorthand expands to its explicit form", () =>
  check(
    expandSexps(language)(
      parsed("(flag active)"),
    ),
    okThen((exprs: ReadonlyArray<Sexp>) =>
      check(
        printSexps(exprs),
        toBe("(def active boolean)"),
      ),
    ),
  ));

test("expansion also applies inside children", () =>
  check(
    expandSexps(language)(
      parsed("(module (flag active) (keep me))"),
    ),
    okThen((exprs: ReadonlyArray<Sexp>) =>
      check(
        printSexps(exprs),
        toBe(
          "(module\n  (def active boolean)\n  (keep me))",
        ),
      ),
    ),
  ));

test("atoms and unregistered heads pass through", () =>
  check(
    expandSexps(language)(
      parsed('(entity client) name 1 true "s"'),
    ),
    okThen((exprs: ReadonlyArray<Sexp>) =>
      check(
        printSexps(exprs),
        toBe(
          '(entity client)\n\nname\n\n1\n\ntrue\n\n"s"',
        ),
      ),
    ),
  ));

test("a self-producing expander hits the depth bound", () =>
  check(
    expandSexps(language)(parsed("(loop x)")),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["language.expansion-depth"]),
        ),
    ),
  ));

test("expander diagnostics propagate and accumulate", () =>
  check(
    expandSexps(language)(
      parsed("(broken a) (broken b)"),
    ),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(["toy.broken", "toy.broken"]),
        ),
    ),
  ));

test("an empty list expands to itself", () =>
  check(
    expandSexps(language)([
      listExp([], at),
      boolExp(true, at),
    ]),
    okThen((exprs: ReadonlyArray<Sexp>) =>
      check(
        printSexps(exprs),
        toBe("()\n\ntrue"),
      ),
    ),
  ));
