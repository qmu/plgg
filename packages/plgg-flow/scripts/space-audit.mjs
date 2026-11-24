// Space audit — the acceptance tool for plgg-flow's space layout and
// its wires (see LAYOUT.md, "Crossings are optimised in space").
// Places and routes spaces given as nodes with attributes and edges,
// WITHOUT coordinates, and counts what makes a space sheet dirty.
// Build first, then:  node packages/plgg-flow/scripts/space-audit.mjs
// Owned by the reviewer. The implementer does not edit this file.
//
// Contract it relies on (plgg-flow/autoLayout):
//   classify(graph, axes) -> data
//   defaultView(axes) -> view            ({x?,y?,z?,column?,row?,pins})
//   planSpace(data, view) -> { routes: Map<edgeId|index, Point3[]>,
//       blocks: [{ cells: [{ nodes, min, max }] }], place(node) }
//   routeSpace({nodes, edges}, cells) -> Map   (cells: {min,max,block,members})
import {
  classify,
  defaultView,
  planSpace,
  routeSpace,
} from "../dist/autoLayout.es.js";

const rng = (seed) => () =>
  ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const node = (id, data) => ({
  id,
  label: id,
  width: 16 * Math.max(4, Math.ceil((id.length * 8 + 24) / 16)),
  height: 32,
  position: { x: 0, y: 0, z: 0 },
  data,
});
const edges = (pairs) =>
  pairs.map(([source, target], i) => ({
    id: "e" + i,
    source,
    target,
  }));

const S = {};
const rooms3 = () => {
  const N = [
    ["Web", "入口", "顧客", "本番"],
    ["Preview", "入口", "顧客", "検証"],
    ["Gateway", "入口", "基盤", "本番"],
    ["Checkout", "入口", "注文", "本番"],
    ["Auth", "処理", "顧客", "本番"],
    ["Orders", "処理", "注文", "本番"],
    ["Payments", "処理", "注文", "本番"],
    ["Sandbox", "処理", "注文", "検証"],
    ["Monitor", "処理", "基盤", "本番"],
    ["Users", "保存", "顧客", "本番"],
    ["Ledger", "保存", "注文", "本番"],
    ["Fixtures", "保存", "注文", "検証"],
    ["Logs", "保存", "基盤", "本番"],
    ["Trace", "保存", "基盤", "検証"],
  ];
  return {
    nodes: N.map(([id, a, b, c]) =>
      node(id, { 層: a, 担当: b, 環境: c }),
    ),
    edges: edges([
      ["Web", "Gateway"],
      ["Checkout", "Gateway"],
      ["Gateway", "Auth"],
      ["Gateway", "Orders"],
      ["Auth", "Users"],
      ["Orders", "Payments"],
      ["Payments", "Ledger"],
      ["Orders", "Monitor"],
      ["Monitor", "Logs"],
      ["Preview", "Sandbox"],
      ["Sandbox", "Fixtures"],
      ["Sandbox", "Trace"],
      ["Trace", "Logs"],
    ]),
  };
};
S.rooms3 = {
  g: rooms3(),
  axes: [
    { attribute: "層", values: ["入口", "処理", "保存"] },
    { attribute: "担当", values: ["顧客", "注文", "基盤"] },
    { attribute: "環境", values: ["本番", "検証"] },
  ],
};
S.rooms4 = {
  g: (() => {
    const g = rooms3();
    g.nodes.forEach(
      (n, i) => (n.data.地域 = i % 3 === 2 ? "大阪" : "東京"),
    );
    return g;
  })(),
  axes: [
    ...S.rooms3.axes,
    { attribute: "地域", values: ["東京", "大阪"] },
  ],
};
const cake = (boards, perBoard, extra, seed) => {
  const r = rng(seed);
  const names = Array.from({ length: boards }, (_, i) => "L" + i);
  const nodes = [];
  const pairs = [];
  names.forEach((l, i) => {
    for (let k = 0; k < perBoard; k++) {
      nodes.push(node(l + "n" + k, { 層: l }));
      if (i > 0)
        pairs.push([
          names[i - 1] + "n" + Math.floor(r() * perBoard),
          l + "n" + k,
        ]);
      if (k > 0 && r() < 0.45)
        pairs.push([l + "n" + (k - 1), l + "n" + k]);
    }
  });
  for (let k = 0; k < extra; k++) {
    const i = Math.floor(r() * (boards - 1));
    pairs.push([
      names[i] + "n" + Math.floor(r() * perBoard),
      names[i + 1] + "n" + Math.floor(r() * perBoard),
    ]);
  }
  const seen = new Set();
  return {
    g: {
      nodes,
      edges: edges(
        pairs.filter(([a, b]) => {
          const k = a + ">" + b;
          return a !== b && !seen.has(k) && seen.add(k);
        }),
      ),
    },
    axes: [{ attribute: "層", values: names }],
    view: { y: "層", pins: {} },
  };
};
S.cake2 = cake(2, 4, 2, 11);
S.cake3 = cake(3, 4, 3, 12);
S.cake4 = cake(4, 3, 3, 13);
S.cakeWide = cake(3, 7, 5, 14);
const random = (dims, count, per, seed) => {
  const r = rng(seed);
  const axes = dims.map((n, i) => ({
    attribute: "a" + i,
    values: Array.from({ length: n }, (_, k) => "v" + k),
  }));
  const nodes = Array.from({ length: count }, (_, i) =>
    node(
      "n" + i,
      Object.fromEntries(
        axes.map((a) => [
          a.attribute,
          a.values[Math.floor(r() * a.values.length)],
        ]),
      ),
    ),
  );
  const pairs = [];
  const seen = new Set();
  for (let i = 0; i < count * per; i++) {
    const a = Math.floor(r() * count),
      b = Math.floor(r() * count);
    const k = Math.min(a, b) + ">" + Math.max(a, b);
    if (a === b || seen.has(k)) continue;
    seen.add(k);
    pairs.push(["n" + a, "n" + b]);
  }
  return { g: { nodes, edges: edges(pairs) }, axes };
};
S.rand2a = random([3, 2], 8, 1.2, 21);
S.rand2b = random([3, 3], 14, 1.3, 22);
S.rand3a = random([2, 2, 2], 10, 1.2, 23);
S.rand3b = random([3, 3, 2], 20, 1.4, 24);
S.rand3c = random([3, 2, 3], 30, 1.5, 25);
S.rand4a = random([2, 2, 2, 2], 16, 1.3, 26);
S.rand4b = random([3, 2, 2, 2], 24, 1.4, 27);

const AX = ["x", "y", "z"];
const cellsOf = (space) =>
  space.blocks.flatMap((b, block) =>
    b.cells.map((c) => ({
      min: c.min,
      max: c.max,
      block,
      members: c.nodes.map((n) => n.id),
    })),
  );
const routeKey = (routes, e, i) =>
  routes.get(e.id) ?? routes.get(i) ?? routes.get(String(i));
// Every wire as a list of runs; a wire without a path is the straight
// line between its nodes (the standard wire lies in one plane).
const runsOf = (g, pos, routes) =>
  g.edges.flatMap((e, i) => {
    const pts = routeKey(routes, e, i) ?? [
      pos.get(e.source),
      pos.get(e.target),
    ];
    if (!pts[0] || !pts[pts.length - 1]) return [];
    return pts.slice(1).map((q, k) => ({
      wire: i,
      ends: [e.source, e.target],
      a: pts[k],
      b: q,
    }));
  });
const axisOf = (r) => {
  const moved = AX.filter((d) => Math.abs(r.a[d] - r.b[d]) > 0.5);
  return moved.length === 1 ? moved[0] : moved.length ? "oblique" : "none";
};
const measure = (g, pos, routes) => {
  const runs = runsOf(g, pos, routes).filter(
    (r) => axisOf(r) !== "none",
  );
  let oblique = 0,
    overlaps = 0,
    pierce = 0,
    length = 0;
  const cross = { x: 0, y: 0, z: 0 };
  for (const r of runs) {
    if (axisOf(r) === "oblique") oblique++;
    length += Math.hypot(
      r.a.x - r.b.x,
      r.a.y - r.b.y,
      r.a.z - r.b.z,
    );
  }
  for (let i = 0; i < runs.length; i++)
    for (let j = i + 1; j < runs.length; j++) {
      const p = runs[i],
        q = runs[j];
      if (p.wire === q.wire) continue;
      const d = axisOf(p);
      if (d !== "oblique" && d === axisOf(q)) {
        const others = AX.filter((k) => k !== d);
        if (
          others.every((k) => Math.abs(p.a[k] - q.a[k]) < 1) &&
          Math.min(Math.max(p.a[d], p.b[d]), Math.max(q.a[d], q.b[d])) -
            Math.max(Math.min(p.a[d], p.b[d]), Math.min(q.a[d], q.b[d])) >
            1
        )
          overlaps++;
      }
      const shared = p.ends.some((n) => q.ends.includes(n));
      for (const drop of AX) {
        const [u, v] = AX.filter((k) => k !== drop);
        const o = (a, b, c) =>
          (b[u] - a[u]) * (c[v] - a[v]) -
          (b[v] - a[v]) * (c[u] - a[u]);
        const d1 = o(p.a, p.b, q.a),
          d2 = o(p.a, p.b, q.b),
          d3 = o(q.a, q.b, p.a),
          d4 = o(q.a, q.b, p.b);
        if (
          !shared &&
          d1 * d2 < -1e-6 &&
          d3 * d4 < -1e-6
        )
          cross[drop]++;
      }
    }
  const boxes = g.nodes
    .filter((n) => pos.get(n.id))
    .map((n) => {
      const p = pos.get(n.id);
      return {
        id: n.id,
        min: { x: p.x - n.width / 2 - 4, y: p.y - n.height / 2 - 4, z: p.z - 36 },
        max: { x: p.x + n.width / 2 + 4, y: p.y + n.height / 2 + 4, z: p.z + 36 },
      };
    });
  for (const r of runs)
    for (const b of boxes) {
      if (r.ends.includes(b.id)) continue;
      let lo = 0,
        hi = 1;
      for (const k of AX) {
        const d = r.b[k] - r.a[k];
        if (Math.abs(d) < 1e-9) {
          if (r.a[k] <= b.min[k] || r.a[k] >= b.max[k]) hi = -1;
        } else {
          const t1 = (b.min[k] - r.a[k]) / d,
            t2 = (b.max[k] - r.a[k]) / d;
          lo = Math.max(lo, Math.min(t1, t2));
          hi = Math.min(hi, Math.max(t1, t2));
        }
      }
      if (hi - lo > 1e-6) pierce++;
    }
  // (the box above is grown by 24 toward the lettered faces: the
  // air before a caption is kept clear; nodes themselves are 12 deep)
  let nodeOverlap = 0;
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++)
      if (
        AX.every(
          (k) =>
            boxes[i].min[k] + (k === "z" ? 28 : 4) <
              boxes[j].max[k] - (k === "z" ? 28 : 4) &&
            boxes[j].min[k] + (k === "z" ? 28 : 4) <
              boxes[i].max[k] - (k === "z" ? 28 : 4),
        )
      )
        nodeOverlap++;
  const wires = new Map();
  for (const r of runs) wires.set(r.wire, (wires.get(r.wire) ?? 0) + 1);
  const bends = [...wires.values()].reduce((s, n) => s + n - 1, 0);
  return {
    oblique,
    overlaps,
    pierce,
    nodeOverlap,
    cx: cross.x,
    cy: cross.y,
    cz: cross.z,
    cross: cross.x + cross.y + cross.z,
    bends,
    length: Math.round(length),
  };
};
const plan = (s, g = s.g) => {
  const data = classify(g, s.axes);
  const view = s.view ?? defaultView(data.axes ?? s.axes);
  const space = planSpace(data, view);
  const pos = new Map(
    g.nodes.flatMap((n) => {
      const p = space.place(n);
      return p ? [[n.id, p]] : [];
    }),
  );
  return { space, pos };
};
const shuffle = (list, r) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const rows = [];
const defects = [];
const only = process.argv[2];
for (const [name, s] of Object.entries(S)) {
  if (only && only !== name) continue;
  const t0 = performance.now();
  let planned;
  try {
    planned = plan(s);
  } catch (error) {
    defects.push({ name, kind: "threw", sev: 3, note: String(error) });
    continue;
  }
  let ms = performance.now() - t0;
  for (let i = 0; i < 4; i++) {
    const t = performance.now();
    plan(s);
    ms = Math.min(ms, performance.now() - t);
  }
  const { space, pos } = planned;
  const m = measure(s.g, pos, space.routes);
  // The best of random arrangements that use the same slots: nodes of
  // one cell exchange places, wires are re-routed.
  const cells = cellsOf(space);
  const r = rng(name.length * 977 + 5);
  let best = Infinity;
  const tries = s.g.nodes.length <= 20 ? 300 : 0;
  for (let t = 0; t < tries; t++) {
    const p2 = new Map(pos);
    for (const c of cells) {
      const ids = c.members.filter((id) => pos.get(id));
      const mixed = shuffle(ids, r);
      ids.forEach((id, k) => {
        const from = pos.get(mixed[k]);
        const own = s.g.nodes.find((n) => n.id === id);
        const other = s.g.nodes.find((n) => n.id === mixed[k]);
        // keep the box on the grid: same left edge as the slot's owner
        p2.set(id, {
          ...from,
          x: from.x - other.width / 2 + own.width / 2,
        });
      });
    }
    try {
      const routed = routeSpace(
        {
          nodes: s.g.nodes
            .filter((n) => p2.get(n.id))
            .map((n) => ({ ...n, position: p2.get(n.id) })),
          edges: s.g.edges,
        },
        cells,
      );
      const alt = measure(s.g, p2, routed);
      if (!alt.pierce && !alt.nodeOverlap)
        best = Math.min(best, alt.cross);
    } catch {
      /* an arrangement the router refuses is not a candidate */
    }
  }
  // order independence
  const r2 = rng(7);
  const again = plan(s, {
    nodes: shuffle(s.g.nodes, r2),
    edges: shuffle(s.g.edges, r2),
  });
  const moved = s.g.nodes.filter((n) => {
    const a = pos.get(n.id),
      b = again.pos.get(n.id);
    return a && b && AX.some((k) => Math.abs(a[k] - b[k]) > 0.5);
  }).length;
  const add = (kind, sev, note) =>
    defects.push({ name, kind, sev, note });
  if (m.overlaps) add("wires-overlap", 3, m.overlaps + " pairs of runs");
  if (m.pierce) add("wire-through-node", 3, m.pierce + " runs");
  if (m.nodeOverlap) add("nodes-overlap", 3, m.nodeOverlap + " pairs");
  if (m.oblique) add("oblique-run", 2, m.oblique + " runs off the lattice");
  if (moved) add("order-dependent", 3, moved + " nodes move with input order");
  if (best < Infinity) {
    if (m.cross > 2 * best + 1)
      add("far-more-crossings", 3, `${m.cross} vs random-best ${best}`);
    else if (m.cross > best + 1)
      add("more-crossings", 2, `${m.cross} vs random-best ${best}`);
  }
  if (ms > 20) add("slow", ms > 60 ? 3 : 2, ms.toFixed(1) + " ms");
  rows.push({
    name,
    nodes: s.g.nodes.length,
    wires: s.g.edges.length,
    overlap: m.overlaps,
    pierce: m.pierce,
    oblique: m.oblique,
    cx: m.cx,
    cy: m.cy,
    cz: m.cz,
    cross: m.cross,
    best: best === Infinity ? "-" : best,
    bends: m.bends,
    length: m.length,
    ms: Number(ms.toFixed(2)),
  });
}
console.table(rows);
const count = (sev) => defects.filter((d) => d.sev === sev).length;
for (const d of defects.filter((d) => d.sev >= 2))
  console.log(`sev${d.sev} ${d.name}: ${d.kind} — ${d.note}`);
console.log(
  `TOTAL sev3 ${count(3)} sev2 ${count(2)} crossings ${rows.reduce((s, r) => s + r.cross, 0)} bends ${rows.reduce((s, r) => s + r.bends, 0)}`,
);
process.exit(count(3) ? 1 : 0);
