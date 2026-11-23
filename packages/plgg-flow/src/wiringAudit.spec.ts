import {
  test,
  check,
  toBe,
  toEqual,
  all,
} from "plgg-test";
import type { Edge, Graph } from "./model";
import {
  wireGraph,
  type WireStyle,
  type Wire,
} from "plgg-flow/wiring";
import { nodeSize } from "plgg-flow/nodeSize";
import type { Point } from "plgg-board";
const n = (
  id: string,
  x: number,
  y: number,
  extra: { width?: number } = {},
) => ({
  id,
  label: id,
  width: 104,
  height: 36,
  position: { x, y, z: 0 },
  ...extra,
});
const e = (
  source: string,
  target: string,
): Edge => ({ source, target });
const microservices = (() => {
  const nodes = [
    n("Web", -520, -120),
    n("Mobile", -520, 40),
    n("Gateway", -300, -40),
    n("Auth", -60, -220),
    n("Users", -60, -110),
    n("Orders", -60, 0),
    n("Catalog", -60, 110),
    n("Search", -60, 220),
    n("Queue", 200, -60),
    n("Payments", 200, 60),
    n("Mailer", 430, -140),
    n("Ledger", 430, 0),
    n("Cache", 200, 220),
    n("DB", 430, 160),
    n("Audit", 640, 0),
  ];
  const pairs = [
    ["Web", "Gateway"],
    ["Mobile", "Gateway"],
    ["Gateway", "Auth"],
    ["Gateway", "Users"],
    ["Gateway", "Orders"],
    ["Gateway", "Catalog"],
    ["Gateway", "Search"],
    ["Orders", "Queue"],
    ["Orders", "Payments"],
    ["Queue", "Mailer"],
    ["Queue", "Ledger"],
    ["Payments", "Ledger"],
    ["Catalog", "Cache"],
    ["Search", "Cache"],
    ["Cache", "DB"],
    ["Users", "DB"],
    ["Orders", "DB"],
    ["Ledger", "Audit"],
    ["Mailer", "Audit"],
    ["Auth", "Users"],
    ["Payments", "Orders"],
    ["Audit", "Gateway"],
    ["DB", "Catalog"],
  ] satisfies [string, string][];
  const edges = pairs.map(([a, b]) => e(a, b));
  return { nodes, edges };
})();
const orgTree = (() => {
  const nodes = [n("CEO", 0, -220)],
    edges: Edge[] = [];
  ["A", "B", "C"].forEach((d, i) => {
    nodes.push(n(d, (i - 1) * 380, -80));
    edges.push(e("CEO", d));
    [0, 1, 2].forEach((k) => {
      const id = d + k;
      nodes.push(
        n(id, (i - 1) * 380 + (k - 1) * 120, 60),
      );
      edges.push(e(d, id));
      [0, 1].forEach((m) => {
        const lid = id + "." + m;
        nodes.push(
          n(
            lid,
            (i - 1) * 380 + (k - 1) * 120,
            180 + m * 70,
            { width: 90 },
          ),
        );
        edges.push(e(id, lid));
      });
    });
  });
  return { nodes, edges };
})();
const pipeline = (() => {
  const ids = [
    "Src",
    "Parse",
    "Lint",
    "Type",
    "Opt",
    "Emit",
    "Pack",
    "Ship",
  ];
  const nodes = ids.map((id, i) =>
    n(id, -560 + i * 160, 0),
  );
  const edges = [
    ...ids.flatMap((id, i) => {
      const next = ids[i + 1];
      return next ? [e(id, next)] : [];
    }),
    e("Src", "Type"),
    e("Parse", "Emit"),
    e("Src", "Ship"),
    e("Lint", "Pack"),
    e("Ship", "Src"),
    e("Emit", "Parse"),
    e("Type", "Ship"),
  ];
  return { nodes, edges };
})();

const gap = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const segmentGap = (
  p: Point,
  a: Point,
  b: Point,
) => {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const f = Math.min(
    1,
    Math.max(
      0,
      ((p.x - a.x) * dx + (p.y - a.y) * dy) /
        (dx * dx + dy * dy || 1),
    ),
  );
  return Math.hypot(
    p.x - a.x - dx * f,
    p.y - a.y - dy * f,
  );
};
const samples = (w: Wire) => {
  const out: Point[] = [];
  let next = 0;
  for (const [i, b] of w.points.entries()) {
    const a = w.points[i - 1];
    if (!a) continue;
    const d = gap(a, b);
    while (next < d) {
      out.push({
        x: a.x + ((b.x - a.x) * next) / d,
        y: a.y + ((b.y - a.y) * next) / d,
      });
      next += 6;
    }
    next -= d;
  }
  return out;
};
const invariants = (graph: Graph) => {
  const ws = wireGraph(graph),
    by = new Map(
      graph.nodes.map((n) => [n.id, n]),
    );
  return all([
    check(ws.length, toBe(graph.edges.length)),
    ...ws.flatMap((w, i) => {
      const pts = samples(w);
      const centred = (
        end: "source" | "target",
      ) => {
        const node = by.get(w.edge[end]);
        if (!node) return false;
        const size = nodeSize(node),
          dx = Math.abs(
            w[end].x - node.position.x,
          ),
          dy = Math.abs(
            w[end].y - node.position.y,
          );
        return (
          (dx === 0 && dy === size.height / 2) ||
          (dy === 0 && dx === size.width / 2)
        );
      };
      return [
        check(
          centred("source") && centred("target"),
          toBe(true),
        ),
        check(
          graph.nodes.every(
            (n) =>
              n.id === w.edge.source ||
              n.id === w.edge.target ||
              pts.every(
                (p) =>
                  Math.abs(p.x - n.position.x) >=
                    nodeSize(n).width / 2 - 0.5 ||
                  Math.abs(p.y - n.position.y) >=
                    nodeSize(n).height / 2 - 0.5,
              ),
          ),
          toBe(true),
        ),
        ...ws.slice(i + 1).map((v) => {
          const near = pts.filter(
            (p) =>
              [
                w.source,
                w.target,
                v.source,
                v.target,
              ].every(
                (end) => gap(p, end) > 22,
              ) &&
              v.points.some((b, k) => {
                const a = v.points[k - 1];
                return (
                  a && segmentGap(p, a, b) < 2.5
                );
              }),
          );
          return check(
            near.length <= 3,
            toBe(true),
          );
        }),
      ];
    }),
  ]);
};
for (const [name, graph] of Object.entries({
  microservices,
  orgTree,
  pipeline,
})) {
  for (const route of [
    "curve",
    "step",
  ] satisfies WireStyle[]) {
    test(
      name +
        " " +
        route +
        " clears cards and separates shared sockets",
      () =>
        invariants({
          ...graph,
          edges: graph.edges.map((e) => ({
            ...e,
            route,
          })),
        }),
    );
  }
}
for (const route of [
  "curve",
  "step",
] satisfies WireStyle[]) {
  const routes = () =>
    wireGraph({
      ...pipeline,
      edges: pipeline.edges.map((edge) => ({
        ...edge,
        route,
      })),
    });
  test(
    route +
      " keeps the free Src to Parse corridor straight",
    () =>
      check(
        routes()[0]?.points.every(
          (p) => p.y === 0,
        ),
        toBe(true),
      ),
  );
  test(
    route +
      " bounds pipeline skips by the row and its lanes",
    () =>
      check(
        routes().every((w) =>
          w.points.every(
            (p) =>
              Math.abs(p.y) <= 18 + 24 + 3 * 10,
          ),
        ),
        toBe(true),
      ),
  );
}

test("a card pushes a wire continuously on each side of the over-under tie", () => {
  const left = n("left", -220, 0);
  const right = n("right", 220, 0);
  const distant = [
    n("upper left", -220, -240),
    n("upper right", 220, -240),
  ];
  const edges = [
    e("left", "right"),
    e("upper left", "upper right"),
  ];
  let previous: readonly Wire[] = [];
  let worst = 0;
  let earlyPush = false;
  let clear = true;
  for (let y = -90; y <= 64; y += 2) {
    const card = n("card", 0, y);
    const wires = wireGraph({
      nodes: [left, right, ...distant, card],
      edges,
    });
    for (const [i, w] of wires.entries()) {
      if (i === 0 && y === -26)
        earlyPush = w.points.some((p) => p.y > 0);
      const old = previous[i];
      // At the centre the two collision-free detours exchange sides.
      if (old && !(i === 0 && y === 0)) {
        // Measure both directions to catch a disappearing detour.
        for (const [from, to] of [
          [old, w],
          [w, old],
        ] satisfies [Wire, Wire][]) {
          for (const point of from.points) {
            let nearest = Infinity;
            for (
              let j = 1;
              j < to.points.length;
              j++
            ) {
              const a = to.points[j - 1],
                b = to.points[j];
              if (a && b)
                nearest = Math.min(
                  nearest,
                  segmentGap(point, a, b),
                );
            }
            worst = Math.max(worst, nearest);
          }
        }
      }
      clear &&= w.points.every(
        (p) =>
          Math.abs(p.x) >= 52 ||
          Math.abs(p.y - y) >= 18,
      );
    }
    previous = wires;
  }
  return all([
    check(previous.length, toBe(2)),
    check(clear, toBe(true)),
    check(earlyPush, toBe(true)),
    check(worst <= 14, toBe(true)),
  ]);
});

test("routing depends only on the current graph values", () => {
  const graph = (y: number) => ({
    nodes: [
      n("a", -220, 0),
      n("b", 220, 0),
      n("card", 0, y),
    ],
    edges: [e("a", "b")],
  });
  const sweep = (y: number) => {
    const initial = graph(y),
      first = wireGraph(initial);
    const nodes = initial.nodes.map((node) =>
      node.id === "card"
        ? n("card", 0, -y)
        : node,
    );
    const next = wireGraph({
      nodes,
      edges: initial.edges,
    });
    const again = wireGraph(graph(y));
    return { first, next, again };
  };
  const forward = sweep(-2),
    reverse = sweep(2);
  const mutable = graph(-2);
  wireGraph(mutable);
  const card = mutable.nodes[2];
  if (!card) throw new Error("Missing card");
  card.position.y = 2;
  return all([
    check(forward.first, toEqual(forward.again)),
    check(reverse.first, toEqual(reverse.again)),
    check(forward.next, toEqual(reverse.first)),
    check(reverse.next, toEqual(forward.first)),
    check(
      wireGraph(mutable),
      toEqual(reverse.first),
    ),
  ]);
});

test("repeated edges route like equal separate edges", () => {
  const nodes = [n("a", -220, 0), n("b", 220, 0)];
  const edge = e("a", "b");
  return check(
    wireGraph({ nodes, edges: [edge, edge] }),
    toEqual(
      wireGraph({
        nodes,
        edges: [{ ...edge }, { ...edge }],
      }),
    ),
  );
});

for (const route of [
  "curve",
  "step",
] satisfies WireStyle[]) {
  test(
    route +
      " removing a wire off both sockets keeps each remaining path within its lane shift",
    () => {
      // Nested spans share a channel while each socket belongs to a distinct node.
      const nodes = Array.from(
        { length: 8 },
        (_, i) => n(String(i), i * 160, 0),
      );
      const nested = {
        nodes,
        edges: [
          e("0", "6"),
          e("1", "7"),
          e("2", "5"),
          e("3", "4"),
        ],
      };
      return all(
        [
          nested,
          microservices,
          orgTree,
          pipeline,
        ].flatMap((graph) => {
          const nodes = graph.nodes,
            edges = graph.edges.map((edge) => ({
              ...edge,
              route,
            }));
          const before = wireGraph({
            nodes,
            edges,
          });
          return before.map((removedWire) => {
            const removed = removedWire.edge;
            const after = wireGraph({
              nodes,
              edges: edges.filter(
                (edge) => edge !== removed,
              ),
            });
            return check(
              after.every((w) => {
                const old = before.find(
                  (v) => v.edge === w.edge,
                );
                if (!old) return false;
                if (
                  [old.source, old.target].some(
                    (s) =>
                      [
                        removedWire.source,
                        removedWire.target,
                      ].some(
                        (t) =>
                          s.x === t.x &&
                          s.y === t.y,
                      ),
                  )
                )
                  return true;
                // An occupied fan can shift by its lane span when a shared channel opens.
                const lanes = (socket: Point) =>
                  before.filter((v) =>
                    [v.source, v.target].some(
                      (p) =>
                        p.x === socket.x &&
                        p.y === socket.y,
                    ),
                  ).length;
                const bound = Math.max(
                  14,
                  10 *
                    (Math.max(
                      lanes(old.source),
                      lanes(old.target),
                    ) -
                      1),
                );
                return [
                  [old, w],
                  [w, old],
                ].every(
                  ([a, b]) =>
                    a &&
                    b &&
                    a.points.every((p) =>
                      b.points.some((q, i) => {
                        const r = b.points[i - 1];
                        return (
                          r &&
                          segmentGap(p, q, r) <=
                            bound + 0.000001
                        );
                      }),
                    ),
                );
              }),
              toBe(true),
            );
          });
        }),
      );
    },
  );
}
