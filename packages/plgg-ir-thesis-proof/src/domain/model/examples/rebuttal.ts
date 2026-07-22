import { SoftStr } from "plgg";

/**
 * The flagship 反論の完全性 example, verbatim from the
 * strategy book's `metamodel-semantics.md` §反論の完全性:
 * the target assertion 撤退論 (因果的, ルート 撤退判断,
 * relations r1/r2/r3), the attacker 継続論, and the
 * rebuttal frame 継続論による反論.
 *
 * Encoded as the thesis **surface syntax** the full
 * evaluator compiles (`compileThesis`), so the proof is of
 * the metamodel's own closed vocabulary and — since the
 * full `verifyThesis` now owns 遮断/被覆 completeness —
 * the evaluator itself is the verifier: a complete rebuttal
 * compiles (`accept`), a doctored one is refused with a
 * ranged counterexample.
 */

/**
 * The two assertions shared by every frame variant — the
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
 * The complete attack set: 継続論による反論 attacks every
 * relation of 撤退論 (s1→r1, s2→r2, s3→r3).
 */
const ATTACKS_COMPLETE: ReadonlyArray<SoftStr> = [
  "(攻撃 s1 掘り崩し r1)",
  "(攻撃 s2 切り崩し r2)",
  "(攻撃 s3 掘り崩し r3)",
];

/**
 * The doctored attack set — the same frame with
 * `(攻撃 s3 掘り崩し r3)` removed, so r3 survives.
 */
const ATTACKS_DOCTORED: ReadonlyArray<SoftStr> = [
  "(攻撃 s1 掘り崩し r1)",
  "(攻撃 s2 切り崩し r2)",
];

/**
 * A full thesis source: the shared assertions plus the
 * 継続論による反論 frame declaring `requirement` as its
 * `:要求` and `attacks` as its attack clauses.
 */
const rebuttalSource = (
  requirement: SoftStr,
  attacks: ReadonlyArray<SoftStr>,
): SoftStr =>
  `${ASSERTIONS}

(フレーム 継続論による反論
  :種別 反論
  :接続元 継続論
  :接続先 撤退論
  :要求 ${requirement}
${attacks.map((a) => `  ${a}`).join("\n")})`;

/**
 * 遮断 (severing) on the complete rebuttal: the evaluator
 * accepts — no 前提→ルート path survives the attacked set.
 */
export const COMPLETE_SEVERING: SoftStr =
  rebuttalSource(
    "(遮断 前提→ルート)",
    ATTACKS_COMPLETE,
  );

/**
 * 遮断 (severing) on the doctored rebuttal: the evaluator
 * refuses it, naming the surviving path
 * `競合参入 →r3→ 撤退判断` (code `thesis.severing-survives`).
 */
export const DOCTORED_SEVERING: SoftStr =
  rebuttalSource(
    "(遮断 前提→ルート)",
    ATTACKS_DOCTORED,
  );

/**
 * 被覆 (coverage) on the complete rebuttal: the evaluator
 * accepts — every relation of 撤退論 is attacked.
 */
export const COMPLETE_COVERAGE: SoftStr =
  rebuttalSource(
    "(被覆 全関係)",
    ATTACKS_COMPLETE,
  );

/**
 * 被覆 (coverage) on the doctored rebuttal: the evaluator
 * refuses it, naming the unattacked relation r3
 * (code `thesis.coverage-gap`).
 */
export const DOCTORED_COVERAGE: SoftStr =
  rebuttalSource(
    "(被覆 全関係)",
    ATTACKS_DOCTORED,
  );
