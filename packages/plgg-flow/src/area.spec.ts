import { test, check, toBe } from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";
import { chartScenery } from "plgg-flow/chart";

const source = [
  "layout area",
  "axis 売上 0..100 higher",
  "axis 月 1月 2月 3月",
  "axis 地域 東 西",
  "node 東1 月=1月 地域=東 売上=50",
  "node 東2 月=2月 地域=東 売上=100",
  "node 東3 月=3月 地域=東 売上=0",
  "node 西1 月=1月 地域=西 売上=25",
  "node 西2 月=2月 地域=西 売上=75",
  "node 西3 月=3月 地域=西 売上=50",
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

test("a value stands along the order, up by the quantity, back by its series", () =>
  check(
    flowOf(source)
      .nodes.map(
        (n) =>
          n.position.x +
          "," +
          n.position.y +
          "," +
          n.position.z,
      )
      .join(" "),
    toBe(
      "-72,0,-44 0,-140,-44 72,140,-44 -72,70,44 0,-70,44 72,0,44",
    ),
  ));

test("each series is one filled outline, a slice between every two values", () =>
  check(
    sceneryOf(source)
      .flatMap((s) =>
        s.kind === "plane"
          ? [1 + (s.patches ?? []).length]
          : [],
      )
      .join(),
    toBe("2,2"),
  ));

test("a slice runs from the floor up to the line between two values", () =>
  check(
    sceneryOf(source)
      .flatMap((s) =>
        s.kind === "plane"
          ? [s.points.map((p) => p.y).join()]
          : [],
      )
      .join(" "),
    toBe("140,0,-140,140 140,70,-70,140"),
  ));

test("series are told apart by colour, and named in it", () =>
  check(
    sceneryOf(source)
      .flatMap((s) =>
        s.kind === "label" &&
        s.text.startsWith("■")
          ? [
              s.text +
                (s.tone.includes("#2f6fde")
                  ? "青"
                  : "他"),
            ]
          : [],
      )
      .join(),
    toBe("■ 東青,■ 西他"),
  ));

test("the marks of an area carry no name of their own", () =>
  check(
    flowOf(source).nodes.every(
      (n) => n.unnamed === true,
    ),
    toBe(true),
  ));

test("an area reads back as it was written", () =>
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

test("a value outside the order is refused by name", () =>
  check(
    [
      parseSpec(
        [
          "layout area",
          "axis 売上",
          "axis 月 1月 2月",
          "node a 月=9月 売上=3",
        ].join("\n"),
      ),
    ]
      .flatMap((spec) =>
        isErr(spec) ? [spec.content] : [],
      )
      .join(),
    toBe(
      "a に 月 の値がありません（1月・2月 のどれか）",
    ),
  ));
