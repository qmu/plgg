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
  "layout radar",
  "axis 速さ 0..10 higher",
  "axis 費用 0..100 lower",
  "axis 品質 0..10 higher",
  "axis 手間 0..10 lower",
  "node A 速さ=10 費用=100 品質=5 手間=0",
  "node B 速さ=5 費用=50 品質=10 手間=10",
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
const outlines = (text: string) =>
  sceneryOf(text).flatMap((s) =>
    s.kind === "line" && s.width === 2
      ? [
          s.points
            .map(
              (p) =>
                Math.round(p.x) +
                "," +
                Math.round(p.y),
            )
            .join(" "),
        ]
      : [],
  );

test("a shape has a corner on each spoke, the first straight up, and closes", () =>
  check(
    outlines(source)[0],
    toBe("0,-170 0,0 0,85 -170,0 0,-170"),
  ));

test("outward is better: a measure better when lower is turned round", () =>
  check(
    outlines(source)[1],
    toBe("0,-85 85,0 0,170 0,0 0,-85"),
  ));

test("each shape stands at its own depth, the first at the back", () =>
  check(
    flowOf(source)
      .nodes.map((n) => n.position.z)
      .join(),
    toBe("-32,32"),
  ));

test("a radar is first seen head-on", () =>
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

test("a spoke is named with the value its rim stands for", () =>
  check(
    sceneryOf(source)
      .flatMap((s) =>
        s.kind === "label" &&
        !s.text.startsWith("■")
          ? [s.text]
          : [],
      )
      .join(),
    toBe("速さ 10,費用 0,品質 10,手間 0"),
  ));

test("each thing is named in its colour", () =>
  check(
    sceneryOf(source)
      .flatMap((s) =>
        s.kind === "label" &&
        s.text.startsWith("■")
          ? [s.text]
          : [],
      )
      .join(),
    toBe("■ A,■ B"),
  ));

test("a radar reads back as it was written", () =>
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

test("fewer than three axes is refused", () =>
  check(
    [
      parseSpec(
        [
          "layout radar",
          "axis 速さ",
          "axis 費用",
          "node A 速さ=1 費用=2",
        ].join("\n"),
      ),
    ]
      .flatMap((spec) =>
        isErr(spec) ? [spec.content] : [],
      )
      .join(),
    toBe(
      "layout radar には数値の軸が 3 つ以上必要です（軸 1 つが、中心から伸びる 1 本になります）",
    ),
  ));
