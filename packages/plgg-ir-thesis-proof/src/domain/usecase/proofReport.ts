import { SoftStr, pipe, matchResult } from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import {
  CompiledThesis,
  compileThesis,
  isAssertionNode,
} from "plgg-ir-thesis";
import {
  COMPLETE_SEVERING,
  DOCTORED_SEVERING,
  COMPLETE_COVERAGE,
  DOCTORED_COVERAGE,
} from "plgg-ir-thesis-proof/domain/model/examples/rebuttal";
import { 論争空間 } from "plgg-ir-thesis-proof/domain/model/examples/debate";

/**
 * The report the `prove` command prints: each flagship
 * source run through the **full evaluator** (`compileThesis`),
 * printing `accept` for the valid inputs and the ranged
 * counterexample trace for the doctored ones, then the Dung
 * grounded extension read off the evaluator's own
 * `surviving` set. Returned as lines so the domain stays
 * pure and the entrypoint only prints — the same report the
 * vitest fixtures assert.
 */

/**
 * The counterexample lines of a refused compile: one
 * `反例 (counterexample)` per ranged diagnostic.
 */
const counterexamples = (
  diags: ReadonlyArray<SemDiagnostic>,
): ReadonlyArray<SoftStr> =>
  diags.map(
    (d) =>
      `      反例 (counterexample): ${d.message}`,
  );

/**
 * One completeness verdict: the evaluator accepts the
 * source (`accept`) or refuses it (`REJECT` followed by
 * each ranged counterexample trace).
 */
export const rebuttalVerdict = (
  label: SoftStr,
  source: SoftStr,
): ReadonlyArray<SoftStr> =>
  pipe(
    compileThesis(source),
    matchResult(
      (
        diags: ReadonlyArray<SemDiagnostic>,
      ): ReadonlyArray<SoftStr> => [
        `  ${label}: REJECT`,
        ...counterexamples(diags),
      ],
      (): ReadonlyArray<SoftStr> => [
        `  ${label}: accept`,
      ],
    ),
  );

/**
 * The declared 主張 (argument) names of a compiled thesis.
 */
const argumentNames = (
  c: CompiledThesis,
): ReadonlyArray<SoftStr> =>
  c.nodes
    .filter(isAssertionNode)
    .map((n) => n.content.name);

/**
 * The 生存判定 lines of an accepted 論争空間: the survivors
 * are the evaluator's grounded extension, the defeated are
 * the remaining declared arguments.
 */
const survivalLines = (
  c: CompiledThesis,
): ReadonlyArray<SoftStr> => [
  `  survivors (生存): {${c.surviving.join(", ")}}`,
  `  defeated (敗退):  {${argumentNames(c)
    .filter((a) => !c.surviving.includes(a))
    .join(", ")}}`,
];

/**
 * The Dung 生存判定 verdict over an argument-space source:
 * the survivors/defeated split when it compiles, or its
 * ranged counterexamples when it does not.
 */
export const debateVerdict = (
  source: SoftStr,
): ReadonlyArray<SoftStr> =>
  pipe(
    compileThesis(source),
    matchResult(
      (
        diags: ReadonlyArray<SemDiagnostic>,
      ): ReadonlyArray<SoftStr> => [
        "  論争空間 failed to compile:",
        ...counterexamples(diags),
      ],
      (
        c: CompiledThesis,
      ): ReadonlyArray<SoftStr> =>
        survivalLines(c),
    ),
  );

/**
 * The whole proof report as lines.
 */
export const proofReport =
  (): ReadonlyArray<SoftStr> => [
    "== 反論の完全性 (rebuttal completeness) — 撤退論 vs 継続論 ==",
    "",
    "完全な反論 (継続論による反論: s1→r1, s2→r2, s3→r3):",
    ...rebuttalVerdict(
      "遮断 (severing)",
      COMPLETE_SEVERING,
    ),
    ...rebuttalVerdict(
      "被覆 (coverage)",
      COMPLETE_COVERAGE,
    ),
    "",
    "s3を欠いた反論 ((攻撃 s3 掘り崩し r3) を除去):",
    ...rebuttalVerdict(
      "遮断 (severing)",
      DOCTORED_SEVERING,
    ),
    ...rebuttalVerdict(
      "被覆 (coverage)",
      DOCTORED_COVERAGE,
    ),
    "",
    "== Dung 生存判定 (grounded extension) — 論争空間 ==",
    "",
    ...debateVerdict(論争空間),
  ];
