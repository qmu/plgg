// Layout audit — the acceptance tool for plgg-flow/autoLayout (see LAYOUT.md).
// Lays out realistic diagrams given as nodes and edges WITHOUT coordinates,
// detects defects, and writes a contact sheet. Build first, then:
//   node packages/plgg-flow/scripts/layout-audit.mjs [name]
// Sheet: packages/plgg-flow-example/dist/<name>.html ; defects: $AUDIT_DIR/<name>.json
// Owned by the reviewer. The implementer does not edit this file.
import { planLayers } from "../dist/autoLayout.es.js";
import { wireGraph } from "../dist/wiring.es.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
const sheetDir = fileURLToPath(new URL("../../plgg-flow-example/dist/", import.meta.url));
const out = process.argv[2] ?? "layout-audit";
const n = (id, extra = {}) => ({ id, label: id, width: 104, height: 36, position: { x: 0, y: 0, z: 0 }, ...extra });
const G = (pairs, extra = {}, loose = []) => { const ids = [...new Set([...pairs.flat(), ...loose])]; return { nodes: ids.map((id) => n(id, extra[id])), edges: pairs.map(([source, target]) => ({ source, target })) }; };
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const S = {};
// name -> { g, maxCross (centre lines), maxReversed, tree?, note }
S.pipelineSkips = { g: G([["Src", "Parse"], ["Parse", "Lint"], ["Lint", "Type"], ["Type", "Opt"], ["Opt", "Emit"], ["Emit", "Pack"], ["Pack", "Ship"], ["Src", "Type"], ["Parse", "Emit"], ["Lint", "Pack"], ["Type", "Ship"]]), maxReversed: 0 };
S.microservices = { g: G([["Web", "Gateway"], ["Mobile", "Gateway"], ["Gateway", "Auth"], ["Gateway", "Users"], ["Gateway", "Orders"], ["Gateway", "Catalog"], ["Gateway", "Search"], ["Orders", "Queue"], ["Orders", "Payments"], ["Queue", "Mailer"], ["Queue", "Ledger"], ["Payments", "Ledger"], ["Catalog", "Cache"], ["Search", "Cache"], ["Cache", "DB"], ["Users", "DB"], ["Orders", "DB"], ["Ledger", "Audit"], ["Mailer", "Audit"], ["Auth", "Users"], ["Payments", "Orders"], ["Audit", "Gateway"], ["DB", "Catalog"]]), maxReversed: 3 };
S.stateMachine = { g: G([["Idle", "Loading"], ["Loading", "Ready"], ["Loading", "Error"], ["Error", "Idle"], ["Ready", "Editing"], ["Editing", "Ready"], ["Editing", "Saving"], ["Saving", "Ready"], ["Saving", "Error"], ["Ready", "Closed"], ["Error", "Loading"], ["Ready", "Idle"]]), maxReversed: 6 };
S.retryLoop = { g: G([["Start", "Fetch"], ["Fetch", "Parse"], ["Parse", "Validate"], ["Validate", "Store"], ["Store", "Done"], ["Fetch", "Retry"], ["Retry", "Fetch"], ["Validate", "Fix"], ["Fix", "Parse"], ["Store", "Fetch"]]), maxReversed: 3 };
S.orderFlow = { g: G([["Cart", "Checkout"], ["Checkout", "Payment"], ["Payment", "Paid"], ["Payment", "Failed"], ["Failed", "Payment"], ["Failed", "Cart"], ["Paid", "Packing"], ["Packing", "Shipped"], ["Shipped", "Delivered"], ["Delivered", "Returned"], ["Returned", "Refunded"], ["Paid", "Cancelled"], ["Cancelled", "Refunded"], ["Checkout", "Cart"]]), maxReversed: 3 };
S.orgTree = { g: (() => { const p = []; ["A", "B", "C"].forEach((d) => { p.push(["CEO", d]); [0, 1, 2].forEach((k) => { p.push([d, d + k]); [0, 1].forEach((m) => p.push([d + k, d + k + "." + m])); }); }); return G(p); })(), maxCross: 0, maxReversed: 0, tree: true };
S.binaryTree = { g: (() => { const p = []; for (let i = 1; i < 16; i++) { p.push(["n" + i, "n" + 2 * i], ["n" + i, "n" + (2 * i + 1)]); } return G(p); })(), maxCross: 0, maxReversed: 0, tree: true };
S.diamonds = { g: G([["S", "a"], ["S", "b"], ["S", "c"], ["a", "M"], ["b", "M"], ["c", "M"], ["M", "d"], ["M", "f"], ["d", "T"], ["f", "T"], ["a", "d"], ["c", "f"]]), maxCross: 0, maxReversed: 0 };
S.hub = { g: G([...Array.from({ length: 12 }, (_, i) => ["in" + i, "Hub"]), ...Array.from({ length: 8 }, (_, i) => ["Hub", "out" + i])]), maxCross: 0, maxReversed: 0 };
S.ciPipeline = { g: G([["push", "lint"], ["push", "build"], ["push", "typecheck"], ["build", "unit"], ["build", "e2e"], ["build", "bundle"], ["lint", "gate"], ["typecheck", "gate"], ["unit", "gate"], ["e2e", "gate"], ["bundle", "gate"], ["gate", "staging"], ["staging", "smoke"], ["smoke", "prod"], ["gate", "notify"]]), maxCross: 0, maxReversed: 0 };
S.lattice = { g: (() => { const p = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if (i < 3) p.push([`q${i}${j}`, `q${i + 1}${j}`]); if (j < 3) p.push([`q${i}${j}`, `q${i}${j + 1}`]); } return G(p); })(), maxCross: 0, maxReversed: 0 };
S.twoComponents = { g: G([["a1", "a2"], ["a2", "a3"], ["a2", "a4"], ["b1", "b2"], ["b1", "b3"], ["b3", "b4"], ["b2", "b4"]], {}, ["alone"]), maxCross: 0, maxReversed: 0 };
S.variedSizes = { g: G([["A very long service name", "x"], ["A very long service name", "Tall"], ["x", "Wide banner node"], ["Tall", "Wide banner node"], ["Tall", "C"], ["x", "C"], ["C", "D"], ["Wide banner node", "D"]], { "A very long service name": { width: 220 }, Tall: { height: 140 }, "Wide banner node": { width: 260 }, x: { width: 44 } }), maxCross: 1, maxReversed: 0 };
S.selfAndMulti = { g: (() => { const g = G([["A", "B"], ["A", "B"], ["B", "A"], ["A", "C"], ["C", "B"], ["A", "A"], ["C", "C"]]); return { nodes: g.nodes, edges: g.edges.map((x, i) => ({ ...x, id: "e" + i })) }; })(), maxReversed: 1 };
S.layeredRandom = { g: (() => { const r = rng(7), p = []; for (let l = 0; l < 5; l++) for (let i = 0; i < 5; i++) { const k = 1 + Math.floor(r() * 2); for (let c = 0; c < k; c++) { const span = r() < 0.8 ? 1 : 2; if (l + span < 6) p.push([`L${l}_${i}`, `L${l + span}_${Math.floor(r() * 5)}`]); } } return G([...new Map(p.map((x) => [x.join(">"), x])).values()]); })(), maxReversed: 0 };
S.big200 = { g: (() => { const r = rng(11), p = []; for (let i = 1; i < 200; i++) { p.push(["v" + Math.max(0, i - 1 - Math.floor(r() * 12)), "v" + i]); if (r() < 0.35) p.push(["v" + Math.max(0, i - 1 - Math.floor(r() * 30)), "v" + i]); } return G([...new Map(p.map((x) => [x.join(">"), x])).values()]); })(), maxReversed: 0 };
// ---- geometry ------------------------------------------------------------
const box = (m) => ({ l: m.position.x - (m.width ?? 104) / 2, r: m.position.x + (m.width ?? 104) / 2, t: m.position.y - (m.height ?? 36) / 2, b: m.position.y + (m.height ?? 36) / 2 });
const gapOf = (a, b) => Math.max(Math.max(a.l - b.r, b.l - a.r), Math.max(a.t - b.b, b.t - a.b));
const o = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
const segX = (a, b, c, d) => o(c, d, a) * o(c, d, b) < 0 && o(a, b, c) * o(a, b, d) < 0;
const centreCross = (g) => { const by = new Map(g.nodes.map((m) => [m.id, m.position])); const E = g.edges.filter((x) => x.source !== x.target); let c = 0; for (let i = 0; i < E.length; i++) for (let j = i + 1; j < E.length; j++) { const a = E[i], b = E[j]; if ([a.source, a.target].some((u) => u === b.source || u === b.target)) continue; if (segX(by.get(a.source), by.get(a.target), by.get(b.source), by.get(b.target))) c++; } return c; };
const inside = (p, q, m = 1) => p.x > q.l + m && p.x < q.r - m && p.y > q.t + m && p.y < q.b - m;
// a plain reference: longest-path layers after dropping DFS back edges, 24 barycentre sweeps. The real thing must not be worse than this.
const reference = (g) => {
  const outE = new Map(g.nodes.map((m) => [m.id, []])); g.edges.forEach((x) => x.source !== x.target && outE.get(x.source).push(x.target));
  const state = new Map(), back = new Set(); const dfs = (u) => { state.set(u, 1); for (const v of outE.get(u)) { if (state.get(v) === 1) back.add(u + ">" + v); else if (!state.get(v)) dfs(v); } state.set(u, 2); }; g.nodes.forEach((m) => !state.get(m.id) && dfs(m.id));
  const E = g.edges.filter((x) => x.source !== x.target).map((x) => back.has(x.source + ">" + x.target) ? [x.target, x.source] : [x.source, x.target]);
  const layer = new Map(g.nodes.map((m) => [m.id, 0])); for (let k = 0; k < g.nodes.length; k++) { let ch = false; for (const [a, b] of E) if (layer.get(b) < layer.get(a) + 1) { layer.set(b, layer.get(a) + 1); ch = true; } if (!ch) break; }
  const pos = new Map(); const L = []; g.nodes.forEach((m) => { const l = layer.get(m.id); (L[l] ??= []).push(m.id); }); L.forEach((ids) => ids.forEach((id, i) => pos.set(id, i)));
  const nb = new Map(g.nodes.map((m) => [m.id, []])); E.forEach(([a, b]) => { nb.get(a).push(b); nb.get(b).push(a); });
  for (let s = 0; s < 24; s++) { const order = s % 2 ? [...L.keys()].reverse() : [...L.keys()]; for (const l of order) { const ids = L[l]; if (!ids) continue; const key = new Map(ids.map((id) => { const ns = nb.get(id).filter((v) => layer.get(v) === l + (s % 2 ? 1 : -1)); return [id, ns.length ? ns.reduce((t, v) => t + pos.get(v), 0) / ns.length : pos.get(id)]; })); ids.sort((a, b) => key.get(a) - key.get(b)); ids.forEach((id, i) => pos.set(id, i)); } }
  return { crossings: centreCross({ nodes: g.nodes.map((m) => ({ ...m, position: { x: layer.get(m.id) * 220, y: (pos.get(m.id) - (L[layer.get(m.id)].length - 1) / 2) * 80 } })), edges: g.edges }), reversed: back.size };
};
const shuffle = (xs, r) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const audit = (name, sc, dir) => {
  const D = [], add = (sev, kind, note) => D.push({ sev, kind, node: "", note }); const g0 = sc.g;
  let plan, ms = 0; try { const ts = []; for (let k = 0; k < 5; k++) { const t0 = performance.now(); plan = planLayers(g0, { direction: dir }); ts.push(performance.now() - t0); } ts.sort((a, b) => a - b); ms = ts[2]; } catch (x) { add(3, "THROWS", String(x?.message ?? x)); return { D, g: g0, wires: [], ms, cross: 0, ref: 0 }; }
  const g = plan.graph, by = new Map(g.nodes.map((m) => [m.id, m])), L = plan.layers, main = dir === "right" ? "x" : "y", cross = dir === "right" ? "y" : "x";
  if (g.nodes.length !== g0.nodes.length || g0.nodes.some((m) => !by.has(m.id))) add(3, "nodes-lost", "");
  if (g.nodes.some((m) => !["x", "y", "z"].every((k) => Number.isFinite(m.position[k])))) { add(3, "NaN", ""); return { D, g, wires: [], ms, cross: 0, ref: 0 }; }
  if (g.nodes.some((m) => m.position.z !== 0)) add(2, "z-without-depth", "");
  // boxes
  let minGap = 1e9; for (let i = 0; i < g.nodes.length; i++) for (let j = i + 1; j < g.nodes.length; j++) { const d = gapOf(box(g.nodes[i]), box(g.nodes[j])); minGap = Math.min(minGap, d); if (d < 0) add(3, "overlap", g.nodes[i].id + " × " + g.nodes[j].id); else if (d < 24) add(2, "too-close", `${g.nodes[i].id} × ${g.nodes[j].id} ${d.toFixed(0)}u`); }
  // direction: every edge that is not declared reversed runs forward along the main axis, by layers and by coordinates
  const rev = new Set(plan.reversed); let reversed = 0;
  g.edges.forEach((x, i) => { if (x.source === x.target) return; const a = by.get(x.source), b = by.get(x.target); const fwd = b.position[main] - a.position[main]; if (rev.has(i)) { reversed++; return; } if (!(L.get(x.target) > L.get(x.source))) add(3, "layer-order", `${x.source}→${x.target}`); else if (fwd < 40) add(2, "not-forward", `${x.source}→${x.target} ${fwd.toFixed(0)}u`); });
  const ref = reference(g0);
  // a reversed edge is one that returns toward where the flow starts: the roots (no inputs), or the first node written if there are none
  { const roots = g0.nodes.filter((m) => !g0.edges.some((x) => x.target === m.id && x.source !== m.id)).map((m) => m.id); const start = roots.length ? roots : [g0.nodes[0].id]; const dist = new Map(start.map((id) => [id, 0])); const q = [...start]; while (q.length) { const u = q.shift(); for (const x of g0.edges) if (x.source === u && !dist.has(x.target)) { dist.set(x.target, dist.get(u) + 1); q.push(x.target); } }
    g.edges.forEach((x, i) => { if (rev.has(i) && dist.has(x.source) && dist.has(x.target) && dist.get(x.target) > dist.get(x.source)) add(2, "reversed-the-wrong-edge", `${x.source}→${x.target} leads away from the start (${start[0]}) but is drawn backwards`); });
    if (!roots.length && L.get(start[0]) !== 0) add(2, "start-not-first", `${start[0]} is written first but sits in layer ${L.get(start[0])}`); }
  // a cyclic flow is no deeper than its distance from the start: stretching a cycle into a line is a failed layering
  { const roots = g0.nodes.filter((m) => !g0.edges.some((x) => x.target === m.id && x.source !== m.id)).map((m) => m.id); const start = roots.length ? roots : [g0.nodes[0].id]; const dist = new Map(start.map((id) => [id, 0])); const q = [...start]; while (q.length) { const u = q.shift(); for (const x of g0.edges) if (x.source === u && !dist.has(x.target)) { dist.set(x.target, dist.get(u) + 1); q.push(x.target); } }
    const full = (a, b) => { const seen = new Set([a]), st = [a]; while (st.length) { const u = st.pop(); if (u === b) return true; for (const x of g0.edges) if (x.source === u && !seen.has(x.target)) { seen.add(x.target); st.push(x.target); } } return false; }; const F = g0.edges.filter((x) => x.source !== x.target && (dist.get(x.target) > dist.get(x.source) || !full(x.target, x.source))).map((x) => [x.source, x.target]); const reach = (a, b) => { const seen = new Set([a]), st = [a]; while (st.length) { const u = st.pop(); if (u === b) return true; for (const [p, q2] of F) if (p === u && !seen.has(q2)) { seen.add(q2); st.push(q2); } } return false; };
    for (const x of g0.edges) if (x.source !== x.target && dist.get(x.target) === dist.get(x.source) && !reach(x.target, x.source)) F.push([x.source, x.target]);
    const lp = new Map(g0.nodes.map((m) => [m.id, 0])); for (let k = 0; k < g0.nodes.length; k++) { let ch = false; for (const [p, q2] of F) if (lp.get(q2) < lp.get(p) + 1) { lp.set(q2, lp.get(p) + 1); ch = true; } if (!ch) break; }
    const depth = new Set(L.values()).size, need = Math.max(...lp.values()) + 1; if (reversed > 0 && dist.size === g0.nodes.length && g0.nodes.length <= 60 && depth > need) add(2, "ribbon", `${depth} layers, the flow is only ${need} steps deep from ${start[0]}`); }
  const lim = sc.maxReversed ?? ref.reversed; if (reversed > lim) add(2, "too-many-reversed", `${reversed} > ${lim}`);
  // layers are straight lines: same layer, same main coordinate (centres)
  const mains = new Map(); g.nodes.forEach((m) => { const l = L.get(m.id); const v = mains.get(l); if (v === undefined) mains.set(l, m.position[main]); else if (Math.abs(v - m.position[main]) > 1) add(2, "ragged-layer", `${m.id} in layer ${l}`); });
  const ls = [...mains].sort((a, b) => a[0] - b[0]); for (let i = 1; i < ls.length; i++) if (ls[i][1] <= ls[i - 1][1]) add(3, "layers-out-of-order", `${ls[i - 1][0]}/${ls[i][0]}`);
  // crossings of centre lines, against the scenario's bound and the plain reference
  const cx = centreCross(g); const bound = sc.maxCross ?? Math.floor(ref.crossings * 1.0);
  if (cx > bound) add(2, "crossings", `${cx} > ${bound}${sc.maxCross === undefined ? " (plain barycentre reference)" : ""}`);
  // shape: chains are straight, parents sit over their children
  const outs = new Map(g.nodes.map((m) => [m.id, []])), ins = new Map(g.nodes.map((m) => [m.id, []])); g.edges.forEach((x) => { if (x.source === x.target) return; outs.get(x.source).push(x.target); ins.get(x.target).push(x.source); });
  g.nodes.forEach((m) => { const os = [...new Set(outs.get(m.id))]; if (os.length === 1 && new Set(ins.get(os[0])).size === 1 && L.get(os[0]) === L.get(m.id) + 1) { const d = Math.abs(by.get(os[0]).position[cross] - m.position[cross]); if (d > 1) add(2, "chain-not-straight", `${m.id}→${os[0]} off by ${d.toFixed(0)}u`); }
    if (sc.tree && os.length > 1) { const cs = os.map((id) => by.get(id).position[cross]); const mid = (Math.min(...cs) + Math.max(...cs)) / 2; if (Math.abs(mid - m.position[cross]) > 2) add(2, "parent-off-centre", `${m.id} by ${(m.position[cross] - mid).toFixed(0)}u`); } });
  // edge length: nothing is flung far across the sheet
  { let total = 0, minimal = 0; g.edges.forEach((x) => { if (x.source === x.target) return; const a = by.get(x.source).position, b = by.get(x.target).position; total += Math.hypot(a.x - b.x, a.y - b.y); minimal += Math.abs(a[main] - b[main]); }); if (minimal && total / minimal > 1.6) add(2, "sprawl", `edges are ${(total / minimal).toFixed(2)}× their forward distance`); }
  { const xs = g.nodes.map((m) => box(m)), w = Math.max(...xs.map((b) => b.r)) - Math.min(...xs.map((b) => b.l)), h = Math.max(...xs.map((b) => b.b)) - Math.min(...xs.map((b) => b.t)); const cxm = (Math.max(...xs.map((b) => b.r)) + Math.min(...xs.map((b) => b.l))) / 2, cym = (Math.max(...xs.map((b) => b.b)) + Math.min(...xs.map((b) => b.t))) / 2; if (Math.abs(cxm) > 2 || Math.abs(cym) > 2) add(2, "not-centred", `centre ${cxm.toFixed(0)},${cym.toFixed(0)}`); const density = g.nodes.length * 104 * 36 / (w * h || 1); if (g.nodes.length > 6 && density < 0.02) add(2, "too-sparse", `${(density * 100).toFixed(1)}% filled, ${w.toFixed(0)}×${h.toFixed(0)}`); }
  // deterministic, and independent of the order things were written in
  { const again = planLayers(g0, { direction: dir }).graph; if (again.nodes.some((m, i) => Math.hypot(m.position.x - g.nodes[i].position.x, m.position.y - g.nodes[i].position.y) > 0.01)) add(3, "not-deterministic", "");
    const r = rng(3); const sh = planLayers({ nodes: shuffle(g0.nodes, r), edges: shuffle(g0.edges, r) }, { direction: dir }).graph; const c2 = centreCross(sh); if (c2 > cx + 1) add(2, "order-dependent", `shuffled input gives ${c2} crossings, not ${cx}`); }
  // stable: one more leaf must not rearrange the sheet
  { const host = g0.nodes[Math.floor(g0.nodes.length / 2)].id; const g1 = planLayers({ nodes: [...g0.nodes, n("__new")], edges: [...g0.edges, { source: host, target: "__new" }] }, { direction: dir }).graph; const b1 = new Map(g1.nodes.map((m) => [m.id, m.position])); const ox = g1.nodes.filter((m) => m.id !== "__new").reduce((t, m) => t + m.position.x - by.get(m.id).position.x, 0) / g.nodes.length, oy = g1.nodes.filter((m) => m.id !== "__new").reduce((t, m) => t + m.position.y - by.get(m.id).position.y, 0) / g.nodes.length;
    let worst = 0, who = ""; g.nodes.forEach((m) => { const p = b1.get(m.id); const d = Math.hypot(p.x - m.position.x - ox, p.y - m.position.y - oy); if (d > worst) { worst = d; who = m.id; } }); if (worst > 140) add(2, "unstable", `adding a leaf under ${host} moves ${who} by ${worst.toFixed(0)}u`); else if (worst > 70) add(1, "shifts", `${who} ${worst.toFixed(0)}u`); }
  // depth: layers become steps of height
  { const d = planLayers(g0, { direction: dir, depth: true }); const zs = new Map(); let bad = false; d.graph.nodes.forEach((m) => { const l = d.layers.get(m.id); if (zs.has(l) && zs.get(l) !== m.position.z) bad = true; zs.set(l, m.position.z); const flat = by.get(m.id); if (Math.abs(flat.position.x - m.position.x) > 0.01 || Math.abs(flat.position.y - m.position.y) > 0.01) bad = true; }); const z = [...zs].sort((a, b) => a[0] - b[0]).map((x) => x[1]); if (bad || z.some((v, i) => i && v <= z[i - 1]) || (z.length > 1 && z[1] - z[0] < 24)) add(2, "depth", "z must rise by a fixed step per layer and leave x,y as they are"); }
  // time
  { const budget = Math.max(20, g0.nodes.length * 1.5); if (ms > budget) add(ms > budget * 4 ? 3 : 2, "slow", `${ms.toFixed(1)}ms (budget ${budget.toFixed(0)})`); }
  // and the wires on top of it
  let wires = [], wx = 0; try { wires = wireGraph(g); wires.forEach((w) => { const s = w.edge.source, t = w.edge.target; for (const m of g.nodes) { if (m.id === s || m.id === t) continue; if (w.points.some((p) => inside(p, box(m)))) { add(3, "wire-through-node", `${s}→${t} through ${m.id}`); break; } } });
    for (let i = 0; i < wires.length; i++) for (let j = i + 1; j < wires.length; j++) { const a = wires[i].points, b = wires[j].points; let c = 0; for (let p = 1; p < a.length; p++) for (let q = 1; q < b.length; q++) if (segX(a[p - 1], a[p], b[q - 1], b[q])) c++; wx += c; }
    if (wx > Math.max(bound, cx) + 2) add(2, "wires-cross-more", `${wx} wire crossings for ${cx} centre-line crossings`); } catch (x) { add(3, "WIRING-THROWS", String(x?.message ?? x)); }
  return { D, g, wires, ms, cross: cx, ref: ref.crossings, reversed, wx, minGap };
};
// ---- run -----------------------------------------------------------------
const W = 1240, H = 700; let cells = "", row = 0; const summary = [], all = [];
for (const [name, sc] of Object.entries(S)) for (const dir of ["right", "down"]) {
  const r = audit(name, sc, dir); const s3 = r.D.filter((d) => d.sev === 3).length, s2 = r.D.filter((d) => d.sev === 2).length, s1 = r.D.filter((d) => d.sev === 1).length;
  summary.push({ name, dir, nodes: sc.g.nodes.length, edges: sc.g.edges.length, cross: r.cross, ref: r.ref, wires: r.wx ?? 0, rev: r.reversed ?? 0, sev3: s3, sev2: s2, sev1: s1, ms: +r.ms.toFixed(2) });
  r.D.forEach((d) => all.push({ name, dir, ...d }));
  const bs = r.g.nodes.map(box), l = Math.min(...bs.map((b) => b.l)), rr = Math.max(...bs.map((b) => b.r)), t = Math.min(...bs.map((b) => b.t)), b = Math.max(...bs.map((b) => b.b)); const k = Math.min(1, (W - 60) / (rr - l || 1), (H - 90) / (b - t || 1));
  cells += `<g transform="translate(${(dir === "down" ? W : 0)},${row * H})"><rect x="4" y="4" width="${W - 8}" height="${H - 8}" fill="#fff" stroke="${s3 ? "#d00" : s2 ? "#e90" : "#bbb"}" stroke-width="${s3 || s2 ? 3 : 1}"/><text x="14" y="26" font-size="16" font-weight="600">${name} · ${dir}</text><text x="14" y="44" font-size="12" fill="#555">cross ${r.cross} (reference ${r.ref}) · wire crossings ${r.wx ?? "-"} · reversed ${r.reversed ?? "-"} · sev3 ${s3} · sev2 ${s2} · ${r.ms.toFixed(1)}ms · ${r.D.filter((d) => d.sev >= 2).slice(0, 3).map((d) => d.kind + " " + d.note).join(" | ").replace(/[<&]/g, "")}</text><g transform="translate(${W / 2},${H / 2 + 20}) scale(${k}) translate(${-(l + rr) / 2},${-(t + b) / 2})">` +
    r.wires.map((w) => { const p = w.points, a = p[p.length - 2] ?? p[0], q = p[p.length - 1]; const ang = Math.atan2(q.y - a.y, q.x - a.x) * 180 / Math.PI; return `<polyline points="${p.map((u) => u.x.toFixed(1) + "," + u.y.toFixed(1)).join(" ")}" fill="none" stroke="#000" stroke-width="${1 / k}"/><path d="M0,0 L-9,-3.5 L-9,3.5 Z" transform="translate(${q.x},${q.y}) rotate(${ang})"/>`; }).join("") +
    r.g.nodes.map((m) => { const q = box(m); return `<rect x="${q.l}" y="${q.t}" width="${q.r - q.l}" height="${q.b - q.t}" fill="#fff" stroke="#000" stroke-width="${1 / k}"/><text x="${m.position.x}" y="${m.position.y + 4}" text-anchor="middle" font-size="11">${m.id.replace(/[<&]/g, "")}</text>`; }).join("") + `</g></g>`;
  if (dir === "down") row++;
}
mkdirSync(sheetDir, { recursive: true });
writeFileSync(`${sheetDir}${out}.html`, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#eee"><svg xmlns="http://www.w3.org/2000/svg" width="${2 * W}" height="${row * H}" font-family="system-ui">${cells}</svg>`);
console.table(summary);
const kinds = {}; all.filter((d) => d.sev >= 2).forEach((d) => (kinds[d.kind] = (kinds[d.kind] ?? 0) + 1)); console.log("sev>=2 by kind:", kinds);
console.log("TOTAL sev3", all.filter((d) => d.sev === 3).length, "sev2", all.filter((d) => d.sev === 2).length, "sev1", all.filter((d) => d.sev === 1).length);
writeFileSync(`${process.env.AUDIT_DIR ?? tmpdir()}/${out}.json`, JSON.stringify(all, null, 1));
