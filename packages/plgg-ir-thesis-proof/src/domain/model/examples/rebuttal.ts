import {
  Option,
  some,
  none,
  pipe,
  matchResult,
  chainOption,
  mapOption,
} from "plgg";
import {
  Assertion,
  Frame,
  isAssertionNode,
  isFrameNode,
  compileThesis,
  CompiledThesis,
} from "plgg-ir-thesis";

/**
 * The flagship 反論の完全性 example, verbatim from the
 * strategy book's `metamodel-semantics.md` §反論の完全性:
 * the target assertion 撤退論 (因果的, ルート 撤退判断,
 * relations r1/r2/r3), the attacker 継続論, and the
 * rebuttal frame 継続論による反論.
 *
 * Encoded via the thesis **surface syntax** (`compileThesis`
 * parses 主張/関係/フレーム/攻撃 today), so the proof is of
 * the metamodel's own closed vocabulary, not a re-encoding.
 */

/**
 * The two assertions shared by both frame variants — the
 * target 撤退論 and the attacker 継続論.
 */
const ASSERTIONS = `(主張 撤退論
  :ロジック 因果的
  :ルート (概念 撤退判断)
  (関係 r1 :接続元 (概念 需要縮小) :接続先 (概念 売上減))
  (関係 r2 :接続元 (概念 売上減)   :接続先 (概念 撤退判断))
  (関係 r3 :接続元 (概念 競合参入) :接続先 (概念 撤退判断)))

(主張 継続論
  :ロジック 因果的
  :ルート (概念 継続判断)
  (関係 s1 :接続元 (概念 新需要の発生) :接続先 (概念 需要予測の誤り))
  (関係 s2 :接続元 (概念 利益率の維持) :接続先 (概念 売上減の非致命性))
  (関係 s3 :接続元 (概念 競合の撤退)   :接続先 (概念 競争環境の好転)))`;

/**
 * The complete rebuttal source: 継続論による反論 attacks
 * every relation of 撤退論 (s1→r1, s2→r2, s3→r3). The
 * verifier accepts it — no premise→ルート derivation
 * survives, and every relation is covered.
 */
export const COMPLETE_SOURCE = `${ASSERTIONS}

(フレーム 継続論による反論
  :種別 反論
  :接続元 継続論
  :接続先 撤退論
  :要求 (遮断 前提→ルート)
  (攻撃 s1 掘り崩し r1)
  (攻撃 s2 切り崩し r2)
  (攻撃 s3 掘り崩し r3))`;

/**
 * The doctored rebuttal source — the same frame with
 * `(攻撃 s3 掘り崩し r3)` removed. The verifier rejects it:
 * 遮断 finds the surviving path `競合参入 →r3→ 撤退判断`,
 * and 被覆 finds r3 unattacked.
 */
export const DOCTORED_SOURCE = `${ASSERTIONS}

(フレーム 継続論による反論
  :種別 反論
  :接続元 継続論
  :接続先 撤退論
  :要求 (遮断 前提→ルート)
  (攻撃 s1 掘り崩し r1)
  (攻撃 s2 切り崩し r2))`;

/**
 * The flagship example as typed model values: the target
 * assertion, the attacker, and the two frame variants.
 */
export type RebuttalExample = Readonly<{
  target: Assertion;
  attacker: Assertion;
  complete: Frame;
  doctored: Frame;
}>;

/**
 * The compiled nodes of a thesis source (empty when the
 * source is rejected — the flagship sources are valid).
 */
const nodesOf = (
  source: string,
): CompiledThesis["nodes"] =>
  pipe(
    compileThesis(source),
    matchResult(
      (): CompiledThesis["nodes"] => [],
      (c: CompiledThesis) => c.nodes,
    ),
  );

/**
 * The first element matching `pred`, as an `Option`.
 */
const firstOption = <A>(
  xs: ReadonlyArray<A>,
  pred: (a: A) => boolean,
): Option<A> =>
  xs
    .filter(pred)
    .reduce<Option<A>>((_, a) => some(a), none());

/**
 * The assertion named `name` in a compiled source.
 */
const assertionNamed = (
  source: string,
  name: string,
): Option<Assertion> =>
  firstOption(
    nodesOf(source)
      .filter(isAssertionNode)
      .map((n) => n.content),
    (a) => a.name === name,
  );

/**
 * The frame named `name` in a compiled source.
 */
const frameNamed = (
  source: string,
  name: string,
): Option<Frame> =>
  firstOption(
    nodesOf(source)
      .filter(isFrameNode)
      .map((n) => n.content),
    (f) => f.name === name,
  );

/**
 * The flagship rebuttal as typed model values, or `None`
 * if the surface syntax ever stops parsing it (a green
 * build never hits that). The two frames share the same
 * 撤退論/継続論 so the only difference is the removed
 * attack — keeping the counterexample crisp.
 */
export const flagshipRebuttal =
  (): Option<RebuttalExample> =>
    pipe(
      assertionNamed(COMPLETE_SOURCE, "撤退論"),
      chainOption((target: Assertion) =>
        pipe(
          assertionNamed(
            COMPLETE_SOURCE,
            "継続論",
          ),
          chainOption((attacker: Assertion) =>
            pipe(
              frameNamed(
                COMPLETE_SOURCE,
                "継続論による反論",
              ),
              chainOption((complete: Frame) =>
                pipe(
                  frameNamed(
                    DOCTORED_SOURCE,
                    "継続論による反論",
                  ),
                  mapOption(
                    (
                      doctored: Frame,
                    ): RebuttalExample => ({
                      target,
                      attacker,
                      complete,
                      doctored,
                    }),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
