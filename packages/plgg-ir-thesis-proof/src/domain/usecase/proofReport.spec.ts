import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { proofReport } from "plgg-ir-thesis-proof/domain/usecase/proofReport";

/**
 * The report as one string, for substring assertions.
 */
const REPORT = proofReport().join("\n");

test("the complete rebuttal is accepted under both 遮断 and 被覆", () =>
  check(
    (REPORT.match(/accept/g) ?? []).length,
    toBe(2),
  ));

test("the doctored rebuttal's 遮断 counterexample names the surviving path", () =>
  all([
    check(
      REPORT.includes("REJECT"),
      toBe(true),
    ),
    check(
      REPORT.includes(
        "導出経路 競合参入 →r3→ 撤退判断 が生き残っている",
      ),
      toBe(true),
    ),
  ]));

test("the doctored rebuttal's 被覆 counterexample names the unattacked relation r3", () =>
  check(
    REPORT.includes(
      "関係 r3 (競合参入 → 撤退判断) に攻撃対応が宣言されていない",
    ),
    toBe(true),
  ));

test("the grounded extension survivors are the two-argument set and 景気失速論 is defeated", () =>
  all([
    check(
      REPORT.includes("外需回復論"),
      toBe(true),
    ),
    check(
      REPORT.includes("増税必要論"),
      toBe(true),
    ),
    check(
      REPORT.includes(
        "defeated (敗退):  {景気失速論}",
      ),
      toBe(true),
    ),
  ]));
