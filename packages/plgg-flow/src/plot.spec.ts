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
      "layout plot には数値の軸が 2 つか 3 つ必要です",
    ),
  );
});
