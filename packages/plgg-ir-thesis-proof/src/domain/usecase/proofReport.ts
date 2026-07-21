import { pipe, matchOption } from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import {
  verifySevering,
  verifyCoverage,
} from "plgg-ir-thesis-proof/domain/usecase/verifyRebuttal";
import {
  groundedExtension,
  renderSet,
} from "plgg-ir-thesis-proof/domain/usecase/groundedExtension";
import {
  RebuttalExample,
  flagshipRebuttal,
} from "plgg-ir-thesis-proof/domain/model/examples/rebuttal";
import { 論争空間 } from "plgg-ir-thesis-proof/domain/model/examples/debate";

/**
 * The report the `prove` command prints: each flagship
 * example run through its verification pass, printing
 * `accept` for the valid inputs and the ranged
 * counterexample trace for the doctored one. Returned as
 * lines so the domain stays pure and the entrypoint only
 * prints — the same report the vitest fixtures assert.
 */

/**
 * One pass verdict: `accept` when there are no
 * counterexamples, otherwise `REJECT` followed by each
 * ranged counterexample trace.
 */
const verdictLines = (
  label: string,
  diags: ReadonlyArray<SemDiagnostic>,
): ReadonlyArray<string> =>
  diags.length === 0
    ? [`  ${label}: accept`]
    : [
        `  ${label}: REJECT`,
        ...diags.map(
          (d) => `      反例 (counterexample): ${d.message}`,
        ),
      ];

/**
 * The 反論の完全性 section: 遮断 + 被覆 on the complete and
 * doctored rebuttals.
 */
const rebuttalSection = (
  ex: RebuttalExample,
): ReadonlyArray<string> => [
  "== 反論の完全性 (rebuttal completeness) — 撤退論 vs 継続論 ==",
  "",
  "完全な反論 (継続論による反論: s1→r1, s2→r2, s3→r3):",
  ...verdictLines(
    "遮断 (severing)",
    verifySevering(ex.target, ex.complete),
  ),
  ...verdictLines(
    "被覆 (coverage)",
    verifyCoverage(ex.target, ex.complete),
  ),
  "",
  "s3を欠いた反論 ((攻撃 s3 掘り崩し r3) を除去):",
  ...verdictLines(
    "遮断 (severing)",
    verifySevering(ex.target, ex.doctored),
  ),
  ...verdictLines(
    "被覆 (coverage)",
    verifyCoverage(ex.target, ex.doctored),
  ),
];

/**
 * The Dung 生存判定 section over the 論争空間 attack graph.
 */
const debateSection = (): ReadonlyArray<string> => {
  const ext = groundedExtension(論争空間);
  return [
    "== Dung 生存判定 (grounded extension) — 論争空間 ==",
    "",
    `  survivors (生存): ${renderSet(ext.survivors)}`,
    `  defeated (敗退):  ${renderSet(ext.defeated)}`,
  ];
};

/**
 * The whole proof report as lines.
 */
export const proofReport =
  (): ReadonlyArray<string> =>
    pipe(
      flagshipRebuttal(),
      matchOption(
        (): ReadonlyArray<string> => [
          "反論の完全性 example failed to compile from the surface syntax",
          "",
          ...debateSection(),
        ],
        (ex: RebuttalExample) => [
          ...rebuttalSection(ex),
          "",
          ...debateSection(),
        ],
      ),
    );
