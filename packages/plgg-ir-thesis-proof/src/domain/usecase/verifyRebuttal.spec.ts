import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  Option,
  some,
  none,
  pipe,
  matchResult,
  matchOption,
} from "plgg";
import { sourceRange, sourcePos } from "plgg-ir-syntax";
import {
  SemDiagnostic,
} from "plgg-ir-language";
import {
  Assertion,
  Frame,
  isAssertionNode,
  isFrameNode,
  compileThesis,
  CompiledThesis,
} from "plgg-ir-thesis";
import {
  verifySevering,
  verifyCoverage,
  verifyRebuttal,
} from "plgg-ir-thesis-proof/domain/usecase/verifyRebuttal";

/**
 * A tiny target assertion mirroring the flagship shape:
 * two premises (A, B) where A→M→R is a two-hop path and
 * B→R is a parallel direct path — so a rebuttal that cuts
 * A's path but leaves B's still has a surviving derivation.
 */
const SOURCE = `(主張 標的
  :ロジック 因果的
  :ルート (概念 R)
  (関係 e1 :接続元 (概念 A) :接続先 (概念 M))
  (関係 e2 :接続元 (概念 M) :接続先 (概念 R))
  (関係 e3 :接続元 (概念 B) :接続先 (概念 R)))

(フレーム 完全な反論
  :種別 反論
  :接続元 攻撃側
  :接続先 標的
  (攻撃 x1 掘り崩し e1)
  (攻撃 x2 切り崩し e2)
  (攻撃 x3 掘り崩し e3))

(フレーム e3を欠いた反論
  :種別 反論
  :接続元 攻撃側
  :接続先 標的
  (攻撃 x1 掘り崩し e1)
  (攻撃 x2 切り崩し e2))`;

/**
 * The compiled nodes of {@link SOURCE} (empty on
 * rejection, which a green suite never hits).
 */
const nodesOf = (): CompiledThesis["nodes"] =>
  pipe(
    compileThesis(SOURCE),
    matchResult(
      (): CompiledThesis["nodes"] => [],
      (c: CompiledThesis) => c.nodes,
    ),
  );

/**
 * The first element matching `pred`, as an `Option`
 * (total under `noUncheckedIndexedAccess`).
 */
const firstOf = <A>(
  xs: ReadonlyArray<A>,
  pred: (a: A) => boolean,
): Option<A> =>
  xs
    .filter(pred)
    .reduce<Option<A>>((_, a) => some(a), none());

const assertionNamed = (
  name: string,
): Option<Assertion> =>
  firstOf(
    nodesOf()
      .filter(isAssertionNode)
      .map((n) => n.content),
    (a) => a.name === name,
  );

const frameNamed = (
  name: string,
): Option<Frame> =>
  firstOf(
    nodesOf()
      .filter(isFrameNode)
      .map((n) => n.content),
    (f) => f.name === name,
  );

/**
 * Runs `f` against the target assertion and the named
 * frame, both looked up from the compiled model; a
 * missing lookup fails loudly instead of silently
 * skipping (a green suite always resolves them).
 */
const onModel = (
  frameName: string,
  f: (
    target: Assertion,
    frame: Frame,
  ) => ReadonlyArray<SemDiagnostic>,
): ReadonlyArray<SemDiagnostic> =>
  pipe(
    assertionNamed("標的"),
    matchOption(
      (): ReadonlyArray<SemDiagnostic> => [
        MISSING,
      ],
      (target) =>
        pipe(
          frameNamed(frameName),
          matchOption(
            (): ReadonlyArray<SemDiagnostic> => [
              MISSING,
            ],
            (frame) => f(target, frame),
          ),
        ),
    ),
  );

/**
 * A sentinel diagnostic surfaced when a fixture lookup
 * fails — its presence makes the assertion red rather
 * than silently passing an empty result.
 */
const MISSING: SemDiagnostic = {
  code: "fixture.missing",
  severity: "error",
  message: "fixture lookup failed",
  range: sourceRange(
    sourcePos(0, 1, 1),
    sourcePos(0, 1, 1),
  ),
  expected: none(),
  actual: none(),
  related: [],
};

test("severing accepts a rebuttal that cuts every premise→root path", () =>
  check(
    onModel("完全な反論", verifySevering),
    toEqual([]),
  ));

test("severing rejects with the surviving path when one attack is missing", () =>
  pipe(
    onModel("e3を欠いた反論", verifySevering),
    (diags) =>
      all([
        check(diags.length, toBe(1)),
        check(
          diags.map((d) => d.code),
          toEqual(["thesis-proof.surviving-path"]),
        ),
        check(
          diags.map((d) =>
            d.message.includes("B →e3→ R"),
          ),
          toEqual([true]),
        ),
      ]),
  ));

test("coverage accepts when every relation is attacked", () =>
  check(
    onModel("完全な反論", verifyCoverage),
    toEqual([]),
  ));

test("coverage rejects and names the unattacked relation", () =>
  pipe(
    onModel("e3を欠いた反論", verifyCoverage),
    (diags) =>
      all([
        check(
          diags.map((d) => d.code),
          toEqual([
            "thesis-proof.unattacked-relation",
          ]),
        ),
        check(
          diags.map((d) =>
            d.message.includes("関係 e3"),
          ),
          toEqual([true]),
        ),
      ]),
  ));

test("verifyRebuttal dispatches 遮断 and 被覆", () =>
  all([
    check(
      onModel("完全な反論", (t, fr) =>
        verifyRebuttal(t, fr, "遮断"),
      ),
      toEqual([]),
    ),
    check(
      onModel("e3を欠いた反論", (t, fr) =>
        verifyRebuttal(t, fr, "被覆"),
      ).map((d) => d.code),
      toEqual([
        "thesis-proof.unattacked-relation",
      ]),
    ),
  ]));
