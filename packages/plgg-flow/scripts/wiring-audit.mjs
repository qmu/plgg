// Wiring audit — the acceptance tool for plgg-flow/wiring (see WIRING.md).
// Routes 17 realistic diagrams in both styles, detects defects
// automatically, and writes a contact sheet. Build first, then:
//   node packages/plgg-flow/scripts/wiring-audit.mjs [name]
// Sheet: packages/plgg-flow-example/dist/<name>.html
// Defect list: $AUDIT_DIR/<name>.json (default: the OS temp dir)
import { wireGraph } from "../dist/wiring.es.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const sheetDir = fileURLToPath(new URL("../../plgg-flow-example/dist/", import.meta.url));
const out = process.argv[2] ?? "wiring-audit";
// Sizes are explicit so the audit never depends on label-fitted widths.
const n = (id, x, y, extra = {}) => ({ id, label: id, width: 104, height: 36, position: { x, y, z: 0 }, ...extra });
const e = (source, target, extra = {}) => ({ source, target, ...extra });
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const S = {};
// ---- realistic scenarios -------------------------------------------------
S.microservices = (() => {
  const nodes = [n("Web", -520, -120), n("Mobile", -520, 40), n("Gateway", -300, -40), n("Auth", -60, -220), n("Users", -60, -110), n("Orders", -60, 0), n("Catalog", -60, 110), n("Search", -60, 220),
    n("Queue", 200, -60), n("Payments", 200, 60), n("Mailer", 430, -140), n("Ledger", 430, 0), n("Cache", 200, 220), n("DB", 430, 160), n("Audit", 640, 0)];
  const edges = [["Web", "Gateway"], ["Mobile", "Gateway"], ["Gateway", "Auth"], ["Gateway", "Users"], ["Gateway", "Orders"], ["Gateway", "Catalog"], ["Gateway", "Search"], ["Orders", "Queue"], ["Orders", "Payments"], ["Queue", "Mailer"], ["Queue", "Ledger"], ["Payments", "Ledger"],
    ["Catalog", "Cache"], ["Search", "Cache"], ["Cache", "DB"], ["Users", "DB"], ["Orders", "DB"], ["Ledger", "Audit"], ["Mailer", "Audit"], ["Auth", "Users"], ["Payments", "Orders"], ["Audit", "Gateway"], ["DB", "Catalog"]].map(([a, b]) => e(a, b));
  return { nodes, edges };
})();
S.stateMachine = (() => {
  const nodes = [n("Idle", -360, 0), n("Loading", -120, -120), n("Ready", 120, 0), n("Editing", 120, 160), n("Saving", 360, 80), n("Error", -120, 160), n("Closed", 580, -80)];
  const edges = [["Idle", "Loading"], ["Loading", "Ready"], ["Loading", "Error"], ["Error", "Idle"], ["Ready", "Editing"], ["Editing", "Ready"], ["Editing", "Saving"], ["Saving", "Ready"], ["Saving", "Error"], ["Ready", "Closed"], ["Error", "Loading"], ["Ready", "Idle"], ["Editing", "Editing"], ["Closed", "Idle"]].map(([a, b]) => e(a, b));
  return { nodes, edges };
})();
S.orgTreeVertical = (() => {
  const nodes = [n("CEO", 0, -220)], edges = [];
  ["A", "B", "C"].forEach((d, i) => { nodes.push(n(d, (i - 1) * 380, -80)); edges.push(e("CEO", d)); [0, 1, 2].forEach((k) => { const id = d + k; nodes.push(n(id, (i - 1) * 380 + (k - 1) * 120, 60)); edges.push(e(d, id)); [0, 1].forEach((m) => { const lid = id + "." + m; nodes.push(n(lid, (i - 1) * 380 + (k - 1) * 120 + (m - 0.5) * 0, 180 + m * 70, { width: 90 })); edges.push(e(id, lid)); }); }); });
  return { nodes, edges };
})();
S.pipelineSkips = (() => {
  const ids = ["Src", "Parse", "Lint", "Type", "Opt", "Emit", "Pack", "Ship"]; const nodes = ids.map((id, i) => n(id, -560 + i * 160, 0));
  const edges = [...ids.slice(1).map((id, i) => e(ids[i], id)), e("Src", "Type"), e("Parse", "Emit"), e("Src", "Ship"), e("Lint", "Pack"), e("Ship", "Src"), e("Emit", "Parse"), e("Type", "Ship")];
  return { nodes, edges };
})();
S.hub = (() => {
  const nodes = [n("Hub", 0, 0, { height: 60 })], edges = [];
  for (let i = 0; i < 12; i++) { const id = "in" + i; nodes.push(n(id, -420 + (i % 2) * 150, -275 + i * 50)); edges.push(e(id, "Hub")); }
  for (let i = 0; i < 8; i++) { const id = "out" + i; nodes.push(n(id, 330 + (i % 2) * 140, -210 + i * 60)); edges.push(e("Hub", id)); }
  return { nodes, edges };
})();
S.radial = (() => {
  const nodes = [n("Core", 0, 0)], edges = [];
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, id = "r" + i; nodes.push(n(id, Math.cos(a) * 330, Math.sin(a) * 220)); edges.push(i % 2 ? e("Core", id) : e(id, "Core")); }
  for (let i = 0; i < 10; i += 3) edges.push(e("r" + i, "r" + ((i + 4) % 10)));
  return { nodes, edges };
})();
S.clusters = (() => {
  const nodes = [], edges = [];
  [["a", -380, -60], ["b", 300, 40]].forEach(([p, cx, cy]) => { for (let i = 0; i < 6; i++) nodes.push(n(p + i, cx + (i % 2) * 180, cy + Math.floor(i / 2) * 110 - 110)); for (let i = 0; i < 5; i++) edges.push(e(p + i, p + (i + 1))); edges.push(e(p + 0, p + 3), e(p + 1, p + 4), e(p + 5, p + 0)); });
  edges.push(e("a1", "b0"), e("a3", "b2"), e("a5", "b4"), e("b1", "a4"), e("a1", "b4"), e("b5", "a0"));
  return { nodes, edges };
})();
S.varied = (() => {
  const nodes = [n("A very long service name", -380, -140, { width: 220 }), n("x", -380, 40, { width: 48 }), n("Tall", -60, -40, { height: 140 }), n("Wide banner node", 60, 190, { width: 260 }), n("B", 300, -160), n("C", 300, 0), n("D", 330, 120, { width: 60, height: 60 })];
  const edges = [["A very long service name", "Tall"], ["x", "Tall"], ["Tall", "B"], ["Tall", "C"], ["Tall", "D"], ["x", "Wide banner node"], ["Wide banner node", "D"], ["A very long service name", "B"], ["x", "C"], ["D", "x"], ["B", "A very long service name"]].map(([a, b]) => e(a, b));
  return { nodes, edges };
})();
S.rowSkips = { nodes: ["A", "B", "C", "D", "E"].map((id, i) => n(id, -360 + i * 180, 0)), edges: [e("A", "C"), e("A", "D"), e("A", "E"), e("B", "D"), e("B", "E"), e("C", "E"), e("A", "B"), e("D", "E"), e("E", "A"), e("D", "B")] };
S.columnSkips = { nodes: ["A", "B", "C", "D", "E"].map((id, i) => n(id, 0, -240 + i * 120)), edges: [e("A", "C"), e("A", "D"), e("A", "E"), e("B", "D"), e("B", "E"), e("C", "E"), e("A", "B"), e("E", "A"), e("D", "B")] };
S.diamonds = (() => { const nodes = [n("S", -400, 0), n("a", -200, -120), n("b", -200, 0), n("c", -200, 120), n("M", 0, 0), n("d", 200, -120), n("f", 200, 120), n("T", 400, 0)]; return { nodes, edges: [["S", "a"], ["S", "b"], ["S", "c"], ["a", "M"], ["b", "M"], ["c", "M"], ["M", "d"], ["M", "f"], ["d", "T"], ["f", "T"], ["a", "d"], ["c", "f"], ["S", "T"], ["a", "f"], ["c", "d"]].map(([a, b]) => e(a, b)) }; })();
S.tight = { nodes: [n("A", -120, -30), n("B", 0, 30), n("C", 120, -30), n("D", 0, -70), n("E", 10, 110), n("F", -130, 90)], edges: [e("A", "B"), e("B", "C"), e("A", "C"), e("D", "B"), e("F", "C"), e("E", "A"), e("A", "D"), e("C", "E")] };
// neighbours closer than two stems: the stem and fan must shrink with the gap
S.closePairs = { nodes: [n("A", -300, 0), n("B", -170, 0), n("C", -40, 4), n("D", -60, 110), n("E", 96, 40), n("F", 96, 150), n("G", 226, 40), n("H", -170, 62)],
  edges: [e("A", "B"), e("B", "C"), e("D", "E"), e("C", "E"), e("E", "G"), e("D", "F"), e("F", "G"), e("A", "C"), e("B", "H"), e("H", "D"), e("A", "H")] };
S.overlapping = { nodes: [n("A", 0, 0), n("B", 40, 20), n("C", 300, 0), n("D", -260, 10)], edges: [e("A", "B"), e("A", "C"), e("B", "C"), e("D", "A"), e("D", "B"), e("C", "D")] };
S.selfAndMulti = { nodes: [n("A", -200, 0), n("B", 200, 0), n("C", 0, 160)], edges: [e("A", "A"), e("A", "B"), e("A", "B", { id: "2" }), e("A", "B", { id: "3" }), e("B", "A"), e("B", "A", { id: "5" }), e("C", "C"), e("A", "C"), e("C", "B"), e("B", "C")] };
S.grid5x4 = (() => { const r = rng(7), nodes = []; for (let c = 0; c < 5; c++) for (let w = 0; w < 4; w++) nodes.push(n("g" + c + w, -480 + c * 240, -210 + w * 140)); const edges = []; const seen = new Set(); while (edges.length < 26) { const a = nodes[Math.floor(r() * 20)].id, b = nodes[Math.floor(r() * 20)].id; if (a === b || seen.has(a + b)) continue; seen.add(a + b); edges.push(e(a, b)); } return { nodes, edges }; })();
S.scatter = (() => { const r = rng(42), nodes = []; while (nodes.length < 16) { const x = Math.round((r() - 0.5) * 1000), y = Math.round((r() - 0.5) * 520); if (nodes.every((m) => Math.abs(m.position.x - x) > 130 || Math.abs(m.position.y - y) > 60)) nodes.push(n("s" + nodes.length, x, y)); } const edges = []; const seen = new Set(); while (edges.length < 22) { const a = "s" + Math.floor(r() * 16), b = "s" + Math.floor(r() * 16); if (a === b || seen.has(a + b)) continue; seen.add(a + b); edges.push(e(a, b)); } return { nodes, edges }; })();
S.layered = (() => { const r = rng(3), nodes = [], edges = []; const L = [3, 5, 6, 4, 2]; L.forEach((k, li) => { for (let i = 0; i < k; i++) nodes.push(n("L" + li + "_" + i, -480 + li * 240, (i - (k - 1) / 2) * 90)); }); for (let li = 0; li < 4; li++) for (let i = 0; i < L[li]; i++) { const t1 = Math.floor(r() * L[li + 1]), t2 = Math.floor(r() * L[li + 1]); edges.push(e("L" + li + "_" + i, "L" + (li + 1) + "_" + t1)); if (t2 !== t1) edges.push(e("L" + li + "_" + i, "L" + (li + 1) + "_" + t2)); } edges.push(e("L0_0", "L3_2"), e("L1_4", "L4_0"), e("L4_1", "L0_2")); return { nodes, edges }; })();
// a big sheet: 40 cards in five columns, 60 wires — the size where a quadratic step shows
S.big40x60 = { nodes: Array.from({ length: 40 }, (_, i) => n("c" + i, -520 + Math.floor(i / 8) * 260, -385 + (i % 8) * 110)), edges: Array.from({ length: 60 }, (_, i) => e("c" + (i % 32), "c" + ((i % 32) + 8 + (i >= 32 && i % 8 < 7 ? 1 : 0)))) };
// ---- geometry ------------------------------------------------------------
const box = (m) => ({ l: m.position.x - (m.width ?? 104) / 2, r: m.position.x + (m.width ?? 104) / 2, t: m.position.y - (m.height ?? 36) / 2, b: m.position.y + (m.height ?? 36) / 2 });
const dBox = (p, q) => Math.hypot(Math.max(q.l - p.x, 0, p.x - q.r), Math.max(q.t - p.y, 0, p.y - q.b));
const inside = (p, q, m = 0.5) => p.x > q.l + m && p.x < q.r - m && p.y > q.t + m && p.y < q.b - m;
const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
const segX = (a, b, c, d) => o(c, d, a) * o(c, d, b) < 0 && o(a, b, c) * o(a, b, d) < 0;
const len = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i].x, p.y - pts[i].y), 0);
const dSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
const dPoly = (p, pts) => { let m = 1e9; for (let i = 1; i < pts.length; i++) m = Math.min(m, dSeg(p, pts[i - 1], pts[i])); return m; };
const resample = (pts, step = 6) => { const out = [pts[0]]; let acc = 0; for (let i = 1; i < pts.length; i++) { let a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y); while (acc + l >= step) { const t = (step - acc) / l; a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; out.push(a); l = Math.hypot(b.x - a.x, b.y - a.y); acc = 0; } acc += l; } out.push(pts[pts.length - 1]); return out; };
const audit = (g, wires, style) => {
  const D = []; const add = (sev, kind, w, note) => D.push({ sev, kind, wire: w ? w.edge.source + "→" + w.edge.target : "", note });
  const by = new Map(g.nodes.map((m) => [m.id, m]));
  if (wires.length !== g.edges.length) add(3, "missing", null, `${wires.length}/${g.edges.length} wires`);
  const R = wires.map((w) => resample(w.points.map((p) => ({ x: p.x, y: p.y }))));
  const stemFree = (p, w) => Math.hypot(p.x - w.source.x, p.y - w.source.y) > 22 && Math.hypot(p.x - w.target.x, p.y - w.target.y) > 22;
  let crossings = 0;
  wires.forEach((w, i) => {
    const pts = w.points, r = R[i]; if (pts.length < 2) return add(3, "empty", w, "");
    if (pts.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return add(3, "NaN", w, "");
    let gap = 0; for (let k = 1; k < pts.length; k++) gap = Math.max(gap, Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
    const s = by.get(w.edge.source), t = by.get(w.edge.target), sb = box(s), tb = box(t);
    if (dBox(pts[0], sb) > 1.5 || inside(pts[0], sb, 2)) add(3, "start-off-node", w, dBox(pts[0], sb).toFixed(1));
    if (dBox(pts[pts.length - 1], tb) > 1.5 || inside(pts[pts.length - 1], tb, 2)) add(3, "end-off-node", w, dBox(pts[pts.length - 1], tb).toFixed(1));
    // one socket per side: both ends sit on a side's centre, and the
    // wire leaves a side that does not face away from its target
    for (const [q, m, end, other, nm] of [[sb, s, pts[0], t, "start"], [tb, t, pts[pts.length - 1], s, "end"]]) {
      const cx = (q.l + q.r) / 2, cy = (q.t + q.b) / 2;
      const onV = Math.abs(end.x - q.l) < 1.5 || Math.abs(end.x - q.r) < 1.5, onH = Math.abs(end.y - q.t) < 1.5 || Math.abs(end.y - q.b) < 1.5;
      const centred = (onV && Math.abs(end.y - cy) < 1.5) || (onH && Math.abs(end.x - cx) < 1.5);
      if (!centred) add(2, "socket-off-centre-" + nm, w, "");
      if (s.id !== t.id) { const nx = end.x - cx, ny = end.y - cy, tx = other.position.x - cx, ty = other.position.y - cy; const cos = (nx * tx + ny * ty) / ((Math.hypot(nx, ny) || 1) * (Math.hypot(tx, ty) || 1)); if (cos < -0.3) add(2, "side-faces-away-" + nm, w, cos.toFixed(2)); }
    }
    // foreign nodes
    let minC = 1e9, hit = false;
    for (const m of g.nodes) { if (m.id === s.id || m.id === t.id || m.group) continue; const q = box(m); for (const p of r) { if (inside(p, q)) hit = true; minC = Math.min(minC, dBox(p, q)); } }
    if (hit) add(3, "through-node", w, ""); else if (minC < 6) add(2, "grazes-node", w, minC.toFixed(1));
    // own nodes: passes through / hugs own box away from its socket
    for (const [m, q, end] of [[s, sb, w.source], [t, tb, w.target]]) { if (s.id === t.id) break; let thru = false, hug = 1e9; for (const p of r) { if (Math.hypot(p.x - end.x, p.y - end.y) < 20) continue; if (inside(p, q)) thru = true; hug = Math.min(hug, dBox(p, q)); } if (thru) add(3, "through-own-node", w, m.id); else if (hug < 5) add(2, "hugs-own-node", w, m.id + " " + hug.toFixed(1)); }
    // direction at ends: perpendicular to a side?
    const dir = (a, b) => ({ x: b.x - a.x, y: b.y - a.y }); const d0 = dir(r[0], r[1] ?? r[0]), d1 = dir(r[r.length - 2] ?? r[0], r[r.length - 1]);
    for (const [d, nm] of [[d0, "start"], [d1, "end"]]) { const m = Math.hypot(d.x, d.y) || 1, ax = Math.max(Math.abs(d.x), Math.abs(d.y)) / m; if (ax < 0.94) add(1, "oblique-" + nm, w, ax.toFixed(2)); }
    // enters target from inside direction? arrow must point INTO the box
    { const tip = r[r.length - 1], prev = r[r.length - 2] ?? tip; const c = t.position; const into = (c.x - tip.x) * (tip.x - prev.x) + (c.y - tip.y) * (tip.y - prev.y); if (into < 0) add(3, "arrow-points-away", w, ""); }
    // kinks (curve) / self-crossing / length
    let kink = 0; for (let k = 2; k < r.length; k++) { const a = dir(r[k - 2], r[k - 1]), b = dir(r[k - 1], r[k]); const ang = Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)); kink = Math.max(kink, ang); }
    if (style === "curve" && kink > 0.75) add(2, "kink", w, (kink * 57.3).toFixed(0) + "°");
    if (style === "step") { let diag = 0; for (let k = 1; k < pts.length; k++) { const dx = Math.abs(pts[k].x - pts[k - 1].x), dy = Math.abs(pts[k].y - pts[k - 1].y), l = Math.hypot(dx, dy); if (l > 7 && Math.min(dx, dy) / l > 0.12) diag += l; } let run = 0, worstRun = 0; for (let k = 1; k < r.length; k++) { const dx = Math.abs(r[k].x - r[k - 1].x), dy = Math.abs(r[k].y - r[k - 1].y), l = Math.hypot(dx, dy) || 1; if (Math.min(dx, dy) / l > 0.2) { run += l; worstRun = Math.max(worstRun, run); } else run = 0; } if (diag > 0 || worstRun > 34) add(3, "diagonal-in-step", w, Math.max(diag, worstRun).toFixed(0) + "u"); }
    if (style === "curve" && w.edge.route !== "straight") { let run = 0, flat = 0, total = 0; for (let k = 2; k < r.length; k++) { const a = dir(r[k - 2], r[k - 1]), b = dir(r[k - 1], r[k]); const ang = Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)); total += ang; if (ang < 0.004) { run += 6; } else { if (run > 90) flat += run; run = 0; } } if (run > 90) flat += run; const L0 = len(r); const sd = (q, p) => Math.abs(p.x - q.l) < 1.5 ? "L" : Math.abs(p.x - q.r) < 1.5 ? "R" : Math.abs(p.y - q.t) < 1.5 ? "T" : "B"; const arch = sd(sb, pts[0]) === sd(tb, pts[pts.length - 1]);
      if (!arch && total > 0.5 && flat / L0 > 0.45) add(2, "stiff-curve", w, Math.round((flat / L0) * 100) + "% dead straight"); }
    // a wire between two level, facing sockets with a free corridor is a straight line
    if (s.id !== t.id && w.edge.route !== "step" || style === "step") { const A = pts[0], B = pts[pts.length - 1]; const level = Math.abs(A.y - B.y) < 1.5 || Math.abs(A.x - B.x) < 1.5; if (level && s.id !== t.id) { const free = !g.nodes.some((m) => { if (m.id === s.id || m.id === t.id) return false; const q = box(m); return !(q.r < Math.min(A.x, B.x) || q.l > Math.max(A.x, B.x) || q.b < Math.min(A.y, B.y) - 6 || q.t > Math.max(A.y, B.y) + 6); }); const facing = Math.abs(A.y - B.y) < 1.5 ? (Math.abs(A.x - sb.r) < 1.5 && Math.abs(B.x - tb.l) < 1.5) || (Math.abs(A.x - sb.l) < 1.5 && Math.abs(B.x - tb.r) < 1.5) : (Math.abs(A.y - sb.b) < 1.5 && Math.abs(B.y - tb.t) < 1.5) || (Math.abs(A.y - sb.t) < 1.5 && Math.abs(B.y - tb.b) < 1.5); if (free && facing) { let dev = 0; for (const p of r) dev = Math.max(dev, dSeg(p, A, B)); const only = wires.filter((v) => v.edge.source === w.edge.source && v.edge.target === w.edge.target).length === 1; if (dev > 1.5 && only) add(2, "wobble-on-straight", w, dev.toFixed(1)); } } }
    // excursion: how far the wire strays outside the box spanned by its two nodes
    if (s.id !== t.id) { const U = { l: Math.min(sb.l, tb.l), r: Math.max(sb.r, tb.r), t: Math.min(sb.t, tb.t), b: Math.max(sb.b, tb.b) }; let ex = 0; for (const p of r) ex = Math.max(ex, dBox(p, U)); const fat = Math.min(U.r - U.l, U.b - U.t) > 150; if (ex > (fat ? 30 : 90)) add(2, "excursion", w, ex.toFixed(0) + "u outside its own span"); else if (ex > 60) add(1, "excursion", w, ex.toFixed(0)); }
    if (s.id !== t.id) { const A = pts[0], B = pts[pts.length - 1]; const d0 = Math.hypot(B.x - A.x, B.y - A.y); let far = 0; for (const p of r) far = Math.max(far, Math.hypot(B.x - p.x, B.y - p.y) - d0); let blockedLine = g.nodes.some((m) => { if (m.id === s.id || m.id === t.id) return false; const q = box(m); for (let u = 0; u <= 1; u += 0.02) { const p = { x: A.x + (B.x - A.x) * u, y: A.y + (B.y - A.y) * u }; if (p.x > q.l - 10 && p.x < q.r + 10 && p.y > q.t - 10 && p.y < q.b + 10) return true; } return false; }); if (far > 30 && !blockedLine) add(2, "moves-away-first", w, far.toFixed(0) + "u farther than its start"); }
    if (s.id !== t.id) { const A = pts[0], B = pts[pts.length - 1], d = Math.hypot(B.x - A.x, B.y - A.y); if (d < 60) { let tt = 0; for (let k = 2; k < r.length; k++) { const a = dir(r[k - 2], r[k - 1]), b = dir(r[k - 1], r[k]); tt += Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)); } const need = 2 * Math.abs(Math.atan2(Math.min(Math.abs(B.y - A.y), Math.abs(B.x - A.x)), Math.max(Math.abs(B.y - A.y), Math.abs(B.x - A.x)))) + 0.6; if (tt > need + 0.8 || len(pts) > d * 1.6 + 8) add(2, "squashed-short-wire", w, `turn ${tt.toFixed(1)} len ${len(pts).toFixed(0)}/${d.toFixed(0)}`); } }
    let self = 0; for (let a = 1; a < r.length; a++) for (let b = a + 3; b < r.length; b++) if (segX(r[a - 1], r[a], r[b - 1], r[b])) self++;
    if (self) add(3, "self-crossing", w, String(self));
    const L = len(pts), sc = s.position, tc = t.position, direct = Math.hypot(w.target.x - w.source.x, w.target.y - w.source.y), man = Math.abs(w.target.x - w.source.x) + Math.abs(w.target.y - w.source.y);
    if (s.id !== t.id) { const base = style === "step" ? man : direct; const ratio = L / Math.max(base, 40); if (ratio > 1.8) add(2, "long-detour", w, ratio.toFixed(2) + "×"); else if (ratio > 1.4) add(1, "detour", w, ratio.toFixed(2) + "×"); }
    // wiggle: total turning
    let turn = 0; for (let k = 2; k < r.length; k++) { const a = dir(r[k - 2], r[k - 1]), b = dir(r[k - 1], r[k]); turn += Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y)); }
    if (turn > Math.PI * 2.2) add(2, "wiggly", w, (turn / Math.PI).toFixed(1) + "π");
    if (gap > 40) add(3, "broken", w, gap.toFixed(0));
    wires.slice(i + 1).forEach((v, jj) => {
      const j = i + 1 + jj, q = R[j]; let c = 0;
      const shared = [w.source, w.target].filter((p) => [v.source, v.target].some((u) => Math.hypot(p.x - u.x, p.y - u.y) < 2));
      for (let a = 1; a < r.length; a++) for (let b = 1; b < q.length; b++) if (segX(r[a - 1], r[a], q[b - 1], q[b]) && !shared.some((p) => Math.hypot(r[a].x - p.x, r[a].y - p.y) < 30)) c++;
      const shareEnd = w.edge.source === v.edge.source || w.edge.target === v.edge.target || w.edge.source === v.edge.target || w.edge.target === v.edge.source;
      if (c > 1) add(2, "double-cross", w, "×" + c + " with " + v.edge.source + "→" + v.edge.target);
      if (c && (w.edge.source === v.edge.source || w.edge.target === v.edge.target)) add(2, "siblings-cross", w, "with " + v.edge.source + "→" + v.edge.target);
      crossings += c;
      // overlap / too close running alongside (outside stems)
      let on = 0, close = 0; for (let a = 1; a < r.length; a++) { const p = r[a]; if (!stemFree(p, w) || !stemFree(p, v)) continue; const d = dPoly(p, q); if (d < 2.5) on += 6; else if (d < 6) close += 6; }
      if (on > 18) add(3, "overlap", w, on + "u on " + v.edge.source + "→" + v.edge.target); else if (close > 120 && c === 0) add(2, "runs-too-close", w, close + "u within 6 of " + v.edge.source + "→" + v.edge.target); else if (close > 60 && c === 0) add(1, "crowded", w, close + "u near " + v.edge.source + "→" + v.edge.target);
    });
  });
  // awkward side: a lone wire on a side that faces its far end much worse than another side would
  { const sideOf = (m, p) => { const q = box(m); return Math.abs(p.x - q.l) < 1.5 ? "L" : Math.abs(p.x - q.r) < 1.5 ? "R" : Math.abs(p.y - q.t) < 1.5 ? "T" : "B"; }; const N = { L: [-1, 0], R: [1, 0], T: [0, -1], B: [0, 1] };
    const count = new Map(); const ends = [];
    wires.forEach((w) => { if (w.edge.source === w.edge.target) return; for (const [m, p, o, d] of [[by.get(w.edge.source), w.source, by.get(w.edge.target), "out"], [by.get(w.edge.target), w.target, by.get(w.edge.source), "in"]]) { const sd = sideOf(m, p), k = m.id + d + sd; count.set(k, (count.get(k) ?? 0) + 1); ends.push([w, m, o, sd, k, d]); } });
    for (const [w, m, o, sd, k, d] of ends) { const dx = o.position.x - m.position.x, dy = o.position.y - m.position.y, l = Math.hypot(dx, dy) || 1; const cos = (x) => (N[x][0] * dx + N[x][1] * dy) / l; const best = Math.max(cos("L"), cos("R"), cos("T"), cos("B")); const blocked = g.nodes.some((x) => { if (x.id === m.id || x.id === o.id) return false; const q = box(x), I = { l: q.l - 10, r: q.r + 10, t: q.t - 10, b: q.b + 10 }; for (let u = 0; u <= 1; u += 0.02) { const p = { x: m.position.x + dx * u, y: m.position.y + dy * u }; if (p.x > I.l && p.x < I.r && p.y > I.t && p.y < I.b) return true; } return false; });
      if (!blocked && best - cos(sd) > 0.35 && count.get(k) < 2) add(2, "awkward-side", w, `${m.id} ${d} on ${sd}`); } }
  // siblings should agree: a node's outgoing (or incoming) wires whose far ends all lie toward one side use that side
  { const sideOf = (m, p) => { const q = box(m); return Math.abs(p.x - q.l) < 1.5 ? "L" : Math.abs(p.x - q.r) < 1.5 ? "R" : Math.abs(p.y - q.t) < 1.5 ? "T" : "B"; }; const N = { L: [-1, 0], R: [1, 0], T: [0, -1], B: [0, 1] };
    const groups = new Map();
    wires.forEach((w) => { if (w.edge.source === w.edge.target) return; for (const [m, p, o, d] of [[by.get(w.edge.source), w.source, by.get(w.edge.target), "out"], [by.get(w.edge.target), w.target, by.get(w.edge.source), "in"]]) { const k = m.id + ":" + d; if (!groups.has(k)) groups.set(k, []); groups.get(k).push({ w, m, o, sd: sideOf(m, p) }); } });
    for (const [k, list] of groups) { if (list.length < 2) continue; let mx = 0, my = 0; for (const it of list) { const dx = it.o.position.x - it.m.position.x, dy = it.o.position.y - it.m.position.y, l = Math.hypot(dx, dy) || 1; mx += dx / l; my += dy / l; } const ml = Math.hypot(mx, my); if (ml / list.length < 0.5) continue; const main = ["L", "R", "T", "B"].reduce((a, b) => (N[a][0] * mx + N[a][1] * my >= N[b][0] * mx + N[b][1] * my ? a : b));
      for (const it of list) { if (it.sd === main) continue; const dx = it.o.position.x - it.m.position.x, dy = it.o.position.y - it.m.position.y, l = Math.hypot(dx, dy) || 1; const cos = (N[main][0] * dx + N[main][1] * dy) / l; const blocked = g.nodes.some((x) => { if (x.id === it.m.id || x.id === it.o.id) return false; const q = box(x); for (let u = 0; u <= 1; u += 0.02) { const p = { x: it.m.position.x + dx * u, y: it.m.position.y + dy * u }; if (p.x > q.l - 10 && p.x < q.r + 10 && p.y > q.t - 10 && p.y < q.b + 10) return true; } return false; }); if (!blocked && cos > 0.26) add(2, "siblings-disagree-on-side", it.w, `${k} mostly ${main}, this one ${it.sd}`); } } }
  // a socket that both receives and sends makes direction unreadable
  { const use = new Map(); const key = (m, p) => { const q = box(m); return m.id + ":" + (Math.abs(p.x - q.l) < 1.5 ? "L" : Math.abs(p.x - q.r) < 1.5 ? "R" : Math.abs(p.y - q.t) < 1.5 ? "T" : "B"); };
    wires.forEach((w) => { if (w.edge.source === w.edge.target) return; const a = key(by.get(w.edge.source), w.source), b = key(by.get(w.edge.target), w.target); use.set(a, (use.get(a) ?? 0) | 1); use.set(b, (use.get(b) ?? 0) | 2); });
    for (const [k, v] of use) if (v === 3) add(1, "mixed-socket", null, k); }
  // baseline crossings: straight centre-to-centre lines
  let base = 0; const C = g.edges.map((x) => [by.get(x.source).position, by.get(x.target).position]);
  for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) if (g.edges[i].source !== g.edges[j].source && g.edges[i].target !== g.edges[j].target && g.edges[i].source !== g.edges[j].target && g.edges[i].target !== g.edges[j].source && segX(C[i][0], C[i][1], C[j][0], C[j][1])) base++;
  if (crossings > base * 1.3 + 2) add(2, "more-crossings-than-straight", null, `${crossings} vs straight ${base}`);
  return { D, crossings, base };
};
// drag continuity: move one node along a line, flag wires that jump
const drag = (g, id, dx, dy, steps = 40) => {
  let prev = null, worst = 0, where = "", history = null, worstRank = -1; const frames = []; const m0 = g.nodes.find((m) => m.id === id);
  for (let k = 0; k <= steps; k++) { const nodes = g.nodes.map((m) => m.id === id ? { ...m, position: { ...m.position, x: m0.position.x + dx * k / steps, y: m0.position.y + dy * k / steps } } : m); const tf = performance.now(); const ws = wireGraph({ nodes, edges: g.edges }); if (k > 0) frames.push(performance.now() - tf);
    const cur = ws.map((w) => resample(w.points, 12)); if (prev) cur.forEach((r, i) => { if (!prev[i]) return; let d = 0; for (const p of r) d = Math.max(d, dPoly(p, prev[i])); const own = g.edges[i].source === id || g.edges[i].target === id; const lim = own ? 60 : 14; if (d <= lim) return;
      // a flip is legitimate when the moved node is in the wire's way before or after it, or when the wire shares a socket with one of the moved node's own wires (their fan reorders)
      const mv = nodes.find((m) => m.id === id), q = box(mv), I = { l: q.l - 34, r: q.r + 34, t: q.t - 34, b: q.b + 34 }; const near = (poly) => poly.some((p) => p.x > I.l && p.x < I.r && p.y > I.t && p.y < I.b);
      const neighbour = g.edges.some((x) => (x.source === id || x.target === id) && [x.source, x.target].some((u) => u !== id && (u === g.edges[i].source || u === g.edges[i].target)));
      const cause = own ? "own" : near(r) || near(prev[i]) ? "in-the-way" : neighbour ? "shares-a-node" : "unrelated";
      const rank = { unrelated: 3, "shares-a-node": 2, own: 1, "in-the-way": 0 }[cause]; if (rank > worstRank || (rank === worstRank && d > worst)) { worstRank = rank; worst = d; where = g.edges[i].source + "→" + g.edges[i].target + " (" + cause + ") at step " + k; } }); prev = cur;
    // the picture must be a function of where things ARE, not of how they got there
    if (k === steps) { const fresh = wireGraph({ nodes: nodes.map((m) => ({ ...m, position: { ...m.position } })), edges: g.edges.map((x) => ({ ...x })) }).map((w) => resample(w.points, 12)); let h = 0, hw = ""; cur.forEach((r, i) => { if (!fresh[i]) return; let d = 0; for (const p of r) d = Math.max(d, dPoly(p, fresh[i])); if (d > h) { h = d; hw = g.edges[i].source + "→" + g.edges[i].target; } }); if (h > 3) history = { h: +h.toFixed(0), hw }; } }
  frames.sort((a, b) => a - b); const frame = frames[Math.floor(frames.length * 0.5)] ?? 0, frame90 = frames[Math.floor(frames.length * 0.9)] ?? 0;
  return { worst: +worst.toFixed(0), where, history, frame, frame90 };
};
// ---- run -----------------------------------------------------------------
const W = 1240, H = 640; let cells = "", row = 0; const summary = [], all = [];
for (const [name, g0] of Object.entries(S)) for (const style of ["curve", "step"]) {
  const g = { nodes: g0.nodes, edges: g0.edges.map((x) => style === "step" ? { ...x, route: "step" } : x) };
  let wires = [], err = "", ms = 0;
  try { const ts = []; // every run is shifted a little so a value-keyed cache cannot answer: this measures routing, not remembering
    for (let k = 0; k < 5; k++) { const gg = { nodes: g.nodes.map((m) => ({ ...m, position: { ...m.position, x: m.position.x + 0.37 * (k + 1), y: m.position.y + 0.21 * (k + 1) } })), edges: g.edges.map((x) => ({ ...x })) }; const t0 = performance.now(); wires = wireGraph(gg); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); ms = ts[2]; wires = wireGraph(g); } catch (x) { err = String(x).slice(0, 120); }
  const { D, crossings, base } = err ? { D: [{ sev: 3, kind: "THROWS", wire: "", note: err }], crossings: 0, base: 0 } : audit(g, wires, style);
  // first paint of a diagram: generous, but a quadratic step must not hide in it
  const budget = Math.max(30, g.edges.length * 1.0); if (ms > budget) D.push({ sev: ms > budget * 4 ? 3 : 2, kind: "slow-cold", wire: "", note: ms.toFixed(1) + "ms cold (budget " + budget.toFixed(0) + ")" });
  if (!err) { const r = rng(name.length); for (let k = 0; k < 3; k++) { const m = g.nodes[Math.floor(r() * g.nodes.length)]; try { if (style === "step" && k > 0) continue; const j = drag(g, m.id, 160 * (k % 2 ? 1 : -1), 120 * (k < 2 ? 1 : -1), style === "step" ? 16 : 40); if (j && j.frame90 > 8) D.push({ sev: j.frame90 > 32 ? 3 : 2, kind: "slow-drag", wire: "", note: `move ${m.id}: ${j.frame.toFixed(1)}ms median, ${j.frame90.toFixed(1)}ms p90 per frame (budget 8)` });
      if (j && j.worst) { const c = /\((.*?)\)/.exec(j.where)?.[1]; D.push({ sev: c === "unrelated" ? 2 : c === "shares-a-node" ? 2 : 1, kind: c === "unrelated" ? "drag-jump" : c === "shares-a-node" ? "drag-jump-neighbour" : c === "own" ? "own-flip" : "flip-around-moved-node", wire: "", note: `move ${m.id}: ${j.where} jumps ${j.worst}` }); } if (j && j.history) D.push({ sev: 3, kind: "history-dependent", wire: "", note: `after dragging ${m.id}, ${j.history.hw} differs from a fresh routing of the same graph by ${j.history.h}` }); } catch (x) { D.push({ sev: 3, kind: "drag-THROWS", wire: "", note: String(x).slice(0, 80) }); } } }
  const s3 = D.filter((d) => d.sev === 3).length, s2 = D.filter((d) => d.sev === 2).length, s1 = D.filter((d) => d.sev === 1).length;
  summary.push({ name, style, wires: g.edges.length, cross: crossings, straight: base, sev3: s3, sev2: s2, sev1: s1, ms: +ms.toFixed(2) });
  D.forEach((d) => all.push({ name, style, ...d }));
  const bad = new Set(D.filter((d) => d.sev >= 2).map((d) => d.wire));
  cells += `<g transform="translate(${(style === "step" ? W : 0) + W / 2},${row * H + H / 2})"><rect x="${-W / 2 + 4}" y="${-H / 2 + 4}" width="${W - 8}" height="${H - 8}" fill="#fff" stroke="${s3 ? "#d00" : s2 ? "#e90" : "#bbb"}" stroke-width="${s3 || s2 ? 3 : 1}"/><text x="${-W / 2 + 14}" y="${-H / 2 + 26}" font-size="16" font-weight="600">${name} · ${style}</text><text x="${-W / 2 + 14}" y="${-H / 2 + 44}" font-size="12" fill="#555">cross ${crossings} (straight ${base}) · sev3 ${s3} · sev2 ${s2} · sev1 ${s1} · ${ms.toFixed(1)}ms</text>` +
    g.nodes.map((q) => { const b = box(q); return `<rect x="${b.l}" y="${b.t}" width="${b.r - b.l}" height="${b.b - b.t}" fill="#fff" stroke="#000"/><text x="${q.position.x}" y="${q.position.y + 4}" text-anchor="middle" font-size="11">${q.id}</text>`; }).join("") +
    wires.map((w) => { const p = w.points, a = p[p.length - 2] ?? p[0], b = p[p.length - 1]; const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; const col = bad.has(w.edge.source + "→" + w.edge.target) ? "#d00" : "#000"; return `<polyline points="${p.map((q) => q.x.toFixed(1) + "," + q.y.toFixed(1)).join(" ")}" fill="none" stroke="${col}" stroke-width="1.2"/><circle cx="${w.source.x}" cy="${w.source.y}" r="3" fill="${col}"/><polygon transform="translate(${b.x} ${b.y}) rotate(${ang})" points="0,0 -9,-4 -9,4" fill="${col}"/>`; }).join("") + `</g>`;
  if (style === "step") row++;
}
mkdirSync(sheetDir, { recursive: true });
writeFileSync(`${sheetDir}${out}.html`, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#eee"><svg xmlns="http://www.w3.org/2000/svg" width="${2 * W}" height="${row * H}" font-family="system-ui">${cells}</svg>`);
console.table(summary);
const kinds = {}; all.filter((d) => d.sev >= 2).forEach((d) => (kinds[d.kind] = (kinds[d.kind] ?? 0) + 1)); console.log("sev>=2 by kind:", kinds);
console.log("TOTAL sev3", all.filter((d) => d.sev === 3).length, "sev2", all.filter((d) => d.sev === 2).length, "sev1", all.filter((d) => d.sev === 1).length);
writeFileSync(`${process.env.AUDIT_DIR ?? tmpdir()}/${out}.json`, JSON.stringify(all, null, 1));
