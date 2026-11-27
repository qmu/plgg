import { test, check, toBe } from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";
import {
  chartCamera,
  chartScenery,
} from "plgg-flow/chart";

const source = [
  "layout pie",
  "axis 売上",
  "axis 年 2024 2025",
  "node 食品 売上=50,100",
  "node 衣料 売上=25,60",
  "node 雑貨 売上=25,40",
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
const labels = (text: string) =>
  sceneryOf(text).flatMap((s) =>
    s.kind === "label" ? [s.text] : [],
  );
const refusal = (text: string): string =>
  [parseSpec(text)]
    .flatMap((spec) =>
      isErr(spec) ? [String(spec.content)] : [],
    )
    .join();

test("each slice is named with its share of its own round", () =>
  check(
    labels(source)
      .filter((t) => t.endsWith("%"))
      .join(),
    toBe("50%,25%,25%,50%,30%,20%"),
  ));

test("each disc says its round and its whole", () =>
  check(
    labels(source)
      .filter((t) => t.includes("計"))
      .join(),
    toBe("2024 計 100,2025 計 200"),
  ));

test("a disc is as large as its whole: half the whole is half the area", () =>
  check(
    sceneryOf(source)
      .flatMap((s) =>
        s.kind === "line"
          ? [
              s.points
                .slice(0, 2)
                .map((p, _, pair) =>
                  pair.reduce(
                    (far, q) =>
                      Math.max(
                        far,
                        Math.round(
                          Math.hypot(
                            q.x - p.x,
                            q.y - p.y,
                          ),
                        ),
                      ),
                    0,
                  ),
                )
                .reduce(
                  (far, r) => Math.max(far, r),
                  0,
                ),
            ]
          : [],
      )
      .filter((r, i, all) => all.indexOf(r) === i)
      .join(),
    toBe("92,130"),
  ));

test("the first slice starts straight up and runs clockwise", () =>
  check(
    sceneryOf(source)
      .flatMap((s) =>
        s.kind === "line"
          ? [
              s.points
                .slice(1, 2)
                .concat(s.points.slice(-2, -1))
                .map(
                  (p) =>
                    Math.round(p.x) +
                    "," +
                    Math.round(p.y),
                )
                .join(" "),
            ]
          : [],
      )
      .slice(0, 1)
      .join(),
    toBe("-165,-92 -165,92"),
  ));

test("each thing is named in its colour", () =>
  check(
    labels(source)
      .filter((t) => t.startsWith("■"))
      .join(),
    toBe("■ 食品,■ 衣料,■ 雑貨"),
  ));

test("a pie is seen head-on", () =>
  check(
    [flowOf(source)]
      .flatMap((flow) =>
        flow.chart === undefined
          ? []
          : [chartCamera(flow.chart)],
      )
      .map((c) => c.yaw + "," + c.pitch)
      .join(),
    toBe("0,0"),
  ));

test("one amount a node is one disc, with no round to name", () =>
  check(
    labels(
      [
        "layout pie",
        "axis 票",
        "node A 票=3",
        "node B 票=1",
      ].join("\n"),
    ).join(),
    toBe("75%,25%,計 4,■ A,■ B"),
  ));

test("a thing with no amount has no slice", () =>
  check(
    labels(
      [
        "layout pie",
        "axis 票",
        "node A 票=3",
        "node B 票=0",
        "node C",
      ].join("\n"),
    )
      .filter((t) => t.endsWith("%"))
      .join(),
    toBe("100%"),
  ));

test("a pie reads back as it was written", () =>
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
    toBe(source),
  ));

test("no axis is refused", () =>
  check(
    refusal("layout pie\nnode A 票=1"),
    toBe(
      "layout pie には量の軸が 1 つ必要です（axis 売上 のように書きます）",
    ),
  ));

test("an amount that is not a number is refused, by its node", () =>
  check(
    refusal(
      "layout pie\naxis 票\nnode A 票=多い",
    ),
    toBe(
      "node A の 票 は 0 以上の数で書いてください",
    ),
  ));

test("no amount anywhere is refused", () =>
  check(
    refusal("layout pie\naxis 票\nnode A"),
    toBe(
      "layout pie: どの node にも 票 の値がありません（node 食品 票=40 のように書きます）",
    ),
  ));
