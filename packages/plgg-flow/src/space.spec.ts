import { test, check, toBe } from "plgg-test";
import {
  classify,
  defaultView,
  planSpace,
} from "plgg-flow/autoLayout";
import type { Graph } from "./model";
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
                  p.y === c.min.y + 32 &&
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
            ).every(
              (axis, i) =>
                cell.min[axis] -
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
