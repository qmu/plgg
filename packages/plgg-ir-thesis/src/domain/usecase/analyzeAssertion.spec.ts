import {
  test,
  check,
  toEqual,
  errThen,
  okThen,
} from "plgg-test";
import {
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import {
  CompiledThesis,
  compileThesis,
} from "plgg-ir-thesis/domain/usecase/compileThesis";
import {
  Assertion,
  isAssertionNode,
} from "plgg-ir-thesis/domain/model";

/**
 * The one assertion a single-`主張` source compiles to
 * (empty on rejection).
 */
const oneAssertion = (
  source: string,
): ReadonlyArray<Assertion> =>
  pipe(
    compileThesis(source),
    matchResult(
      (): ReadonlyArray<Assertion> => [],
      (c: CompiledThesis) =>
        c.nodes
          .filter(isAssertionNode)
          .map((n) => n.content),
    ),
  );

/**
 * Asserts a source is rejected with exactly `wanted`
 * codes.
 */
const rejects = (
  source: string,
  wanted: ReadonlyArray<string>,
) =>
  check(
    compileThesis(source),
    errThen(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        check(
          diags.map((d) => d.code),
          toEqual(wanted),
        ),
    ),
  );

test("a nameless assertion is rejected", () =>
  rejects("(主張)", ["thesis.bad-assertion"]));

test("an unknown assertion attribute is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) :謎 1)",
    ["thesis.unknown-attribute"],
  ));

test("an unknown assertion child is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) (謎))",
    ["thesis.unknown-form"],
  ));

test("a missing :ロジック is rejected", () =>
  rejects("(主張 A :ルート (概念 x))", [
    "thesis.bad-assertion",
  ]));

test("a non-symbol :ロジック is rejected", () =>
  rejects(
    "(主張 A :ロジック (x) :ルート (概念 y))",
    ["thesis.unknown-logic-kind"],
  ));

test("an unlisted logic kind is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果 :ルート (概念 x))",
    ["thesis.unknown-logic-kind"],
  ));

test("a missing :ルート is rejected", () =>
  rejects("(主張 A :ロジック 因果的)", [
    "thesis.bad-assertion",
  ]));

test("a :ルート that is not a concept is rejected", () =>
  rejects("(主張 A :ロジック 因果的 :ルート x)", [
    "thesis.bad-concept",
  ]));

test("a nameless :ルート concept is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念))",
    ["thesis.bad-concept"],
  ));

test("an unknown concept attribute is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x :謎 1))",
    ["thesis.unknown-attribute"],
  ));

test("a nameless relation is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) (関係))",
    ["thesis.bad-relation"],
  ));

test("an unknown relation attribute is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) (関係 r :接続元 (概念 a) :接続先 (概念 b) :謎 1))",
    ["thesis.unknown-attribute"],
  ));

test("a relation missing an endpoint is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) (関係 r :接続先 (概念 b)))",
    ["thesis.bad-relation"],
  ));

test("a relation endpoint that is not a concept is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) (関係 r :接続元 z :接続先 (概念 b)))",
    ["thesis.bad-concept"],
  ));

test("a relation with a divergent logic kind is rejected (uniformity)", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) (関係 r :接続元 (概念 a) :接続先 (概念 b) :ロジック 時間的))",
    ["thesis.mixed-logic"],
  ));

test("a relation with an invalid own logic kind is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) (関係 r :接続元 (概念 a) :接続先 (概念 b) :ロジック 謎))",
    ["thesis.unknown-logic-kind"],
  ));

test("duplicate relation names are rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) (関係 r :接続元 (概念 a) :接続先 (概念 b)) (関係 r :接続元 (概念 a) :接続先 (概念 c)))",
    ["thesis.duplicate-name"],
  ));

test("a relation whose own logic matches is accepted", () =>
  check(
    oneAssertion(
      "(主張 A :ロジック 因果的 :ルート (概念 x) (関係 r :接続元 (概念 a) :接続先 (概念 b) :ロジック 因果的 :重み 2))",
    ).map((a) => String(a.relations.length)),
    toEqual(["1"]),
  ));

test("a bare concept child and a stance are carried", () =>
  check(
    oneAssertion(
      "(主張 A :ロジック 構成的 :ルート (概念 x :時点 1) :立場 賛成 (概念 y :量 5 :種 観念 :重み 3))",
    ).map((a) => [
      String(a.concepts.length),
      pipe(
        a.stance,
        matchOption(
          (): string => "",
          (s: string): string => s,
        ),
      ),
    ]),
    toEqual([["2", "賛成"]]),
  ));

test("a trailing keyword with no value is rejected as a stray child", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x) :立場)",
    ["thesis.unknown-form"],
  ));

test("non-number and non-symbol attribute values degrade to absent", () =>
  check(
    compileThesis(
      "(主張 A :ロジック 因果的 :ルート (概念 x :時点 foo) :立場 (bad))",
    ),
    okThen((c: CompiledThesis) =>
      check(
        c.nodes.filter(isAssertionNode).length,
        toEqual(1),
      ),
    ),
  ));
