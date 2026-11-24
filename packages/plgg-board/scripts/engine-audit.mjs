// Engine audit — the acceptance tool for plgg-board's 3D engine (see
// ENGINE.md). A small z-buffer rasteriser, written here and kept
// obviously correct, draws each scene per item id; the engine's
// vector drawing of the same scene must agree with it.
// Build first, then:  node packages/plgg-board/scripts/engine-audit.mjs
// Owned by the reviewer. The implementer does not edit this file.
//
// Contract it relies on (plgg-board):
//   project(camera)(point3) -> {x, y, z}   larger z is nearer the viewer
//   render(scene, camera, light) -> {
//     fills:   [{ id, points: [{x,y}] }]            in paint order, far first
//     strokes: [{ id, kind, points: [{x,y}] }]      kind "silhouette" | "crease"
//                                                   | "line" | "hidden"
//   }
//   scene = { solids: [{ id, style, vertices: Point3[], faces: number[][] }],
//             sheets: [{ id, style, points: Point3[] }],
//             lines:  [{ id, style, points: Point3[] }],
//             labels: [], marks: [] }
//   pick(drawing, {x,y}) -> id | undefined      (optional; audited if present)
import * as engine from "../dist/index.es.js";

const { project, render } = engine;
const N = 256;
const rng = (seed) => () =>
  ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

const boxSolid = (id, c, s) => {
  const v = [];
  for (const dz of [-1, 1])
    for (const dy of [-1, 1])
      for (const dx of [-1, 1])
        v.push({
          x: c.x + (dx * s.x) / 2,
          y: c.y + (dy * s.y) / 2,
          z: c.z + (dz * s.z) / 2,
        });
  return {
    id,
    style: "box",
    vertices: v,
    faces: [
      [0, 2, 3, 1],
      [4, 5, 7, 6],
      [0, 1, 5, 4],
      [2, 6, 7, 3],
      [0, 4, 6, 2],
      [1, 3, 7, 5],
    ],
  };
};
// One line item per segment: two parts of one polyline can lie on
// top of each other on screen at different depths, and the strokes
// carry no depth to tell them apart.
const line = (id, points) =>
  points.slice(1).map((b, i) => ({
    id: id + "#" + i,
    style: "wire",
    points: [points[i], b],
  }));
const empty = () => ({
  solids: [],
  sheets: [],
  lines: [],
  labels: [],
  marks: [],
});

const S = {};
S.oneBox = (() => {
  const s = empty();
  s.solids.push(boxSolid("a", { x: 0, y: 0, z: 0 }, { x: 96, y: 32, z: 24 }));
  return s;
})();
S.lineBehindBox = (() => {
  const s = empty();
  s.solids.push(boxSolid("a", { x: 0, y: 0, z: 0 }, { x: 96, y: 48, z: 24 }));
  s.lines.push(
    ...line("w", [
      { x: -120, y: 0, z: -60 },
      { x: 120, y: 0, z: -60 },
    ]),
  );
  return s;
})();
S.stack = (() => {
  const s = empty();
  [0, 1, 2].forEach((k) => {
    const y = k * 144;
    s.solids.push(
      boxSolid("board" + k, { x: 0, y: y + 3, z: 0 }, { x: 480, y: 6, z: 320 }),
    );
    [-1, 0, 1].forEach((i) =>
      s.solids.push(
        boxSolid(
          `n${k}.${i}`,
          { x: i * 144, y: y - 20, z: (i + k) % 2 ? 48 : -48 },
          { x: 96, y: 32, z: 24 },
        ),
      ),
    );
  });
  [0, 1].forEach((k) =>
    [-1, 0, 1].forEach((i) =>
      s.lines.push(
        ...line(`d${k}.${i}`, [
          { x: i * 144 + 60, y: k * 144 - 20, z: 100 },
          { x: i * 144 + 60, y: (k + 1) * 144 - 20, z: 100 },
          { x: i * 144 + 60, y: (k + 1) * 144 - 20, z: 48 },
        ]),
      ),
    ),
  );
  // a drop that passes through a board
  s.lines.push(
    ...line("through", [
      { x: -200, y: -60, z: -100 },
      { x: -200, y: 260, z: -100 },
    ]),
  );
  return s;
})();
S.block = (() => {
  const s = empty();
  const r = rng(5);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 2; k++)
        if (r() < 0.7)
          s.solids.push(
            boxSolid(
              `c${i}${j}${k}`,
              { x: i * 160 - 160, y: j * 96 - 96, z: k * 176 - 88 },
              { x: 96, y: 32, z: 24 },
            ),
          );
  for (let i = 0; i < 12; i++) {
    const a = {
      x: Math.floor(r() * 3) * 160 - 160 + 64,
      y: Math.floor(r() * 3) * 96 - 96,
      z: Math.floor(r() * 2) * 176 - 88,
    };
    const b = { ...a, y: Math.floor(r() * 3) * 96 - 96 };
    const c = { ...b, z: Math.floor(r() * 2) * 176 - 88 };
    s.lines.push(...line("w" + i, [a, b, c]));
  }
  [0, 1, 2].forEach((j) =>
    s.sheets.push({
      id: "floor" + j,
      style: "floor",
      points: [
        { x: -260, y: j * 96 - 76, z: -190 },
        { x: 260, y: j * 96 - 76, z: -190 },
        { x: 260, y: j * 96 - 76, z: 190 },
        { x: -260, y: j * 96 - 76, z: 190 },
      ],
    }),
  );
  return s;
})();
const randomBoxes = (count, seed) => {
  const s = empty();
  const r = rng(seed);
  const placed = [];
  let guard = 0;
  while (placed.length < count && guard++ < 5000) {
    const size = {
      x: 32 + Math.floor(r() * 5) * 16,
      y: 32 + Math.floor(r() * 3) * 16,
      z: 16 + Math.floor(r() * 4) * 16,
    };
    const c = {
      x: (r() - 0.5) * 700,
      y: (r() - 0.5) * 500,
      z: (r() - 0.5) * 500,
    };
    if (
      placed.every((p) =>
        ["x", "y", "z"].some(
          (k) =>
            Math.abs(p.c[k] - c[k]) >
            (p.size[k] + size[k]) / 2 + 8,
        ),
      )
    ) {
      placed.push({ c, size });
      s.solids.push(boxSolid("b" + placed.length, c, size));
    }
  }
  return s;
};
S.random12 = randomBoxes(12, 31);
S.random30 = randomBoxes(30, 32);
S.big = (() => {
  const s = randomBoxes(60, 33);
  const r = rng(34);
  for (let i = 0; i < 100; i++) {
    const a = { x: (r() - 0.5) * 700, y: (r() - 0.5) * 500, z: (r() - 0.5) * 500 };
    const b = { ...a, x: (r() - 0.5) * 700 };
    const c = { ...b, y: (r() - 0.5) * 500 };
    const d = { ...c, z: (r() - 0.5) * 500 };
    s.lines.push(...line("w" + i, [a, b, c, d]));
  }
  return s;
})();

const cameras = (scene, seed, count) => {
  const pts = [
    ...scene.solids.flatMap((s) => s.vertices),
    ...scene.sheets.flatMap((s) => s.points),
    ...scene.lines.flatMap((l) => l.points),
  ];
  const mid = (k) =>
    (Math.min(...pts.map((p) => p[k])) + Math.max(...pts.map((p) => p[k]))) / 2;
  const centre = { x: mid("x"), y: mid("y"), z: mid("z") };
  const radius = Math.max(
    ...pts.map((p) =>
      Math.hypot(p.x - centre.x, p.y - centre.y, p.z - centre.z),
    ),
  );
  const r = rng(seed);
  const angles = [
    [0, 0],
    [Math.PI / 2, 0],
    [0, Math.PI / 2 - 0.001],
    [-Math.PI / 6, 0.55],
    [-Math.PI / 4, 0.62],
    [Math.PI * 0.8, 0.3],
    ...Array.from({ length: count - 6 }, () => [
      (r() - 0.5) * 2 * Math.PI,
      (r() - 0.5) * 2.8,
    ]),
  ];
  return angles.map(([yaw, pitch]) => {
    const base = { yaw, pitch, scale: 110 / radius, origin: { x: 0, y: 0 } };
    const c = project(base)(centre);
    return {
      ...base,
      origin: { x: N / 2 - c.x, y: N / 2 - c.y },
    };
  });
};

// ---- the oracle: a z-buffer over triangles, nearest (largest z) wins
const fan = (pts) =>
  pts.slice(2).map((p, i) => [pts[0], pts[i + 1], p]);
const zbuffer = (scene, camera) => {
  const at = project(camera);
  const id = new Array(N * N).fill("");
  const depth = new Float64Array(N * N).fill(-Infinity);
  const tri = (name, a, b, c) => {
    const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(area) < 1e-9) return;
    const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))),
      x1 = Math.min(N - 1, Math.ceil(Math.max(a.x, b.x, c.x))),
      y0 = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))),
      y1 = Math.min(N - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5,
          py = y + 0.5;
        const w0 = ((b.x - px) * (c.y - py) - (b.y - py) * (c.x - px)) / area,
          w1 = ((c.x - px) * (a.y - py) - (c.y - py) * (a.x - px)) / area,
          w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * a.z + w1 * b.z + w2 * c.z;
        if (z > depth[y * N + x]) {
          depth[y * N + x] = z;
          id[y * N + x] = name;
        }
      }
  };
  for (const s of scene.solids)
    for (const f of s.faces)
      for (const [a, b, c] of fan(f.map((i) => at(s.vertices[i]))))
        tri(s.id, a, b, c);
  for (const s of scene.sheets)
    for (const [a, b, c] of fan(s.points.map(at))) tri(s.id, a, b, c);
  return { id, depth };
};
// ---- the engine's drawing, painted in its own order with no depth
const painted = (drawing) => {
  const id = new Array(N * N).fill("");
  for (const f of drawing.fills) {
    const pts = f.points;
    const y0 = Math.max(0, Math.floor(Math.min(...pts.map((p) => p.y)))),
      y1 = Math.min(N - 1, Math.ceil(Math.max(...pts.map((p) => p.y))));
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      const xs = [];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        if (p.y <= py !== q.y <= py)
          xs.push(p.x + ((py - p.y) / (q.y - p.y)) * (q.x - p.x));
      });
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2)
        for (
          let x = Math.max(0, Math.ceil(xs[k] - 0.5));
          x <= Math.min(N - 1, Math.floor(xs[k + 1] - 0.5));
          x++
        )
          id[y * N + x] = f.id;
    }
  }
  return id;
};
const near = (p, strokes) =>
  strokes.some((s) =>
    s.points.slice(1).some((b, i) => {
      const a = s.points[i];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const len = dx * dx + dy * dy;
      const t = len
        ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len))
        : 0;
      return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) < 1.2;
    }),
  );

const rows = [];
const defects = [];
const add = (name, kind, sev, note) => defects.push({ name, kind, sev, note });
const only = process.argv[2];
if (typeof render !== "function") {
  console.log("plgg-board exports no render() yet — nothing to audit.");
  process.exit(1);
}
const light = { direction: { x: 0.5, y: 1, z: -0.3 } };
for (const [name, scene] of Object.entries(S)) {
  if (only && only !== name) continue;
  const cams = cameras(scene, name.length * 131 + 7, name === "big" ? 8 : 50);
  let worst = 1,
    lineWorst = 1,
    faceBad = 0,
    pickBad = 0,
    pickAll = 0,
    threw = 0;
  const times = [];
  for (const camera of cams) {
    let drawing;
    const t0 = performance.now();
    try {
      drawing = render(scene, camera, light);
    } catch (error) {
      threw++;
      if (threw === 1) add(name, "threw", 3, String(error));
      continue;
    }
    times.push(performance.now() - t0);
    const truth = zbuffer(scene, camera);
    const mine = painted(drawing);
    let same = 0,
      all = 0;
    for (let i = 0; i < N * N; i++) {
      if (!truth.id[i] && !mine[i]) continue;
      all++;
      if (truth.id[i] === mine[i]) same++;
    }
    if (all) worst = Math.min(worst, same / all);
    // each box shows one to three faces
    for (const s of scene.solids) {
      const faces = drawing.fills.filter((f) => f.id === s.id).length;
      // (the BSP may split a face into fragments when solids are
      // many, so this is checked where nothing can split it)
      if (faces > 3 && scene.solids.length === 1) faceBad++;
    }
    // lines: visible exactly where the z-buffer shows nothing nearer
    const at = project(camera);
    let ok = 0,
      total = 0;
    for (const l of scene.lines) {
      const visible = drawing.strokes.filter(
        (s) => s.id === l.id && s.kind !== "hidden",
      );
      l.points.slice(1).forEach((b3, i) => {
        const a = at(l.points[i]),
          b = at(b3);
        // seen nearly end-on, near and far parts of one segment share
        // their pixels: the strokes cannot say which part is meant
        if (Math.hypot(b.x - a.x, b.y - a.y) < 24) return;
        for (let k = 1; k < 24; k++) {
          const t = k / 24;
          const p = {
            x: a.x + t * (b.x - a.x),
            y: a.y + t * (b.y - a.y),
            z: a.z + t * (b.z - a.z),
          };
          const xi = Math.floor(p.x),
            yi = Math.floor(p.y);
          if (xi < 1 || yi < 1 || xi >= N - 1 || yi >= N - 1) continue;
          // skip samples next to a depth edge: either answer is fair
          const d = [-1, 0, 1].flatMap((u) =>
            [-1, 0, 1].map((v) => truth.depth[(yi + v) * N + xi + u]),
          );
          const covered = d.map((z) => z > p.z + 0.75);
          if (covered.some((c) => c !== covered[0])) continue;
          total++;
          if (near(p, visible) === !covered[0]) ok++;
        }
      });
    }
    if (total) lineWorst = Math.min(lineWorst, ok / total);
    if (typeof engine.pick === "function") {
      const r = rng(11);
      for (let k = 0; k < 20; k++) {
        const x = Math.floor(r() * N),
          y = Math.floor(r() * N);
        const want = truth.id[y * N + x];
        // only interior pixels: all eight neighbours agree
        if (
          [-1, 0, 1].some((u) =>
            [-1, 0, 1].some(
              (v) => truth.id[(y + v) * N + x + u] !== want,
            ),
          )
        )
          continue;
        const got = engine.pick(drawing, { x: x + 0.5, y: y + 0.5 }) ?? "";
        // a visible line over a face may be picked instead of the face
        if (scene.lines.some((l) => l.id === got)) continue;
        pickAll++;
        if (got !== want) pickBad++;
      }
    }
  }
  times.sort((a, b) => a - b);
  const ms = times[Math.floor(times.length / 2)] ?? 0;
  if (worst < 0.995)
    add(name, "surfaces-disagree", worst < 0.97 ? 3 : 2, (worst * 100).toFixed(2) + " % agree at worst");
  if (lineWorst < 0.97)
    add(name, "lines-disagree", lineWorst < 0.9 ? 3 : 2, (lineWorst * 100).toFixed(1) + " % agree at worst");
  if (faceBad) add(name, "too-many-faces", 2, faceBad + " boxes show more than three faces");
  if (pickAll && pickBad / pickAll > 0.02)
    add(name, "pick-disagrees", 2, `${pickBad} of ${pickAll}`);
  if (name === "big" && ms > 4) add(name, "slow", ms > 12 ? 3 : 2, ms.toFixed(2) + " ms per frame");
  rows.push({
    name,
    solids: scene.solids.length,
    segments: scene.lines.reduce((s, l) => s + l.points.length - 1, 0),
    cameras: cams.length,
    surfaces: Number((worst * 100).toFixed(2)),
    lines: Number((lineWorst * 100).toFixed(1)),
    pick: pickAll ? `${pickAll - pickBad}/${pickAll}` : "-",
    ms: Number(ms.toFixed(2)),
  });
}
console.table(rows);
const count = (sev) => defects.filter((d) => d.sev === sev).length;
for (const d of defects) console.log(`sev${d.sev} ${d.name}: ${d.kind} — ${d.note}`);
console.log(`TOTAL sev3 ${count(3)} sev2 ${count(2)}`);
process.exit(count(3) ? 1 : 0);
