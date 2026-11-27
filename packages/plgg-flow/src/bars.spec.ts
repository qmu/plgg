import { test, check, toBe } from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";
import { chartScenery } from "plgg-flow/chart";

const source = [
  "layout bars",
  "axis 売上 0..100 higher",
  "axis 期 Q1 Q2",
  "axis 地域 東 西",
  "node 東Q1 期=Q1 地域=東 売上=50",
  "node 東Q2 期=Q2 地域=東 売上=100",
  "node 西Q1 期=Q1 地域=西 売上=25",
  "node 西Q2 期=Q2 地域=西 売上=75",
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

const sceneryOf = (text: string) =>
  [flowOf(text)].flatMap((flow) =>
    flow.chart === undefined
      ? []
      : chartScenery(flow.chart, flow),
  );

test("a bar is as tall as its value and stands on the floor", () =>
  check(
    flowOf(source)
      .nodes.map(
        (n) =>
          n.height +
          "@" +
          (n.position.y + (n.height ?? 0) / 2),
      )
      .join(),
    toBe("140@140,280@140,70@140,210@140"),
  ));

test("the second axis sets bars side by side, the third apart in depth", () =>
  check(
    flowOf(source)
      .nodes.map(
        (n) => n.position.x + "," + n.position.z,
      )
      .join(" "),
    toBe("-36,-44 36,-44 -36,44 36,44"),
  ));

test("the best bar is named when the quantity says which way is better", () =>
  check(
    sceneryOf(source)
      .flatMap((s) =>
        s.kind === "label" && s.text === "◎ 最良"
          ? [s.anchor.x + "," + s.anchor.z]
          : [],
      )
      .join(),
    toBe("36,-44"),
  ));

test("bars are written back as they were read", () => {
  const spec = parseSpec(source);
  return check(
    isOk(spec)
      ? printSpec(specFlow(spec.content), [])
      : "",
    toBe(source),
  );
});

test("kinds that were not written are taken from the nodes, in the order they appear", () => {
  const spec = parseSpec(
    source.replace("axis 期 Q1 Q2", "axis 期"),
  );
  return check(
    isOk(spec)
      ? printSpec(specFlow(spec.content), [])
      : "",
    toBe(source),
  );
});

test("two bars in one place are refused by name", () => {
  const spec = parseSpec(
    source.replace("\naxis 地域 東 西", ""),
  );
  return check(
    isErr(spec) ? spec.content : "",
    toBe(
      "西Q1 と同じ場所に別の値があります（3 つ目の軸で奥行きに分けられます）",
    ),
  );
});

test("a bar of a kind the axis does not know is refused by name", () => {
  const spec = parseSpec(
    source.replace(
      "期=Q2 地域=西",
      "期=Q9 地域=西",
    ),
  );
  return check(
    isErr(spec) ? spec.content : "",
    toBe(
      "西Q2 に 期 の値がありません（Q1・Q2 のどれか）",
    ),
  );
});
