import {
  test,
  check,
  all,
  toBe,
  toEqual,
  okThen,
  errThen,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import {
  CompiledThesis,
  compileThesis,
} from "plgg-ir-thesis/domain/usecase/compileThesis";
import {
  Assertion,
  Frame,
  isAssertionNode,
  isFrameNode,
} from "plgg-ir-thesis/domain/model";

/**
 * The design.md §4 reference example — the 撤退論 /
 * 継続論 assertion + frame block.
 */
const REFERENCE = `(主張 撤退論
  :ロジック 因果的
  :ルート (概念 撤退判断)
  (関係 r1 :接続元 (概念 需要縮小) :接続先 (概念 売上減))
  (関係 r2 :接続元 (概念 売上減)   :接続先 (概念 撤退判断))
  (関係 r3 :接続元 (概念 競合参入) :接続先 (概念 撤退判断)))

(フレーム 継続論による反論
  :種別 反論
  :接続元 継続論
  :接続先 撤退論
  :要求 (遮断 前提→ルート)
  (攻撃 s1 掘り崩し r1)
  (攻撃 s2 切り崩し r2)
  (攻撃 s3 掘り崩し r3))`;

/**
 * The assertions a source compiles to (empty on
 * rejection) — content unwrapped from the node.
 */
const assertionsOf = (
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
 * The frames a source compiles to (empty on rejection).
 */
const framesOf = (
  source: string,
): ReadonlyArray<Frame> =>
  pipe(
    compileThesis(source),
    matchResult(
      (): ReadonlyArray<Frame> => [],
      (c: CompiledThesis) =>
        c.nodes
          .filter(isFrameNode)
          .map((n) => n.content),
    ),
  );

/**
 * Asserts `source` is rejected with exactly `wanted`
 * diagnostic codes.
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

test("accepts the design.md §4 reference example", () =>
  check(
    compileThesis(REFERENCE),
    okThen((c: CompiledThesis) =>
      all([
        check(c.nodes.length, toBe(2)),
        check(
          c.nodes.filter(isAssertionNode).length,
          toBe(1),
        ),
        check(
          c.nodes.filter(isFrameNode).length,
          toBe(1),
        ),
        check(c.canonical.length > 0, toBe(true)),
      ]),
    ),
  ));

test("the reference assertion has the right shape", () =>
  check(
    assertionsOf(REFERENCE).map((a) => [
      a.name,
      a.logic,
      a.root,
      String(a.relations.length),
      String(a.concepts.length),
    ]),
    toEqual([
      ["撤退論", "因果的", "撤退判断", "3", "4"],
    ]),
  ));

test("the reference frame has the right shape", () =>
  check(
    framesOf(REFERENCE).map((f) => [
      f.from,
      f.to,
      String(f.attacks.length),
    ]),
    toEqual([["継続論", "撤退論", "3"]]),
  ));

test("an unknown top-level form is rejected", () =>
  rejects("(主張x 撤退論)", [
    "language.unknown-form",
  ]));

test("a non-list top-level form is rejected", () =>
  rejects("撤退論", ["language.invalid-form"]));

test("a headless top-level list is rejected", () =>
  rejects('("x")', ["language.invalid-form"]));

test("a duplicate 主張 name is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x)) (主張 A :ロジック 因果的 :ルート (概念 y))",
    ["language.duplicate-name"],
  ));
