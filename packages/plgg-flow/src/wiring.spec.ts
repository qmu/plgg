import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  wireGraph,
  wireMetrics,
  type WireStyle,
  type Wire,
} from "plgg-flow/wiring";
import type { Graph, Edge } from "./model";
import { nodeSize } from "plgg-flow/nodeSize";
const node = (
  id: string,
  x: number,
  y: number,
) => ({
  id,
  label: id,
  width: 104,
  height: 36,
  position: { x, y, z: 0 },
});
const link = (
  source: string,
  target: string,
): Edge => ({ source, target });
const pair = [
  node("A", -240, 0),
  node("B", 240, 0),
];
const column = (
  x: number,
  n: number,
  prefix: string,
) =>
  Array.from({ length: n }, (_, i) =>
    node(prefix + i, x, (i - (n - 1) / 2) * 100),
  );
const left = column(-240, 5, "L"),
  right = column(240, 5, "R");
const grid = Array.from({ length: 9 }, (_, i) =>
  node(
    String(i),
    (i % 3) * 220,
    Math.floor(i / 3) * 140,
  ),
);
const pairs = (indices: number[][]) =>
  indices.map(([a, b]) =>
    link(String(a), String(b)),
  );
const patterns = {
  single: {
    nodes: [
      node("A", -240, 0),
      node("B", 240, 100),
    ],
    edges: [link("A", "B")],
  },
  fanIn: {
    nodes: [...left, node("B", 240, 0)],
    edges: left.map((n) => link(n.id, "B")),
  },
  fanOut: {
    nodes: [node("A", -240, 0), ...right],
    edges: right.map((n) => link("A", n.id)),
  },
  cross: {
    nodes: [
      node("N", -225, -100),
      node("S", -225, 100),
      node("U", 220, -95),
      node("L", 220, 100),
    ],
    edges: [
      link("N", "L"),
      link("S", "U"),
      link("N", "U"),
      link("S", "L"),
    ],
  },
  blocked: {
    nodes: [...pair, node("C", 0, 0)],
    edges: [link("A", "B")],
  },
  corridor: {
    nodes: [
      ...pair,
      node("C", 0, -33),
      node("D", 0, 57),
    ],
    edges: [link("A", "B")],
  },
  backward: {
    nodes: [
      node("A", -150, 40),
      node("B", 150, 0),
    ],
    edges: [link("B", "A")],
  },
  cycle: {
    nodes: pair,
    edges: [link("A", "B"), link("B", "A")],
  },
  stacked: {
    nodes: [node("A", 0, 0), node("B", 0, 140)],
    edges: [link("A", "B")],
  },
  bipartite: {
    nodes: [..."ABCD"]
      .map((id, i) =>
        node(id, -250, -150 + i * 100),
      )
      .concat(
        [..."PQRS"].map((id, i) =>
          node(id, 200, -150 + i * 100),
        ),
        node("M", -20, 0),
      ),
    edges: [
      "AS",
      "BP",
      "CQ",
      "DR",
      "AQ",
      "DP",
      "SA",
    ].map((pair) =>
      link(pair.charAt(0), pair.charAt(1)),
    ),
  },
  fanBlocked: {
    nodes: [..."ABCDE"]
      .map((id, i) =>
        node(id, -250, -160 + i * 80),
      )
      .concat(
        node("T", 150, 0),
        node("X", -40, -20),
      ),
    edges: [..."ABCDE"].map((id) =>
      link(id, "T"),
    ),
  },
  dense: {
    nodes: grid,
    edges: pairs([
      [0, 2],
      [0, 8],
      [1, 7],
      [2, 6],
      [3, 5],
      [5, 0],
      [6, 8],
      [7, 2],
      [8, 1],
      [6, 1],
    ]),
  },
  parallel: {
    nodes: pair,
    edges: [link("A", "B"), link("A", "B")],
  },
  mixed: {
    nodes: [...left, ...right],
    edges: [
      { ...link("L0", "R1"), route: "curve" },
      { ...link("L2", "R3"), route: "step" },
      { ...link("L4", "R4"), route: "straight" },
    ],
  },
} satisfies Record<string, Graph>;
const perpendicularEnds = (w: Wire) =>
  [false, true].every((reverse) => {
    const points = reverse
      ? [...w.points].reverse()
      : w.points;
    const origin = points[0];
    if (!origin) return false;
    let length = 0;
    for (const [i, p] of points.entries()) {
      const q = points[i - 1];
      if (!q) continue;
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (!d) continue;
      const f = Math.min(1, (14 - length) / d),
        side = reverse
          ? w.targetSide
          : w.sourceSide,
        vertical =
          side === "top" || side === "bottom";
      const normal =
        (vertical
          ? q.y + (p.y - q.y) * f - origin.y
          : q.x + (p.x - q.x) * f - origin.x) *
        (side === "top" || side === "left"
          ? -1
          : 1);
      const tangent = vertical
        ? q.x + (p.x - q.x) * f - origin.x
        : q.y + (p.y - q.y) * f - origin.y;
      if (normal < 0 || Math.abs(tangent) > 1.5)
        return false;
      length += d;
      if (length >= 14) return true;
    }
    return false;
  });
for (const style of [
  "curve",
  "step",
] satisfies WireStyle[]) {
  for (const [name, pattern] of Object.entries(
    patterns,
  )) {
    test(name + " " + style, () => {
      const graph: Graph = {
        nodes: pattern.nodes,
        edges: pattern.edges.map((e) => ({
          ...e,
          route:
            name === "mixed" &&
            style === "curve" &&
            "route" in e
              ? e.route
              : style,
        })),
      };
      const wires = wireGraph(graph),
        m = wireMetrics(graph, wires);
      const times = Array.from(
        { length: 9 },
        () => {
          const fresh = {
            nodes: [...graph.nodes],
            edges: [...graph.edges],
          };
          const start = performance.now();
          wireGraph(fresh);
          return performance.now() - start;
        },
      ).sort((a, b) => a - b);
      const ms = times[4] ?? Infinity;
      return all([
        check(
          wires.length,
          toBe(graph.edges.length),
        ),
        check(
          // Wall-clock is only a blow-up guard here: CI
          // runners are several times slower than a
          // laptop. The real budget lives in the audit
          // (scripts/wiring-audit.mjs, "slow").
          name !== "dense" || ms < 250,
          toBe(true),
        ),
        check(
          name === "bipartite" && ms >= 150
            ? ms
            : 0,
          toBe(0),
        ),
        check(
          wires.every((w) =>
            name === "stacked"
              ? w.sourceSide === "bottom" &&
                w.targetSide === "top"
              : name === "backward"
                ? w.sourceSide === "left" &&
                  w.targetSide === "right"
                : name !== "cycle" ||
                  wires.every(
                    (v) =>
                      v.edge.target !==
                        w.edge.source ||
                      v.targetSide !==
                        w.sourceSide,
                  ),
          ),
          toBe(true),
        ),
        check(m.nodeHits, toBe(0)),
        check(
          wires.every((w) =>
            (
              ["source", "target"] satisfies (
                | "source"
                | "target"
              )[]
            ).every((end) => {
              const n = graph.nodes.find(
                (n) => n.id === w.edge[end],
              );
              if (!n) return false;
              const { width, height } =
                  nodeSize(n),
                side =
                  end === "source"
                    ? w.sourceSide
                    : w.targetSide;
              const x =
                n.position.x +
                (side === "right"
                  ? width / 2
                  : side === "left"
                    ? -width / 2
                    : 0);
              const y =
                n.position.y +
                (side === "bottom"
                  ? height / 2
                  : side === "top"
                    ? -height / 2
                    : 0);
              return (
                w[end].x === x &&
                w[end].y === y &&
                w[end].z === n.position.z
              );
            }),
          ),
          toBe(true),
        ),
        check(
          wires.every(perpendicularEnds),
          toBe(true),
        ),
        check(
          name !== "cross" || m.crossings === 1,
          toBe(true),
        ),
        check(
          name !== "single" || m.maxCorners <= 2,
          toBe(true),
        ),
        check(
          wires.every(
            (w, i) =>
              w.edge === graph.edges[i] &&
              w.points[0]?.x === w.source.x &&
              w.points[0]?.y === w.source.y &&
              w.points[w.points.length - 1]?.x ===
                w.target.x &&
              w.points[w.points.length - 1]?.y ===
                w.target.y &&
              w.points.every((p, j) => {
                const q = w.points[j - 1];
                return (
                  !q ||
                  Math.hypot(
                    p.x - q.x,
                    p.y - q.y,
                  ) <= 12.00001
                );
              }),
          ),
          toBe(true),
        ),
        check(
          JSON.stringify(wires),
          toBe(
            JSON.stringify(
              wireGraph({
                ...graph,
                nodes: [...graph.nodes],
              }),
            ),
          ),
        ),
      ]);
    });
  }
}
for (const style of [
  "curve",
  "step",
] satisfies WireStyle[]) {
  test(
    style +
      " moving a card leaves distant wires stable",
    () => {
      const nodes = [...left, ...right],
        edges = left.map((n, i) => ({
          ...link(n.id, "R" + i),
          route: style,
        }));
      const before = wireGraph({ nodes, edges }),
        after = wireGraph({
          nodes: nodes.map((n, i) =>
            i
              ? n
              : node(
                  n.id,
                  n.position.x,
                  n.position.y + 2,
                ),
          ),
          edges,
        });
      return check(
        before.slice(1).every((w, i) =>
          w.points.every((p, j) => {
            const q = after[i + 1]?.points[j];
            return (
              q &&
              Math.hypot(p.x - q.x, p.y - q.y) <=
                6
            );
          }),
        ),
        toBe(true),
      );
    },
  );
  test(
    style +
      " 40 cards and 60 wires route within a frame",
    () => {
      const nodes = Array.from(
        { length: 40 },
        (_, i) =>
          node(
            String(i),
            Math.floor(i / 8) * 260,
            (i % 8) * 110,
          ),
      );
      const edges = Array.from(
        { length: 60 },
        (_, i) =>
          link(
            String(i % 32),
            String(
              (i % 32) +
                8 +
                (i >= 32 && i % 8 < 7 ? 1 : 0),
            ),
          ),
      );
      const start = performance.now();
      const wires = wireGraph({
        nodes,
        edges: edges.map((e) => ({
          ...e,
          route: style,
        })),
      });
      const elapsed = performance.now() - start;

      return check(
        // A blow-up guard, not the budget: see the audit.
        wires.length === 60 && elapsed < 500,
        toBe(true),
      );
    },
  );
}
test("typed handles and user knots survive shared sockets", () => {
  const knot = { x: 50, y: 90, z: 17 },
    manual = {
      ...link("A", "B"),
      sourceHandle: "out",
      waypoints: [knot],
    };
  const graph = {
    nodes: pair,
    edges: [link("A", "B"), manual],
  };
  const routes = wireGraph(graph),
    wire = routes[1];
  return all([
    check(
      wire?.points.includes(knot),
      toBe(true),
    ),
    check(wire?.source.y, toBe(0)),
    check(
      wireMetrics(graph, routes).minPortGap === 0,
      toBe(true),
    ),
    check(
      routes === wireGraph({ ...graph }),
      toBe(true),
    ),
  ]);
});
test("depth follows the free span between waist-height stems", () => {
  const graph = {
    nodes: patterns.blocked.nodes.map((n) =>
      n.id === "B"
        ? {
            ...n,
            position: { ...n.position, z: 100 },
          }
        : n,
    ),
    edges: patterns.blocked.edges,
  };
  const points =
      wireGraph(graph)[0]?.points ?? [],
    lengths = [0];
  for (const [i, p] of points.entries()) {
    const q = points[i - 1];
    if (q)
      lengths.push(
        (lengths[i - 1] ?? 0) +
          Math.hypot(p.x - q.x, p.y - q.y),
      );
  }
  const total = lengths[lengths.length - 1] ?? 0;
  return check(
    total > 0 &&
      points.every(
        (p, i) =>
          Math.abs(
            p.z -
              100 *
                Math.min(
                  1,
                  Math.max(
                    0,
                    ((lengths[i] ?? 0) - 14) /
                      (total - 28),
                  ),
                ),
          ) < 1e-8,
      ),
    toBe(true),
  );
});
test("clearance options invalidate cached geometry", () => {
  const graph = patterns.blocked,
    small = wireGraph(graph),
    large = wireGraph(graph, { clearance: 42 });
  return check(
    small !== large &&
      wireMetrics(graph, large).minClearance >=
        42,
    toBe(true),
  );
});
test("only visible solid cards obstruct routes", () => {
  const graph = {
    nodes: [
      ...pair,
      { ...node("C", 0, 0), hidden: true },
      { ...node("D", 0, 0), group: true },
    ],
    edges: [link("A", "B")],
  };
  return check(
    wireGraph(graph)[0]?.points.every(
      (p) => p.y === 0,
    ),
    toBe(true),
  );
});
test("a transverse crossing at a sample counts once", () => {
  const path = (
    id: string,
    coords: [number, number][],
  ): Wire => {
    const points = coords.map(([x, y]) => ({
        x,
        y,
        z: 0,
      })),
      source = points[0],
      target = points[points.length - 1];
    if (!source || !target)
      throw new Error("Empty fixture");
    return {
      source,
      target,
      arrow: { at: target, toward: target },
      sourceSide: "right",
      targetSide: "left",
      edge: link(id, id + " end"),
      corners: 0,
      points,
    };
  };
  const base = path("A", [
    [-2, 0],
    [0, 0],
    [2, 0],
  ]);
  const count = (coords: [number, number][]) =>
    wireMetrics({ nodes: [], edges: [] }, [
      base,
      path("B", coords),
    ]).crossings;
  return all([
    check(
      count([
        [0, -2],
        [0, 0],
        [0, 2],
      ]),
      toBe(1),
    ),
    check(
      count([
        [-1, -2],
        [0, 0],
        [1, -2],
      ]),
      toBe(0),
    ),
    check(
      count([
        [0, -2],
        [0, 0],
      ]),
      toBe(0),
    ),
  ]);
});

test("four flank centres follow the node dimensions and waist", () => {
  const center = {
    ...node("C", 0, 0),
    width: 180,
    height: 60,
    position: { x: 0, y: 0, z: 22 },
  };
  const others = [
    node("R", 400, 0),
    node("L", -400, 0),
    node("T", 0, -400),
    node("B", 0, 400),
  ];
  const wires = wireGraph({
    nodes: [center, ...others],
    edges: others.map((n) => link("C", n.id)),
  });
  const expected = [
    [90, 0],
    [-90, 0],
    [0, -30],
    [0, 30],
  ];
  return check(
    wires.length === 4 &&
      wires.every(
        (w, i) =>
          w.source.x === expected[i]?.[0] &&
          w.source.y === expected[i]?.[1] &&
          w.source.z === 22,
      ),
    toBe(true),
  );
});
test("a near-level step uses one smooth jog", () => {
  const graph = {
    nodes: [node("A", 0, 0), node("B", 300, 12)],
    edges: [{ ...link("A", "B"), route: "step" }],
  } satisfies Graph;
  const w = wireGraph(graph)[0];
  return check(
    w &&
      w.corners <= 2 &&
      perpendicularEnds(w) &&
      w.points.some((p) => p.y > 0 && p.y < 12),
    toBe(true),
  );
});
test("a single wire faces its peer along the dominant axis", () => {
  const side = (y: number) =>
    wireGraph({
      nodes: [node("A", 0, 0), node("B", 200, y)],
      edges: [link("A", "B")],
    })[0]?.sourceSide;
  return all([
    check(side(190), toBe("right")),
    check(side(210), toBe("bottom")),
  ]);
});
test("typed handles follow the chosen face", () => {
  const graph = patterns.backward;
  return check(
    (
      ["curve", "step"] satisfies WireStyle[]
    ).every((route) => {
      const pinned = {
        ...graph,
        edges: graph.edges.map((e) => ({
          ...e,
          sourceHandle: "out",
          targetHandle: "in",
          route,
        })),
      };
      return wireGraph(pinned).every(
        (w) =>
          w.sourceSide === "left" &&
          w.targetSide === "right" &&
          perpendicularEnds(w),
      );
    }),
    toBe(true),
  );
});

test("a remote card leaves the backward route unchanged", () => {
  const graph = patterns.backward;
  return check(
    (
      ["step", "curve"] satisfies WireStyle[]
    ).every((route) => {
      const edges = graph.edges.map((e) => ({
        ...e,
        route,
      }));
      const wire = wireGraph({
        nodes: graph.nodes,
        edges,
      })[0];
      const moved = wireGraph({
        nodes: [
          ...graph.nodes,
          node("far", 1900, -900),
        ],
        edges,
      })[0];
      return (
        wire &&
        JSON.stringify(wire.points) ===
          JSON.stringify(moved?.points) &&
        wire.points.every(
          (p) =>
            p.x >= -310 &&
            p.x <= 310 &&
            p.y >= 0 &&
            p.y <= 40,
        ) &&
        wire.sourceSide === "left" &&
        wire.targetSide === "right"
      );
    }),
    toBe(true),
  );
});

test("overlap measures the whole collinear run across sample boundaries", () => {
  const graph = patterns.parallel;
  const wire = wireGraph(graph)[0];
  if (!wire)
    throw new Error("Missing parallel route");
  const offset = (y: number) => ({
    ...wire,
    points: [0, 8, 16, 24, 32].map((x) => ({
      x,
      y,
      z: 0,
    })),
  });
  const overlap = (y: number) =>
    wireMetrics({ nodes: [], edges: [] }, [
      offset(0),
      offset(y),
    ]).overlap;
  return all([
    check(overlap(3), toBe(32)),
    check(overlap(4), toBe(0)),
  ]);
});

test("arrivals and departures own separate pipeline and tree faces", () => {
  const ids = ["Src", "Parse", "Lint", "Ship"];
  const pipeline = {
    nodes: ids.map((id, i) =>
      node(id, i * 160, 0),
    ),
    edges: [
      link("Src", "Parse"),
      link("Parse", "Lint"),
      link("Lint", "Ship"),
      link("Src", "Ship"),
      link("Ship", "Src"),
    ],
  };
  const tree = {
    nodes: [
      node("Root", 0, -140),
      node("Dept", 0, 0),
      node("L", -160, 140),
      node("R", 160, 140),
    ],
    edges: [
      link("Root", "Dept"),
      link("Dept", "L"),
      link("Dept", "R"),
    ],
  };
  return check(
    [pipeline, tree].every((graph) => {
      const wires = wireGraph(graph);
      return wires.every((w) =>
        wires.every(
          (v) =>
            v.edge.target !== w.edge.source ||
            v.targetSide !== w.sourceSide,
        ),
      );
    }),
    toBe(true),
  );
});
test("step diagonals are confined to quarter-circle corners", () => {
  const wires = [
    patterns.parallel,
    patterns.fanOut,
    patterns.cycle,
    { nodes: pair, edges: [link("A", "A")] },
  ].flatMap((graph) =>
    wireGraph({
      ...graph,
      edges: graph.edges.map((edge) => ({
        ...edge,
        route: "step",
      })),
    }),
  );
  return check(
    wires.every((w) =>
      w.points.every((p, i) => {
        const q = w.points[i - 1];
        if (
          !q ||
          Math.min(
            Math.abs(p.x - q.x),
            Math.abs(p.y - q.y),
          ) < 1e-8
        )
          return true;
        // Six equal chords sample each ten-unit quarter circle.
        const chord =
          (Math.atan2(
            Math.abs(p.y - q.y),
            Math.abs(p.x - q.x),
          ) *
            12) /
            Math.PI -
          0.5;
        return (
          Math.abs(chord - Math.round(chord)) <
            1e-6 &&
          Math.hypot(p.x - q.x, p.y - q.y) <=
            20 * Math.sin(Math.PI / 24) + 1e-6
        );
      }),
    ),
    toBe(true),
  );
});
test("a free curve follows its single cubic between stems", () => {
  const w = wireGraph(patterns.single)[0];
  if (!w) throw new Error("Missing curve");
  const u = { x: w.source.x + 14, y: w.source.y },
    v = { x: w.target.x - 14, y: w.target.y };
  const arm = Math.max(
    40,
    0.45 * Math.hypot(u.x - v.x, u.y - v.y),
  );
  const samples = Math.ceil(
    (3 *
      Math.max(
        arm,
        Math.hypot(
          v.x - u.x - 2 * arm,
          v.y - u.y,
        ),
      )) /
      12,
  );
  return check(
    Array.from(
      { length: samples + 1 },
      (_, i) => {
        const t = i / samples,
          k = 1 - t;
        const x =
          k * k * k * u.x +
          3 * k * k * t * (u.x + arm) +
          3 * k * t * t * (v.x - arm) +
          t * t * t * v.x;
        const y =
          (k * k * k + 3 * k * k * t) * u.y +
          (3 * k * t * t + t * t * t) * v.y;
        return w.points.some(
          (p) =>
            Math.hypot(p.x - x, p.y - y) < 1e-7,
        );
      },
    ).every(Boolean),
    toBe(true),
  );
});

test("the level branch of a crossing fan retains its free cubic", () => {
  const graph = patterns.cross;
  const edge = graph.edges.find(
    (e) => e.source === "N" && e.target === "U",
  );
  if (!edge)
    throw new Error("Missing fan branch");
  const single = wireGraph({
    ...graph,
    edges: [edge],
  })[0];
  const branch = wireGraph(graph).find(
    (w) => w.edge === edge,
  );
  return check(
    JSON.stringify(branch?.points),
    toBe(JSON.stringify(single?.points)),
  );
});

test("N enters Lower through its facing left socket", () =>
  check(
    wireGraph(patterns.cross)[0]?.targetSide,
    toBe("left"),
  ));

for (const route of [
  "curve",
  "step",
] satisfies WireStyle[]) {
  test(
    route +
      " keeps every wire in the distant cluster identical",
    () => {
      const cluster = [
        "a",
        "b",
        "c",
        "d",
        "e",
      ].map((id, i) => node(id, i * 180, 0));
      const fixed = [
        link("a", "b"),
        link("a", "d"),
        link("a", "e"),
        link("e", "a"),
        link("c", "e"),
      ].map((e) => ({ ...e, route }));
      const edges = [
        link("U", "V"),
        ...fixed,
        link("V", "W"),
      ];
      // The second off-row card used to disable row routing across the graph.
      const distant = (y: number) =>
        wireGraph({
          nodes: [
            ...cluster,
            node("U", 2200, 0),
            node("V", 2400, y),
            node("W", 2600, 180),
          ],
          edges,
        }).filter((w) =>
          fixed.some((e) => e === w.edge),
        );
      const isolated = wireGraph({
        nodes: cluster,
        edges: fixed,
      });
      return all([
        check(distant(0), toEqual(isolated)),
        check(distant(240), toEqual(isolated)),
      ]);
    },
  );
}

test("staggered fan branches nest at either end of a wire", () => {
  const nodes = [
    node("hub", 0, 0),
    node("outer", 300, -160),
    node("far", 440, -100),
    node("near", 300, -40),
    node("lower", 370, 60),
  ];
  return all(
    (
      ["step", "curve"] satisfies WireStyle[]
    ).flatMap((route) =>
      [false, true].map((incoming) => {
        const edges = nodes
          .slice(1)
          .map((peer) => ({
            ...(incoming
              ? link(peer.id, "hub")
              : link("hub", peer.id)),
            route,
          }));
        const graph = { nodes, edges },
          wires = wireGraph(graph),
          metrics = wireMetrics(graph, wires);
        return all([
          check(wires.length, toBe(edges.length)),
          check(metrics.crossings, toBe(0)),
          check(metrics.overlap, toBe(0)),
          check(metrics.nodeHits, toBe(0)),
        ]);
      }),
    ),
  );
});

test("parallel step wires turn across the bus at both sockets", () => {
  const edges = Array.from(
    { length: 5 },
    (_, i) =>
      ({
        ...link("A", "B"),
        id: String(i),
        route: "step",
      }) satisfies Edge,
  );
  const wires = wireGraph({ nodes: pair, edges });
  const branches = wires.filter((w) =>
    w.points.some((p) => p.y !== w.source.y),
  );
  return all([
    check(branches.length, toBe(4)),
    check(
      branches.every((w) => {
        const mid = (w.source.x + w.target.x) / 2;
        // Each offset lane needs a transverse run between its two fillets.
        const turns = w.points.filter((p, j) => {
          const before = w.points[j - 1];
          return (
            before !== undefined &&
            Math.abs(p.x - before.x) < 1e-8 &&
            Math.abs(p.y - before.y) > 1
          );
        });
        return (
          turns.some((p) => p.x < mid) &&
          turns.some((p) => p.x > mid)
        );
      }),
      toBe(true),
    ),
  ]);
});

test("dense step fans keep one transverse lane per branch on every face", () =>
  all(
    [false, true].flatMap((upright) =>
      [-1, 1].flatMap((sign) =>
        [false, true].map((incoming) => {
          const hub = node("hub", 0, 0);
          const leaves = Array.from(
            { length: 9 },
            (_, i) => {
              const level = (i - 4) * 112,
                depth =
                  sign * (780 + (i % 2) * 160);
              return node(
                String(i),
                upright ? level : depth,
                upright ? depth : level,
              );
            },
          );
          const graph = {
            nodes: [hub, ...leaves],
            edges: leaves.map(
              (leaf) =>
                ({
                  ...link(
                    incoming ? leaf.id : hub.id,
                    incoming ? hub.id : leaf.id,
                  ),
                  route: "step",
                }) satisfies Edge,
            ),
          };
          const wires = wireGraph(graph);
          const along = upright ? "y" : "x",
            across = upright ? "x" : "y";
          const depths = wires.map((w) => {
            const root = incoming
              ? w.target
              : w.source;
            const lanes = new Set<number>();
            for (const [
              i,
              p,
            ] of w.points.entries()) {
              const q = w.points[i - 1];
              if (
                q &&
                Math.abs(q[along] - p[along]) <
                  0.000001 &&
                Math.abs(q[across] - p[across]) >
                  0.000001
              )
                lanes.add(
                  Math.round(
                    Math.abs(
                      p[along] - root[along],
                    ),
                  ),
                );
            }
            return [...lanes];
          });
          return all([
            check(
              wireMetrics(graph, wires).crossings,
              toBe(0),
            ),
            check(
              depths,
              toEqual([
                [14],
                [24],
                [34],
                [44],
                [],
                [44],
                [34],
                [24],
                [14],
              ]),
            ),
          ]);
        }),
      ),
    ),
  ));
