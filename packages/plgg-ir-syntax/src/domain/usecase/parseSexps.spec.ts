import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { sourcePos } from "plgg-ir-syntax/domain/model/SourcePos";
import { sourceRange } from "plgg-ir-syntax/domain/model/SourceRange";
import { SyntaxDiagnostic } from "plgg-ir-syntax/domain/model/SyntaxDiagnostic";
import {
  Sexp,
  symbolExp,
  strExp,
  numExp,
  boolExp,
  listExp,
  sexpsEqual,
  sexpRange,
} from "plgg-ir-syntax/domain/model/Sexp";
import { parseSexps } from "plgg-ir-syntax/domain/usecase/parseSexps";

/**
 * A placeholder range for expected trees —
 * {@link sexpsEqual} ignores ranges.
 */
const R = sourceRange(
  sourcePos(0, 1, 1),
  sourcePos(0, 1, 1),
);

test("parses nested lists and atoms", () =>
  check(
    parseSexps(
      '(entity project (field name (type string) (weight 1.5) (active true) (label "P")))',
    ),
    okThen((exprs) =>
      check(
        sexpsEqual(exprs)([
          listExp(
            [
              symbolExp("entity", R),
              symbolExp("project", R),
              listExp(
                [
                  symbolExp("field", R),
                  symbolExp("name", R),
                  listExp(
                    [
                      symbolExp("type", R),
                      symbolExp("string", R),
                    ],
                    R,
                  ),
                  listExp(
                    [
                      symbolExp("weight", R),
                      numExp(1.5, R),
                    ],
                    R,
                  ),
                  listExp(
                    [
                      symbolExp("active", R),
                      boolExp(true, R),
                    ],
                    R,
                  ),
                  listExp(
                    [
                      symbolExp("label", R),
                      strExp("P", R),
                    ],
                    R,
                  ),
                ],
                R,
              ),
            ],
            R,
          ),
        ]),
        toBe(true),
      ),
    ),
  ));

test("parses multiple top-level expressions", () =>
  check(
    parseSexps("(a) b ()"),
    okThen((exprs) =>
      check(
        sexpsEqual(exprs)([
          listExp([symbolExp("a", R)], R),
          symbolExp("b", R),
          listExp([], R),
        ]),
        toBe(true),
      ),
    ),
  ));

test("empty and comment-only sources parse to nothing", () =>
  all([
    check(
      parseSexps(""),
      okThen((exprs) =>
        check(exprs, toEqual([])),
      ),
    ),
    check(
      parseSexps("; nothing here\n  "),
      okThen((exprs) =>
        check(exprs, toEqual([])),
      ),
    ),
  ]));

test("a list's range spans its parens across lines", () =>
  check(
    parseSexps("(a\n b)"),
    okThen((exprs) =>
      check(
        exprs.map(sexpRange),
        toEqual([
          sourceRange(
            sourcePos(0, 1, 1),
            sourcePos(6, 2, 4),
          ),
        ]),
      ),
    ),
  ));

test("an unterminated list diagnoses at its opener", () =>
  check(
    parseSexps("(a (b"),
    errThen(
      (diags: ReadonlyArray<SyntaxDiagnostic>) =>
        check(
          diags.map((d) => [
            d.code,
            d.range.start.offset,
          ]),
          toEqual([
            ["syntax.unterminated-list", 3],
            ["syntax.unterminated-list", 0],
          ]),
        ),
    ),
  ));

test("a stray close paren diagnoses and reading continues", () =>
  check(
    parseSexps(") (a)"),
    errThen(
      (diags: ReadonlyArray<SyntaxDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual([
            "syntax.unexpected-close-paren",
          ]),
        ),
    ),
  ));

test("lexical and structural diagnostics accumulate together", () =>
  check(
    parseSexps('(a @ "x'),
    errThen(
      (diags: ReadonlyArray<SyntaxDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual([
            "syntax.unexpected-character",
            "syntax.unterminated-string",
            "syntax.unterminated-list",
          ]),
        ),
    ),
  ));

test("parses the design document's manifest example", () =>
  check(
    parseSexps(`
(plgg-ir 1
  (module project-management

    (entity client
      (field id
        (type client-id))

      (field name
        (type string)
        (validate
          (required)
          (length-between 1 200)))

      (relation projects
        (target project)
        (cardinality many)
        (inverse client)))))
`),
    okThen((exprs: ReadonlyArray<Sexp>) =>
      check(exprs.length, toBe(1)),
    ),
  ));
