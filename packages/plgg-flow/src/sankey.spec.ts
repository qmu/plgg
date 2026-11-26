import { test, check, toBe } from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";
import { chartScenery } from "plgg-flow/chart";

const source = [
  "layout sankey",
  "axis 量",
  "収入 -> 人件費 量=60",
  "収入 -> 設備 量=40",
  "人件費 -> 給与 量=45",
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

test("a node stands one column past whatever feeds it", () =>
  check(
    flowOf(source)
      .nodes.map((n) => n.position.x)
      .join(),
    toBe("-220,0,0,220"),
  ));

test("a node is as tall as what passes through it, the fullest column as tall as the chart", () =>
  check(
    flowOf(source)
      .nodes.map((n) => Math.round(n.height ?? 0))
      .join(),
    // 収入 100, 人件費 60 (more comes in than goes on),
    // 設備 40, 給与 45
    toBe("260,156,104,117"),
  ));

test("a connection is drawn as a band as wide as what it carries", () =>
  check(
    [flowOf(source)]
      .flatMap((flow) =>
        flow.chart === undefined
          ? []
          : chartScenery(flow.chart, flow),
      )
      .flatMap((s) =>
        s.kind === "line"
          ? s.points
              .slice(0, 1)
              .flatMap((a) =>
                (s.strokes ?? [])
                  .slice(-1)
                  .flatMap((last) =>
                    last
                      .slice(0, 1)
                      .map((b) =>
                        Math.round(b.y - a.y),
                      ),
                  ),
              )
          : [],
      )
      .join(),
    toBe("156,104,117"),
  ));

test("a sankey is written back as it was read", () => {
  const spec = parseSpec(source);
  return check(
    isOk(spec)
      ? printSpec(specFlow(spec.content), [])
      : "",
    toBe(source),
  );
});

test("a connection that does not say how much is refused by name", () => {
  const spec = parseSpec(
    source.replace("設備 量=40", "設備"),
  );
  return check(
    isErr(spec) ? spec.content : "",
    toBe("収入 -> 設備 に 量 の数値がありません"),
  );
});
