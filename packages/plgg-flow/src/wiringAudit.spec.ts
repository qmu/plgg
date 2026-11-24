import {
  canonical,
  curvePath,
} from "plgg-flow/wireCurve";
import {
  box,
  inflate,
  free,
} from "plgg-flow/wireGeometry";
import { portPosition } from "plgg-flow/nodeBody";
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
  wireMetrics,
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
        ...(w.edge.route === "step"
          ? ws.slice(i + 1)
          : []
        ).map((v) => {
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
              Math.abs(p.y) <=
              (route === "curve"
                ? 18 +
                  0.75 *
                    (24 +
                      0.13 *
                        gap(w.source, w.target)) +
                  (w.controls ? 0 : 14)
                : 18 + 24 + 3 * 10),
          ),
        ),
        toBe(true),
      ),
  );
}

test("a card pushes a wire continuously while the selected sockets and over-under side hold", () => {
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
      // The preferred rim changes when the centre crosses the chord.
      if (
        old &&
        old.sourceSide === w.sourceSide &&
        old.targetSide === w.targetSide &&
        !(i === 0 && (y === 0 || y === 2))
      ) {
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

test("diagonal curves clear the central card inside their endpoint span", () => {
  const nodes = [
    n("a", -200, -120),
    n("c", -200, 120),
    n("M", 0, 0),
    n("d", 200, -120),
    n("f", 200, 120),
  ];
  const wires = wireGraph({
    nodes,
    edges: [
      e("a", "f"),
      e("c", "d"),
      e("a", "d"),
      e("c", "f"),
    ],
  });
  return check(
    wires
      .slice(0, 2)
      .every((w) =>
        w.points.every(
          (p) =>
            Math.abs(p.y) <= 120.01 &&
            (Math.abs(p.x) > 52 ||
              Math.abs(p.y) >= 18),
        ),
      ),
    toBe(true),
  );
});

for (const route of [
  "curve",
  "step",
] satisfies WireStyle[]) {
  test(
    route +
      " places interleaved pipeline skips on two pages",
    () => {
      const graph = {
        ...pipeline,
        edges: pipeline.edges.map((edge) => ({
          ...edge,
          route,
        })),
      };
      const wires = wireGraph(graph);
      const arcs = wires.slice(7);
      let conflicts = 0;
      for (const a of arcs)
        for (const b of arcs) {
          const l = Math.min(
              a.source.x,
              a.target.x,
            ),
            r = Math.max(a.source.x, a.target.x);
          const u = Math.min(
              b.source.x,
              b.target.x,
            ),
            v = Math.max(b.source.x, b.target.x);
          if (
            a.sourceSide === b.sourceSide &&
            l < u &&
            u < r &&
            r < v
          )
            conflicts++;
        }
      return all([
        check(conflicts, toBe(2)),
        ...(route === "step"
          ? [
              check(
                wireMetrics(graph, wires)
                  .crossings,
                toBe(2),
              ),
            ]
          : []),
        check(
          arcs.every((w) => {
            const heights = w.points.map((p) =>
              Math.abs(p.y),
            );
            const peak = heights.indexOf(
              Math.max(...heights),
            );
            return heights.every((h, j) => {
              const prev = heights[j - 1] ?? h;
              return j <= peak
                ? h >= prev - 1e-6
                : h <= prev + 1e-6;
            });
          }),
          toBe(true),
        ),
        check(
          arcs.every(
            (w) => w.sourceSide === w.targetSide,
          ),
          toBe(true),
        ),
      ]);
    },
  );

  test(
    route +
      " centers a reciprocal bundle and faces the diagonal neighbour",
    () => {
      const nodes = [
        n("A", -200, 0),
        n("B", 200, 0),
        n("C", 0, 160),
      ];
      const edges = [
        e("A", "B"),
        e("A", "B"),
        e("A", "B"),
        e("B", "A"),
        e("B", "A"),
        e("C", "B"),
        e("B", "C"),
        e("A", "C"),
      ].map((edge) => ({ ...edge, route }));
      const wires = wireGraph({ nodes, edges });
      const levels = wires
        .slice(0, 5)
        .map(
          (w) =>
            w.points.reduce(
              (best, p) =>
                Math.abs(p.x) < Math.abs(best.x)
                  ? p
                  : best,
              w.source,
            ).y,
        )
        .sort((a, b) => a - b);
      const singleBow = (wire: Wire) => {
        const height = wire.points.reduce(
          (h, p) =>
            Math.abs(p.y) > Math.abs(h) ? p.y : h,
          0,
        );
        if (!height)
          return wire.points.every(
            (p) => p.y === 0,
          );
        // A parabola has one signed curvature throughout the chord.
        return wire.points.every((p) => {
          const f =
            (p.x - wire.source.x) /
            (wire.target.x - wire.source.x);
          return (
            Math.abs(
              p.y - 4 * height * f * (1 - f),
            ) < 0.05
          );
        });
      };
      return all([
        check(wires[5]?.targetSide, toBe("left")),
        check(
          route !== "curve" ||
            wires.slice(0, 5).every(singleBow),
          toBe(true),
        ),
        check(wires[6]?.sourceSide, toBe("left")),
        check(
          wires[7]?.sourceSide,
          toBe("right"),
        ),
        check(
          levels.every(
            (v, i) =>
              Math.abs(
                v + (levels[4 - i] ?? Infinity),
              ) < 0.05 &&
              (!i ||
                v - (levels[i - 1] ?? v) > 6),
          ),
          toBe(true),
        ),
      ]);
    },
  );

  test(
    route +
      " preserves every self-loop point while another node moves",
    () => {
      const edges = [
        e("editing", "editing"),
        e("ready", "editing"),
        e("editing", "ready"),
      ].map((edge) => ({ ...edge, route }));
      const loop = (x: number, y: number) =>
        wireGraph({
          nodes: [
            n("editing", 0, 0),
            n("ready", x, y),
          ],
          edges,
        })[0]?.points;
      return check(
        loop(-160, -120),
        toEqual(loop(95, -12)),
      );
    },
  );
}

test("step diamond branches keep their shared source side into the merge", () => {
  const nodes = [
    n("S", -400, 0),
    n("a", -200, -120),
    n("b", -200, 0),
    n("c", -200, 120),
    n("M", 0, 0),
    n("d", 200, -120),
    n("f", 200, 120),
    n("T", 400, 0),
  ];
  const edges: Edge[] = [
    e("S", "a"),
    e("S", "b"),
    e("S", "c"),
    e("a", "M"),
    e("b", "M"),
    e("c", "M"),
    e("M", "d"),
    e("M", "f"),
    e("d", "T"),
    e("f", "T"),
    e("a", "d"),
    e("c", "f"),
    e("S", "T"),
    e("a", "f"),
    e("c", "d"),
  ].map((edge) => ({ ...edge, route: "step" }));
  const graph = { nodes, edges };
  const wires = wireGraph(graph);
  return all(
    ["a", "c"].map((id) => {
      const fan = wires.filter(
        (w) => w.edge.source === id,
      );
      return all([
        check(
          fan.every(
            (w) => w.sourceSide === "right",
          ),
          toBe(true),
        ),
        check(
          fan.find((w) => w.edge.target === "M")
            ?.targetSide,
          toBe("left"),
        ),
        check(
          wireMetrics(graph, fan).crossings,
          toBe(0),
        ),
      ]);
    }),
  );
});

test("a narrowing cluster passage clears the moving card with at most two vias", () => {
  const nodes = [
    ...["a", "b"].flatMap((prefix, j) =>
      Array.from({ length: 6 }, (_, i) =>
        n(
          prefix + i,
          (j ? 300 : -380) + (i % 2) * 180,
          (j ? 40 : -60) +
            Math.floor(i / 2) * 110 -
            110,
        ),
      ),
    ),
  ];
  const edges = [
    ...["a", "b"].flatMap((p) => [
      ...Array.from({ length: 5 }, (_, i) =>
        e(p + i, p + (i + 1)),
      ),
      e(p + "0", p + "3"),
      e(p + "1", p + "4"),
      e(p + "5", p + "0"),
    ]),
    e("a1", "b0"),
    e("a3", "b2"),
    e("a5", "b4"),
    e("b1", "a4"),
    e("a1", "b4"),
    e("b5", "a0"),
  ];
  let clear = true;
  for (let k = 0; k <= 10; k++) {
    const graph = {
      edges,
      nodes: nodes.map((node) =>
        node.id === "a3"
          ? n(
              node.id,
              node.position.x - 4 * k,
              node.position.y - 3 * k,
            )
          : node,
      ),
    };
    const wire = wireGraph(graph).find(
      (w) =>
        w.edge.source === "a1" &&
        w.edge.target === "a4",
    );
    if (!wire)
      throw new Error("Missing cluster route");
    const card = graph.nodes.find(
      (n) => n.id === "a3",
    );
    if (!card)
      throw new Error("Missing moving card");
    clear &&=
      wire.corners <= 2 &&
      wire.points.every(
        (p) =>
          Math.abs(p.x - card.position.x) >= 52 ||
          Math.abs(p.y - card.position.y) >= 18,
      );
  }
  return check(clear, toBe(true));
});

test("canonical arches nest by their socket span", () => {
  const arches = wireGraph(pipeline).filter(
    (w) =>
      w.controls && w.sourceSide === w.targetSide,
  );
  const heights = arches
    .map((w) => {
      const span = gap(w.source, w.target);
      const height = Math.max(
        ...w.points.map((p) =>
          Math.abs(p.y - w.source.y),
        ),
      );
      return { span, height };
    })
    .sort((a, b) => a.span - b.span);
  return all([
    check(heights.length >= 2, toBe(true)),
    check(
      heights.every(
        ({ span, height }, i) =>
          Math.abs(
            height - 0.75 * (24 + 0.13 * span),
          ) < 0.02 &&
          (!i ||
            height >=
              heights[i - 1]!.height - 0.02),
      ),
      toBe(true),
    ),
  ]);
});

test("a blocked facing cubic keeps both sockets while denting around the blocker", () => {
  const nodes = [n("a", 0, 0), n("b", 400, 150)],
    edges = [e("a", "b")];
  const direct = wireGraph({ nodes, edges })[0]!;
  const dent = wireGraph({
    nodes: [...nodes, n("block", 180, 60)],
    edges,
  })[0]!;
  return all([
    check(direct.targetSide, toBe("left")),
    check(dent.sourceSide, toBe("right")),
    check(
      dent.targetSide,
      toBe(direct.targetSide),
    ),
    check(dent.controls, toBe(undefined)),
    check(
      dent.points.every(
        (p) =>
          Math.hypot(
            Math.max(0, Math.abs(p.x - 180) - 52),
            Math.max(0, Math.abs(p.y - 60) - 18),
          ) >= 10,
      ),
      toBe(true),
    ),
  ]);
});

test("diamonds diagonals use monotone filleted runs when their facing sockets are occupied by siblings", () => {
  const nodes = [
    n("S", -400, 0),
    n("a", -200, -120),
    n("b", -200, 0),
    n("c", -200, 120),
    n("M", 0, 0),
    n("d", 200, -120),
    n("f", 200, 120),
    n("T", 400, 0),
  ];
  return all(
    [
      [1, 6],
      [3, 5],
    ].map(([i, j]) => {
      const a = nodes[i!]!,
        b = nodes[j!]!;
      const w = curvePath(
        e(a.id, b.id),
        {
          ...portPosition(a, "right", 0),
          side: "right",
        },
        {
          ...portPosition(b, "left", 0),
          side: "left",
        },
        nodes.map(box),
        0,
        1,
        false,
      );
      const dx = w.target.x - w.source.x,
        dy = w.target.y - w.source.y;
      return all([
        check(w.controls, toBe(undefined)),
        check(
          w.corners >= 1 && w.corners <= 2,
          toBe(true),
        ),
        check(
          w.points.every((p, k) => {
            const prev = w.points[k - 1];
            return (
              (!prev ||
                dx * (p.x - prev.x) +
                  dy * (p.y - prev.y) >=
                  -1e-7) &&
              Math.hypot(
                Math.max(0, Math.abs(p.x) - 52),
                Math.max(0, Math.abs(p.y) - 18),
              ) >= 9.99
            );
          }),
          toBe(true),
        ),
      ]);
    }),
  );
});

test("canonical handles follow the socket axes and clamp their reach", () => {
  const s = {
    x: 0,
    y: 0,
    z: 0,
    side: "bottom",
  } satisfies import("./wireBase").Socket;
  const arm = (
    x: number,
    y: number,
    side: import("./nodeBody").Side,
  ) => canonical(s, { x, y, z: 0, side }).p1.y;
  return check(
    [
      arm(500, 80, "top"),
      arm(500, 10, "top"),
      arm(240, 20, "left"),
      arm(500, 20, "left"),
      arm(300, 400, "bottom"),
    ],
    toEqual([40, 24, 120, 160, 89]),
  );
});

test("stacked children use one rounded guide on the same side of each intervening sibling", () => {
  const wires = wireGraph(orgTree);
  return check(
    wires.every(
      (w) =>
        w.sourceSide === "bottom" &&
        w.targetSide === "top" &&
        (!w.edge.target.endsWith(".1") ||
          (w.corners === 1 &&
            w.points.every(
              (p) => p.x >= w.source.x - 1e-8,
            ) &&
            w.points.some(
              (p) => p.x > w.source.x + 45,
            ))),
    ),
    toBe(true),
  );
});

test("removing a different pair preserves the trace at unchanged curve sockets", () => {
  const before = wireGraph(microservices);
  return check(
    before.every((removed) => {
      const edges = microservices.edges.filter(
        (e) => e !== removed.edge,
      );
      const after = wireGraph({
        ...microservices,
        edges,
      });
      return after.every((w) => {
        const old = before.find(
          (p) => p.edge === w.edge,
        )!;
        const samePair =
          [
            removed.edge.source,
            removed.edge.target,
          ].includes(w.edge.source) &&
          [
            removed.edge.source,
            removed.edge.target,
          ].includes(w.edge.target);
        return (
          samePair ||
          w.sourceSide !== old.sourceSide ||
          w.targetSide !== old.targetSide ||
          JSON.stringify(w.points) ===
            JSON.stringify(old.points)
        );
      });
    }),
    toBe(true),
  );
});

const grid5x4 = () => {
  const nodes = Array.from(
    { length: 20 },
    (_, i) =>
      n(
        "g" + Math.floor(i / 4) + (i % 4),
        -480 + Math.floor(i / 4) * 240,
        -210 + (i % 4) * 140,
      ),
  );
  let seed = 7;
  const pick = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return nodes[
      Math.floor(
        (seed / 4294967296) * nodes.length,
      )
    ]!.id;
  };
  const edges: Edge[] = [];
  while (edges.length < 26) {
    const source = pick(),
      target = pick();
    if (
      source !== target &&
      !edges.some(
        (edge) =>
          edge.source === source &&
          edge.target === target,
      )
    )
      edges.push(e(source, target));
  }
  return { nodes, edges };
};
for (const route of [
  "curve",
  "step",
] satisfies WireStyle[]) {
  test(
    route +
      " keeps distant grid wires within 20u throughout a 40-step drag",
    () => {
      const graph = grid5x4();
      const edges = graph.edges.map((edge) => ({
        ...edge,
        route,
      }));
      const moved = graph.nodes[0]!;
      let before = wireGraph(
        { nodes: graph.nodes, edges },
        { draggedNode: moved.id },
      );
      let previous = inflate(box(moved), 34);
      const failures: string[] = [];
      for (let step = 1; step <= 40; step++) {
        const node = {
          ...moved,
          position: {
            ...moved.position,
            x: moved.position.x + 24 * step,
            y: moved.position.y + 10.5 * step,
          },
        };
        const current = inflate(box(node), 34);
        const after = wireGraph(
          {
            nodes: [
              node,
              ...graph.nodes.slice(1),
            ],
            edges,
          },
          { draggedNode: moved.id },
        );
        after.forEach((w, i) => {
          const old = before[i]!;
          if (
            old === w ||
            w.edge.source === node.id ||
            w.edge.target === node.id ||
            !free(old.points, [previous]) ||
            !free(w.points, [current])
          )
            return;
          const close = (a: Wire, b: Wire) =>
            [...a.points, ...samples(a)].every(
              (p) =>
                b.points.some(
                  (q, j) =>
                    j > 0 &&
                    segmentGap(
                      p,
                      q,
                      b.points[j - 1]!,
                    ) <= 20,
                ),
            );
          if (!close(old, w) || !close(w, old))
            failures.push(
              step +
                " " +
                w.edge.source +
                "→" +
                w.edge.target,
            );
        });
        before = after;
        previous = current;
      }
      return check(failures, toEqual([]));
    },
  );
}

test("crossPair keeps both level wires straight on facing sides", () => {
  const nodes = [
    n("North", -225, -100),
    n("South", -225, 100),
    n("Upper", 220, -95),
    n("Lower", 220, 100),
  ].map((node) => ({
    ...node,
    width: 60,
    height: 28,
  }));
  const edges = [
    e("North", "Lower"),
    e("South", "Upper"),
    e("North", "Upper"),
    e("South", "Lower"),
  ];
  return all(
    (["curve", "step"] satisfies WireStyle[]).map(
      (route) => {
        const wires = wireGraph({
          nodes,
          edges: edges.map((edge) => ({
            ...edge,
            route,
          })),
        });
        return all(
          wires.slice(2).map((w) =>
            all([
              check(w.sourceSide, toBe("right")),
              check(w.targetSide, toBe("left")),
              check(
                w.points.every(
                  (p) =>
                    segmentGap(
                      p,
                      w.source,
                      w.target,
                    ) < 1e-8,
                ),
                toBe(true),
              ),
            ]),
          ),
        );
      },
    ),
  );
});
