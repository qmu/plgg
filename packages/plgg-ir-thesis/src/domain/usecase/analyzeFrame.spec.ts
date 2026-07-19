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

test("a well-formed frame is accepted with its attacks", () =>
  check(
    oneFrame(
      "(フレーム F :種別 反論 :接続元 A :接続先 B :要求 (遮断 x) (攻撃 s1 反駁 r1) (攻撃 s2 切り崩し r2))",
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
      "(フレーム F :接続元 A :接続先 B)",
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
