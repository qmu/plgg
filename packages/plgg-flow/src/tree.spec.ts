import { test, check, toBe } from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";
import { chartScenery } from "plgg-flow/chart";

const source = [
  "layout tree",
  "axis 人数",
  "node 会社",
  "node 開発",
  "node 営業 人数=10",
  "node 基盤 人数=10",
  "node 画面 人数=20",
  "会社 -> 開発",
  "会社 -> 営業",
  "開発 -> 基盤",
  "開発 -> 画面",
].join("\n");

const flowOf = (text: string) => {
  const spec = parseSpec(text);
  return isOk(spec)
    ? specFlow(spec.content)
    : specFlow({
        graph: { nodes: [], edges: [] },
        rules: [],
      });
};
const boxes = (text: string): string =>
  flowOf(text)
    .nodes.map(
      (n) =>
        n.id +
        ":" +
        Math.round(n.position.x) +
        "," +
        Math.round(n.position.y) +
        "," +
        n.width,
    )
    .join(" ");
const labels = (text: string): string =>
  [flowOf(text)]
    .flatMap((flow) =>
      flow.chart === undefined
        ? []
        : chartScenery(flow.chart, flow),
    )
    .flatMap((s) =>
      s.kind === "label" ? [s.text] : [],
    )
    .join();
const refusal = (text: string): string =>
  [parseSpec(text)]
    .flatMap((spec) =>
      isErr(spec) ? [String(spec.content)] : [],
    )
    .join();

test("a parent stands over its children, as wide as they are together", () =>
  check(
    boxes(source),
    toBe(
      "会社:0,-96,752 開発:-95,0,562 営業:285,0,182 基盤:-285,96,182 画面:0,96,372",
    ),
  ));

test("a parent counts what is under it, and each says its share of the whole", () =>
  check(
    labels(source),
    toBe(
      "会社 40,開発 30（75%）,基盤 10（25%）,画面 20（50%）,営業 10（25%）",
    ),
  ));

test("with no amount named every leaf counts the same, and no number is written", () =>
  check(
    [
      boxes("layout tree\nA -> B\nA -> C"),
      labels("layout tree\nA -> B\nA -> C"),
    ].join(" / "),
    toBe(
      "A:0,-48,752 B:-190,48,372 C:190,48,372 / A,B,C",
    ),
  ));

test("a tree reads back as it was written, less the nodes that say nothing", () =>
  check(
    [parseSpec(source)]
      .flatMap((spec) =>
        isOk(spec)
          ? [
              printSpec(
                specFlow(spec.content),
                [],
              ),
            ]
          : [],
      )
      .join(),
    toBe(
      source
        .split("\n")
        .filter(
          (line) =>
            line !== "node 会社" &&
            line !== "node 開発",
        )
        .join("\n"),
    ),
  ));

test("two parents are refused, by the child", () =>
  check(
    refusal("layout tree\nA -> C\nB -> C"),
    toBe(
      "layout tree: C に親が 2 つあります（親は 1 つまでです）",
    ),
  ));

test("a ring is refused", () =>
  check(
    refusal("layout tree\nA -> B\nB -> A"),
    toBe(
      "layout tree: A をたどると元に戻ります（親子は輪にできません）",
    ),
  ));

test("more than one axis is refused", () =>
  check(
    refusal(
      "layout tree\naxis 人数\naxis 費用\nA -> B",
    ),
    toBe(
      "layout tree の軸は 1 つまでです（葉の幅にする量）",
    ),
  ));
