import {
  test,
  check,
  toEqual,
  errThen,
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
  Frame,
  isFrameNode,
} from "plgg-ir-thesis/domain/model";

/**
 * The one frame a single-`フレーム` source compiles to.
 */
const oneFrame = (
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

/** A target assertion the frames below can close against. */
const TARGET =
  "(主張 B :ロジック 因果的 :ルート (概念 R) (関係 r1 :接続元 (概念 a) :接続先 (概念 R)) (関係 r2 :接続元 (概念 b) :接続先 (概念 R)))";

test("a well-formed frame is accepted with its attacks", () =>
  check(
    oneFrame(
      `${TARGET} (フレーム F :種別 反論 :接続元 A :接続先 B (攻撃 s1 反駁 R) (攻撃 s2 切り崩し r2))`,
    ).map((f) => [
      f.from,
      f.to,
      String(f.attacks.length),
      pipe(
        f.kind,
        matchOption(
          (): string => "",
          (k: string): string => k,
        ),
      ),
    ]),
    toEqual([["A", "B", "2", "反論"]]),
  ));

test("a frame with no :要求 and no :種別 is accepted", () =>
  check(
    oneFrame(
      `${TARGET} (フレーム F :接続元 A :接続先 B)`,
    ).map((f) => String(f.attacks.length)),
    toEqual(["0"]),
  ));

test("a nameless frame is rejected", () =>
  rejects("(フレーム)", ["thesis.bad-frame"]));

test("an unknown frame attribute is rejected", () =>
  rejects(
    "(フレーム F :接続元 A :接続先 B :謎 1)",
    ["thesis.unknown-attribute"],
  ));

test("an unknown frame child is rejected", () =>
  rejects(
    "(フレーム F :接続元 A :接続先 B (関係 r))",
    ["thesis.unknown-form"],
  ));

test("a frame missing an endpoint is rejected", () =>
  rejects("(フレーム F :接続先 B)", [
    "thesis.bad-frame",
  ]));

test("a frame endpoint that is not a symbol is rejected", () =>
  rejects("(フレーム F :接続元 (x) :接続先 B)", [
    "thesis.bad-frame",
  ]));

test("an attack missing its type is rejected", () =>
  rejects(
    "(フレーム F :接続元 A :接続先 B (攻撃 s1))",
    ["thesis.bad-attack"],
  ));

test("an unknown attack type is rejected", () =>
  rejects(
    "(フレーム F :接続元 A :接続先 B (攻撃 s1 謎 r1))",
    ["thesis.bad-attack"],
  ));

test("an attack missing its target is rejected", () =>
  rejects(
    "(フレーム F :接続元 A :接続先 B (攻撃 s1 反駁))",
    ["thesis.bad-attack"],
  ));

test("a nameless attack is rejected", () =>
  rejects(
    "(フレーム F :接続元 A :接続先 B (攻撃))",
    ["thesis.bad-attack"],
  ));

test("a 対応 with no concepts is rejected", () =>
  rejects(
    "(フレーム F :種別 類推 :接続元 A :接続先 B (対応))",
    ["thesis.bad-frame"],
  ));

test("a 対応 missing its target concept is rejected", () =>
  rejects(
    "(フレーム F :種別 類推 :接続元 A :接続先 B (対応 s1))",
    ["thesis.bad-frame"],
  ));

test("a nameless 問題 is rejected", () =>
  rejects(
    "(フレーム F :種別 全対応 :接続元 A :接続先 B (問題))",
    ["thesis.bad-frame"],
  ));

test("a nameless 部分 is rejected", () =>
  rejects(
    "(フレーム F :種別 合成 :接続元 A :接続先 B (部分))",
    ["thesis.bad-frame"],
  ));
