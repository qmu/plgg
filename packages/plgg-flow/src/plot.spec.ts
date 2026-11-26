import {
  test,
  check,
  toBe,
  all,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";
import { chartScenery } from "plgg-flow/chart";

const source = [
  "layout plot",
  "axis 費用 0..200 lower",
  "axis 性能 0..100 higher",
  "node A 費用=100 性能=50",
  "node B 費用=150 性能=40",
  "node C 費用=50 性能=20",
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
const node = (text: string, id: string) =>
  flowOf(text).nodes.filter((n) => n.id === id);

test("a plot places each node where its values put it: right is more, up is more", () =>
  all([
    check(
      node(source, "A")
        .map(
          (n) =>
            n.position.x + "," + n.position.y,
        )
        .join(),
      toBe("0,0"),
    ),
    check(
      node(source, "C")
        .map(
          (n) =>
            n.position.x + "," + n.position.y,
        )
        .join(),
      toBe("-120,96"),
    ),
  ]));

test("a node another beats on every measure that says which way is better is drawn quietly", () =>
  check(
    flowOf(source)
      .nodes.map((n) => n.id + ":" + !!n.quiet)
      .join(),
    // B costs more than A and performs worse; A and C
    // each win somewhere
    toBe("A:false,B:true,C:false"),
  ));

test("a third measure gives the plot depth", () =>
  check(
    node(
      source
        .replace(
          "axis 性能 0..100 higher",
          "axis 性能 0..100 higher\naxis 手間 0..10 lower",
        )
        .replaceAll(
          /(node \S+ .*)/g,
          "$1 手間=10",
        ),
      "A",
    )
      .map((n) => n.position.z)
      .join(),
    toBe("160"),
  ));

test("a plot is written back as it was read", () => {
  const spec = parseSpec(source);
  return check(
    isOk(spec)
      ? printSpec(specFlow(spec.content), [])
      : "",
    toBe(source),
  );
});

test("a node without a number on a measure is refused by name", () => {
  const spec = parseSpec(
    source + "\nnode D 費用=10",
  );
  return check(
    isErr(spec) ? spec.content : "",
    toBe("D に 性能 の数値がありません"),
  );
});

test("a plot needs two measures", () => {
  const spec = parseSpec(
    "layout plot\naxis 費用 lower\nnode A 費用=1",
  );
  return check(
    isErr(spec) ? spec.content : "",
    toBe(
      "layout plot には場所に使う数値の軸が 2 つか 3 つ必要です",
    ),
  );
});

test("a node is a mark exactly where its values put it, however long its name", () =>
  check(
    flowOf(
      source.replace(
        "node A ",
        "node 長い名前の案 ",
      ),
    )
      .nodes.filter(
        (n) => n.id === "長い名前の案",
      )
      .map((n) => n.width + "x" + n.height)
      .join(),
    toBe("14x14"),
  ));

const sized = source
  .replace(
    "axis 性能 0..100 higher",
    "axis 性能 0..100 higher\naxis 人数 0..10 size",
  )
  .replace("性能=50", "性能=50 人数=10")
  .replace("性能=40", "性能=40 人数=5")
  .replace("性能=20", "性能=20 人数=0");

test("a measure given to size makes the mark as large as the value, and leaves the plot flat", () =>
  check(
    flowOf(sized)
      .nodes.map(
        (n) => n.width + "@" + n.position.z,
      )
      .join(),
    toBe("44@0,27@0,10@0"),
  ));

test("a plot with a size is written back as it was read", () => {
  const spec = parseSpec(sized);
  return check(
    isOk(spec)
      ? printSpec(specFlow(spec.content), [])
      : "",
    toBe(sized),
  );
});

const conditioned = source.replace(
  "axis 費用 0..200 lower",
  "axis 費用 0..200 lower <=80",
);

test("a node that breaks a condition is drawn quietly, and no longer beats the others", () =>
  check(
    flowOf(conditioned)
      .nodes.map((n) => n.id + ":" + !!n.quiet)
      .join(),
    // A (100) and B (150) cost too much; only C is left
    toBe("A:true,B:true,C:false"),
  ));

test("where the conditions hold is drawn and named", () =>
  check(
    sceneryOf(conditioned)
      .flatMap((s) =>
        s.kind === "label" && s.text === "条件内"
          ? [Math.round(s.anchor.x)]
          : [],
      )
      .join(),
    // at the cost the condition allows at most: 80 of 200
    toBe("-48"),
  ));

test("conditions are written back as they were read", () => {
  const spec = parseSpec(conditioned);
  return check(
    isOk(spec)
      ? printSpec(specFlow(spec.content), [])
      : "",
    toBe(conditioned),
  );
});

test("a fourth measure to place is refused, with the way out", () => {
  const spec = parseSpec(
    [
      "layout plot",
      "axis a",
      "axis b",
      "axis c",
      "axis d",
      "node A a=1 b=1 c=1 d=1",
    ].join("\n"),
  );
  return check(
    isErr(spec) ? spec.content : "",
    toBe(
      "layout plot で場所に使える軸は 3 つまでです（もう 1 つは size と書けば大きさで表せます）",
    ),
  );
});
