import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  proofReport,
  debateVerdict,
} from "plgg-ir-thesis-proof/domain/usecase/proofReport";

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
    check(REPORT.includes("REJECT"), toBe(true)),
    check(
      REPORT.includes(
        "遮断 継続論による反論: surviving path 競合参入 →r3→ 撤退判断",
      ),
      toBe(true),
    ),
  ]));

test("the doctored rebuttal's 被覆 counterexample names the unattacked relation r3", () =>
  check(
    REPORT.includes(
      "被覆 継続論による反論: unattacked r3",
    ),
    toBe(true),
  ));

test("the grounded extension survivors are the two-argument set and 景気失速論 is defeated", () =>
  all([
    check(
      REPORT.includes(
        "survivors (生存): {増税必要論, 外需回復論}",
      ),
      toBe(true),
    ),
    check(
      REPORT.includes(
        "defeated (敗退):  {景気失速論}",
      ),
      toBe(true),
    ),
  ]));

test("debateVerdict reports a compile failure when the argument space does not compile", () =>
  all([
    check(
      debateVerdict("(未知 x)")
        .join("\n")
        .includes("論争空間 failed to compile"),
      toBe(true),
    ),
    check(
      debateVerdict("(未知 x)")
        .join("\n")
        .includes("反例 (counterexample)"),
      toBe(true),
    ),
  ]));
