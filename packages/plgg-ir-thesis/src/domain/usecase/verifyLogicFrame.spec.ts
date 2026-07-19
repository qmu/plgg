import {
  test,
  check,
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

/**
 * "ok" or "err" for a source, without reaching into the
 * Result's representation.
 */
const outcome = (source: string): string =>
  pipe(
    compileThesis(source),
    matchResult(
      (): string => "err",
      (): string => "ok",
    ),
  );

/**
 * Asserts `source` compiles (pass ② accepts it).
 */
const accepts = (source: string) =>
  check(
    compileThesis(source),
    okThen((c: CompiledThesis) =>
      check(c.nodes.length >= 1, toBe(true)),
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

// --- 時間的 (temporal): acyclicity + :時点 monotonicity ---

test("a cyclic 時間的 assertion is rejected", () =>
  rejects(
    "(主張 A :ロジック 時間的 :ルート (概念 x) (関係 r1 :接続元 (概念 x) :接続先 (概念 y)) (関係 r2 :接続元 (概念 y) :接続先 (概念 x)))",
    ["thesis.cyclic-assertion"],
  ));

test("a non-monotonic :時点 sequence is rejected", () =>
  rejects(
    "(主張 A :ロジック 時間的 :ルート (概念 y :時点 1) (関係 r1 :接続元 (概念 x :時点 2) :接続先 (概念 y :時点 1)))",
    ["thesis.time-not-monotonic"],
  ));

test("a monotonic acyclic 時間的 assertion is accepted", () =>
  accepts(
    "(主張 A :ロジック 時間的 :ルート (概念 y :時点 2) (関係 r1 :接続元 (概念 x :時点 1) :接続先 (概念 y :時点 2)))",
  ));

// --- 構成的 (constitutive): partial order (acyclicity) ---

test("a cyclic 構成的 assertion is rejected", () =>
  rejects(
    "(主張 A :ロジック 構成的 :ルート (概念 x) (関係 r1 :接続元 (概念 x) :接続先 (概念 y)) (関係 r2 :接続元 (概念 y) :接続先 (概念 x)))",
    ["thesis.cyclic-assertion"],
  ));

test("an acyclic 構成的 assertion is accepted", () =>
  accepts(
    "(主張 A :ロジック 構成的 :ルート (概念 y) (関係 r1 :接続元 (概念 x) :接続先 (概念 y)))",
  ));

// --- 移動的 (transfer): conservation of :量 ---

test("an unbalanced 移動的 transfer is rejected", () =>
  rejects(
    "(主張 A :ロジック 移動的 :ルート (概念 c) (関係 r1 :接続元 (概念 a) :接続先 (概念 b) :量 10) (関係 r2 :接続元 (概念 b) :接続先 (概念 c) :量 5))",
    ["thesis.transfer-imbalance"],
  ));

test("a balanced 移動的 transfer is accepted", () =>
  accepts(
    "(主張 A :ロジック 移動的 :ルート (概念 c) (関係 r1 :接続元 (概念 a) :接続先 (概念 b) :量 10) (関係 r2 :接続元 (概念 b) :接続先 (概念 c) :量 10))",
  ));

test("a :変換 escape exempts a node from conservation", () =>
  accepts(
    "(主張 A :ロジック 移動的 :ルート (概念 c) (概念 b :変換 true) (関係 r1 :接続元 (概念 a) :接続先 (概念 b) :量 10) (関係 r2 :接続元 (概念 b) :接続先 (概念 c) :量 5))",
  ));

test("a non-boolean :変換 does not exempt (still rejected)", () =>
  rejects(
    "(主張 A :ロジック 移動的 :ルート (概念 c) (概念 b :変換 maybe) (関係 r1 :接続元 (概念 a) :接続先 (概念 b) :量 10) (関係 r2 :接続元 (概念 b) :接続先 (概念 c) :量 5))",
    ["thesis.transfer-imbalance"],
  ));

// --- :種 sort exclusivity (all logic kinds) ---

test("a :種-mixed assertion is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x :種 生物) (関係 r1 :接続元 (概念 y :種 物質) :接続先 (概念 x :種 生物)))",
    ["thesis.sort-mixed"],
  ));

test("an unknown :種 value is rejected", () =>
  rejects(
    "(主張 A :ロジック 因果的 :ルート (概念 x :種 謎))",
    ["thesis.unknown-sort"],
  ));

test("a single-sort assertion is accepted", () =>
  accepts(
    "(主張 A :ロジック 因果的 :ルート (概念 x :種 生物) (関係 r1 :接続元 (概念 x :種 生物) :接続先 (概念 y :種 生物)))",
  ));

// --- kinds with no structural condition ---

test("a 推移的 / 勾配的 / 演繹的 assertion is accepted (directedness only)", () =>
  check(
    [
      "(主張 A :ロジック 推移的 :ルート (概念 x))",
      "(主張 A :ロジック 勾配的 :ルート (概念 x))",
      "(主張 A :ロジック 演繹的 :ルート (概念 x))",
    ].map(outcome),
    toEqual(["ok", "ok", "ok"]),
  ));
