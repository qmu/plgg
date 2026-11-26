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

/** The flow a source lays out, or an empty one. */
const flowOf = (text: string) => {
  const spec = parseSpec(text);
  return isOk(spec)
    ? specFlow(spec.content)
    : specFlow({
        graph: { nodes: [], edges: [] },
        rules: [],
      });
};
/** A source printed back from what it laid out. */
const printed = (text: string): string =>
  printSpec(flowOf(text), []);
const refusal = (text: string): string => {
  const spec = parseSpec(text);
  return isErr(spec) ? spec.content : "";
};

const sequence = [
  "layout sequence",
  "axis 側 手前 奥",
  "node A 側=手前",
  "node B 側=奥",
  'A -> B "頼む"',
  'B -> A "返す"',
].join("\n");

test("a sequence stands participants in a row and draws each message across at its turn", () => {
  const flow = flowOf(sequence);
  return all([
    // side by side, at one height
    check(
      flow.nodes
        .map(
          (n) =>
            n.position.x + "," + n.position.y,
        )
        .join(" "),
      toBe("-104,-96 104,-96"),
    ),
    // the second message is a step below the first
    check(
      flow.edges
        .map((e) =>
          (e.path ?? [])
            .map((p) => p.y)
            .join("→"),
        )
        .join(" "),
      toBe("-16→-16 40→40"),
    ),
  ]);
});

test("a sequence's axis sets participants apart in depth", () =>
  check(
    flowOf(sequence)
      .nodes.map((n) => n.position.z)
      .join(),
    toBe("-88,88"),
  ));

test("a sequence is written back as it was read", () =>
  check(printed(sequence), toBe(sequence)));

const timeline = [
  "layout timeline",
  "axis 週 0..10",
  "axis 担当 設計 開発",
  "node 設計書 週=0..5 担当=設計",
  "node 実装 週=5..10 担当=開発",
  "設計書 -> 実装",
].join("\n");

test("a timeline makes each node a bar as long as its stretch, each lane a sheet of its own", () => {
  const flow = flowOf(timeline);
  return all([
    // half of time each: 320 of the 640 long
    check(
      flow.nodes.map((n) => n.width).join(),
      toBe("320,320"),
    ),
    check(
      flow.nodes
        .map(
          (n) =>
            n.position.x + "," + n.position.z,
        )
        .join(" "),
      toBe("-160,-120 160,120"),
    ),
  ]);
});

test("a wait is drawn from the end of what is waited for to the start of what waits", () =>
  check(
    flowOf(timeline)
      .edges.map((e) =>
        (e.path ?? []).map((p) => p.x).join("→"),
      )
      .join(),
    toBe("0→0"),
  ));

test("a timeline is written back as it was read, without the widths it gave", () =>
  check(printed(timeline), toBe(timeline)));

test("a bar without a stretch of time is refused by name", () =>
  check(
    refusal(timeline + "\nnode 試験 担当=開発"),
    toBe(
      "試験 に 週 の期間（例 2..8）がありません",
    ),
  ));

test("a layout that names no chart is still refused", () =>
  check(
    refusal("layout spiral\nnode A").includes(
      "layout",
    ),
    toBe(true),
  ));
