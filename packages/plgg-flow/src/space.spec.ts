import {
  crossingRuns,
  crossingSpans,
} from "plgg-flow/wireDepth";
import {
  aisleRuns,
  lanesOverlap,
} from "plgg-flow/path3";
import { flowView } from "plgg-flow/index";
import { renderToString } from "plgg-view";
import { readFileSync } from "node:fs";
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";
import { moveSelectionGeometry } from "plgg-flow/model";
import { wireGraph } from "plgg-flow/wiring";
import { nodeSize } from "plgg-flow/nodeSize";
import { bodyDepth } from "plgg-flow/nodeBody";
import { test, check, toBe } from "plgg-test";
import {
  classify,
  defaultView,
  planSpace,
} from "plgg-flow/autoLayout";
import type { Point3 } from "plgg-board";
import type { Graph, FlowNode } from "./model";
const graph: Graph = {
  nodes: Array.from({ length: 40 }, (_, i) => ({
    id: String(i),
    label: "card",
    data: {
      a: "one",
      b: "two",
      c: "one",
      d: i % 2 ? "one" : "two",
      e: "one",
    },
    position: { x: 0, y: 0, z: 0 },
  })),
  edges: [],
};
for (let count = 0; count <= 5; count++) {
  test(
    count +
      " axes preserve the product, shared slabs, containment and independent placement",
    () => {
      const axes = ["a", "b", "c", "d", "e"]
        .slice(0, count)
        .map((attribute) => ({
          attribute,
          values: ["one", "two"],
        }));
      const data = classify(graph, axes);
      const view = defaultView(axes);
      const space = planSpace(data, view);
      const reverse = planSpace(
        classify(
          {
            ...graph,
            nodes: [...graph.nodes].reverse(),
          },
          axes,
        ),
        view,
      );
      const grown = planSpace(
        classify(
          {
            ...graph,
            nodes: [
              ...graph.nodes,
              { ...graph.nodes[0]!, id: "new" },
            ],
          },
          axes,
        ),
        view,
      );
      return check(
        data.cells.length === 2 ** count &&
          space.blocks.length ===
            2 ** Math.max(0, count - 3) &&
          space.blocks.every((block) =>
            block.cells.every((c) =>
              c.nodes.every((n) => {
                const p = space.place(n)!,
                  q = reverse.place(n)!;
                return (
                  p.x === q.x &&
                  p.y === q.y &&
                  p.z === q.z &&
                  p.y === c.max.y - 32 &&
                  p.y + 16 <= c.max.y &&
                  p.z - 16 >= c.min.z &&
                  p.z + 16 <= c.max.z &&
                  p.x - 32 >= c.min.x &&
                  p.x + 32 <= c.max.x &&
                  grown.blocks.some((b) =>
                    b.cells.some(
                      (other) =>
                        other.address.join() ===
                          c.address.join() &&
                        other.nodes.some(
                          (m) => m.id === n.id,
                        ),
                    ),
                  ) &&
                  graph.nodes.every((m) => {
                    const t = space.place(m)!;
                    return (
                      n.id === m.id ||
                      Math.abs(t.x - p.x) >= 64 ||
                      Math.abs(t.y - p.y) >= 32 ||
                      Math.abs(t.z - p.z) >= 32
                    );
                  })
                );
              }),
            ),
          ) &&
          Object.values(space.slabs).every(
            (bounds) =>
              bounds.every(
                (v, i) =>
                  v % 16 === 0 &&
                  (!i || v > bounds[i - 1]!),
              ),
          ),
        toBe(true),
      );
    },
  );
}

test("five-axis blocks share all three slab boundaries and stand 96 apart on the ground", () => {
  const axes = ["a", "b", "c", "d", "e"].map(
    (attribute) => ({
      attribute,
      values: ["one", "two"],
    }),
  );
  const data = classify(graph, axes);
  const space = planSpace(
    data,
    defaultView(axes),
  );
  const [first, column, row] = space.blocks;
  return check(
    !!first &&
      !!column &&
      !!row &&
      column.min.x - first.max.x === 96 &&
      row.min.z - first.max.z === 96 &&
      space.blocks.every(
        (block) =>
          block.min.y === 0 &&
          block.cells.every((cell) =>
            (
              ["x", "y", "z"] satisfies (
                | "x"
                | "y"
                | "z"
              )[]
            ).every((axis, i) =>
              axis === "y"
                ? block.max.y - cell.max.y ===
                    space.slabs.y[
                      cell.index[i]!
                    ] &&
                  block.max.y - cell.min.y ===
                    space.slabs.y[
                      cell.index[i]! + 1
                    ]
                : cell.min[axis] -
                    block.min[axis] ===
                    space.slabs[axis][
                      cell.index[i]!
                    ] &&
                  cell.max[axis] -
                    block.min[axis] ===
                    space.slabs[axis][
                      cell.index[i]! + 1
                    ],
            ),
          ),
      ),
    toBe(true),
  );
});

const inspectRoutes = (
  graph: Graph,
  layers = false,
) => {
  const occupied: ReturnType<typeof aisleRuns> =
    [];
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  for (const edge of graph.edges) {
    const path = edge.path;
    if (!path?.length) {
      const a = byId.get(edge.source)!.position,
        b = byId.get(edge.target)!.position;
      if (a.z !== b.z || (a.y !== b.y && !layers))
        throw Error(
          "missing path " +
            edge.source +
            " -> " +
            edge.target,
        );
      continue;
    }
    const runs = aisleRuns(path);
    if (lanesOverlap(runs, occupied))
      throw Error(
        "crowded lanes " +
          edge.source +
          " -> " +
          edge.target,
      );
    occupied.push(...runs);
    const first = path[0]!,
      last = path[path.length - 1]!;
    for (const [node, tip, next] of [
      [byId.get(edge.source)!, first, path[1]!],
      [
        byId.get(edge.target)!,
        last,
        path[path.length - 2]!,
      ],
    ] satisfies [FlowNode, Point3, Point3][]) {
      if (
        tip.z !== node.position.z ||
        next.z !== tip.z ||
        Math.hypot(
          next.x - tip.x,
          next.y - tip.y,
        ) < 16
      )
        throw Error(
          "invalid flank approach " + node.id,
        );
    }
    const manhattan =
      Math.abs(first.x - last.x) +
      Math.abs(first.y - last.y) +
      Math.abs(first.z - last.z);
    const length = path
      .slice(1)
      .reduce(
        (sum, p, i) =>
          sum +
          Math.hypot(
            p.x - path[i]!.x,
            p.y - path[i]!.y,
            p.z - path[i]!.z,
          ),
        0,
      );
    if (
      length > 1.6 * manhattan ||
      path.length > 7
    )
      throw Error(
        "length/count " +
          edge.source +
          " -> " +
          edge.target +
          " " +
          length +
          "/" +
          manhattan +
          " " +
          path.length,
      );

    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!,
        b = path[i]!;
      if (
        Number(a.x !== b.x) +
          Number(a.y !== b.y) +
          Number(a.z !== b.z) !==
        1
      )
        throw Error(
          "diagonal " +
            edge.source +
            " -> " +
            edge.target,
        );
      for (const n of byId.values()) {
        if (
          n.id === edge.source ||
          n.id === edge.target
        )
          continue;
        const p = n.position,
          s = nodeSize(n),
          depth = bodyDepth(n);
        const floor = p.y + s.height / 2 + 16;
        if (
          !layers &&
          a.y !== b.y &&
          Math.min(a.y, b.y) < floor &&
          Math.max(a.y, b.y) > floor &&
          Math.abs(a.x - p.x) < s.width / 2 + 6 &&
          Math.abs(a.z - p.z) < depth + 6
        )
          throw Error(
            "riser outside aisle at " + n.id,
          );
        if (
          Math.min(a.x, b.x) <
            p.x + s.width / 2 + 6 &&
          Math.max(a.x, b.x) >
            p.x - s.width / 2 - 6 &&
          Math.min(a.y, b.y) <
            p.y + s.height / 2 + 6 &&
          Math.max(a.y, b.y) >
            p.y - s.height / 2 - 6 &&
          Math.min(a.z, b.z) < p.z + depth + 30 &&
          Math.max(a.z, b.z) > p.z - depth - 30
        )
          throw Error(
            edge.source +
              " -> " +
              edge.target +
              " pierces " +
              n.id,
          );
      }
    }
  }
};
for (const sample of [
  "rooms",
  "dimensions",
  "layers",
]) {
  test(
    sample +
      " planned runs clear the boxes and only incident paths move",
    () => {
      const source = readFileSync(
        "../plgg-flow-example/markdown/samples/" +
          sample +
          ".md",
        "utf8",
      )
        .split("plgg-flow fill dsl\n")[1]!
        .split("\n```")[0]!;
      const spec = parseSpec(source);
      if (spec.__tag === "Err")
        throw Error(spec.content);
      const f = specFlow(spec.content);
      inspectRoutes(f, sample === "layers");
      const original = JSON.stringify(
        f.edges.map((e) => e.path),
      );
      for (const yaw of [0, 1.2])
        renderToString(
          flowView({
            ...f,
            camera: { ...f.camera, yaw },
          }),
        );
      if (
        original !==
        JSON.stringify(f.edges.map((e) => e.path))
      )
        throw Error("orbit changed a route");
      if (spec.content.axes) {
        const axes = Object.values(
            spec.content.axes,
          ),
          data = classify(
            spec.content.graph,
            axes,
          ),
          view = defaultView(axes);
        const times = Array.from(
          { length: 15 },
          () => {
            const start = performance.now();
            planSpace(data, view);
            return performance.now() - start;
          },
        ).sort((a, b) => a - b);
        if (times[7]! >= 2)
          throw Error(
            "median space plan took " +
              times[7] +
              " ms",
          );
      }
      const id = f.edges.find(
        (e) => e.path,
      )!.source;
      const moved = moveSelectionGeometry(
        f,
        [id],
        { x: 4, y: 0, z: 3 },
      );
      inspectRoutes(moved, sample === "layers");
      const wires = wireGraph(f),
        other = wireGraph(moved, {
          draggedNode: id,
        });
      return check(
        f.edges.every(
          (e, i) =>
            e.source === id ||
            e.target === id ||
            (e === moved.edges[i] &&
              wires[i] === other[i]),
        ),
        toBe(true),
      );
    },
  );
}
for (let seed = 1; seed <= 10; seed++) {
  test(
    "orthogonal routes in generated space " +
      seed,
    () => {
      let state = seed;
      const random = () => {
        state =
          (Math.imul(state, 1664525) +
            1013904223) >>>
          0;
        return state / 4294967296;
      };
      const axes = ["a", "b", "c", "d"]
        .slice(0, 2 + (seed % 3))
        .map((attribute) => ({
          attribute,
          values: ["one", "two"],
        }));
      const nodes = graph.nodes
        .slice(0, 9)
        .map((n) => ({
          ...n,
          data: Object.fromEntries(
            axes.map((a) => [
              a.attribute,
              a.values[Math.floor(random() * 2)]!,
            ]),
          ),
        }));
      const edges = nodes
        .slice(1)
        .map((n, i) => ({
          id: n.id,
          source:
            nodes[Math.floor(random() * (i + 1))]!
              .id,
          target: n.id,
        }));
      const space = planSpace(
        classify({ nodes, edges }, axes),
        defaultView(axes),
      );
      inspectRoutes({
        nodes: nodes.map((n) => ({
          ...n,
          position: space.place(n)!,
        })),
        edges: edges.map((e) => ({
          ...e,
          path: space.routes.get(e.id) ?? [],
        })),
      });
      return check(
        space.routes.size > 0,
        toBe(true),
      );
    },
  );
}

test("screen crossings sort at their intersection and halo only the nearer stroke", () => {
  const a = [
      { x: 0, y: 0, z: 0, scale: 1 },
      { x: 100, y: 0, z: 100, scale: 1 },
    ],
    b = [
      { x: 20, y: -20, z: 30, scale: 1 },
      { x: 20, y: 20, z: 30, scale: 1 },
    ];
  const spans = crossingSpans([a, b]);
  const back = crossingRuns(a, spans[0]!, []),
    front = crossingRuns(b, spans[1]!, []);
  return check(
    back.some((r) => r.depth === 20) &&
      back.every((r) => !r.halo) &&
      front.some((r) => r.halo && r.depth === 30),
    toBe(true),
  );
});
