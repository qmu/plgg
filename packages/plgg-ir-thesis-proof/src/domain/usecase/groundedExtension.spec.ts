import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  AttackGraph,
  groundedExtension,
  renderSet,
} from "plgg-ir-thesis-proof/domain/usecase/groundedExtension";
import { 論争空間 } from "plgg-ir-thesis-proof/domain/model/examples/debate";

/**
 * Asserts a graph's grounded-extension verdict
 * (survivor-set membership is order-agnostic).
 */
const verdict = (graph: AttackGraph) => {
  const ext = groundedExtension(graph);
  return all([
    check(ext.survivors.length, toBe(2)),
    check(
      ext.survivors.includes("外需回復論"),
      toBe(true),
    ),
    check(
      ext.survivors.includes("増税必要論"),
      toBe(true),
    ),
    check(
      ext.defeated,
      toEqual(["景気失速論"]),
    ),
  ]);
};

test("the 論争空間 survivors are {外需回復論, 増税必要論} and 景気失速論 is defeated", () =>
  verdict(論争空間));

test("a graph with no attacks lets every argument survive", () =>
  check(
    groundedExtension({
      arguments: ["a", "b", "c"],
      attacks: [],
    }),
    toEqual({
      survivors: ["a", "b", "c"],
      defeated: [],
    }),
  ));

test("a two-cycle (mutual attack) defeats neither into the grounded extension", () =>
  check(
    groundedExtension({
      arguments: ["x", "y"],
      attacks: [
        { attacker: "x", target: "y" },
        { attacker: "y", target: "x" },
      ],
    }),
    toEqual({
      survivors: [],
      defeated: ["x", "y"],
    }),
  ));

test("renderSet formats a survivor set", () =>
  check(
    renderSet(["外需回復論", "増税必要論"]),
    toBe("{外需回復論, 増税必要論}"),
  ));
