# Wiring: how plgg-flow routes its edges

> Part of [plgg-flow](./README.md). This is the design and the acceptance
> bar for `plgg-flow/wiring`.

## Why

A fixed cubic from the source's right side to the target's left side
crosses other wires needlessly, runs through other nodes, and lands every
wire entering a node on the same point, so arrowheads pile up. Wiring
should feel better than React Flow's defaults without the reader placing a
single waypoint.

## Shape of the module

`src/wiring.ts` (+ `wiring.spec.ts`), exported as `plgg-flow/wiring` the
same way `dsl` is exported (`bundle.config.ts` entry, `package.json`
`exports` block).

```ts
export type WireStyle = "curve" | "step";
export type Wire = Readonly<{
  edge: Edge; // same object identity as in graph.edges
  source: Point3; // where it leaves the source node (on its side)
  target: Point3; // where the arrow tip lands (on the target's side)
  points: readonly Point3[]; // dense polyline, world coords, source→target
}>;
export type WiringOptions = Readonly<{
  clearance?: number; // wanted gap to other nodes and parallel wires, default 18
  radius?: number; // corner radius of the step style, default 10
}>;
export const wireGraph: (
  graph: Graph,
  options?: WiringOptions,
) => readonly Wire[];
export const wireMetrics: (
  graph: Graph,
  wires: readonly Wire[],
) => Readonly<{
  crossings: number; // wire–wire proper crossings (endpoints shared at a node don't count)
  nodeHits: number; // wires passing through a node that is not their own endpoint
  minClearance: number; // smallest distance from any wire to any foreign node box
  minPortGap: number; // smallest distance between two wire endpoints on one node side
}>;
```

Per-edge style comes from the existing `edge.route`: `"step"` → rounded
orthogonal, `"straight"` → a straight segment (still gets a spread
endpoint), anything else → smooth curve. Edges with non-empty
`edge.waypoints` are user-routed and keep today's behaviour.

Geometry: a node box is centred on `node.position`, width
`node.width ?? 104`, height `node.height ?? 36`. Wires leave from the right
side and enter on the left side. `hidden` nodes are ignored; expanded
`group` nodes are containers, not obstacles. Routing happens in the x/y
plane; each output point's `z` is interpolated by arc length from the
source node's z to the target node's z. Named ports are honoured:
`portsFor`/`portOffset` in `plgg-flow/connections` give a handle's fixed
offset, and an edge with a `sourceHandle`/`targetHandle` keeps it and is
not re-slotted.

## What a good wire is

A wire is judged by ONE cost, summed over the diagram — never by crossings
alone. Removing a crossing is worth about 60 world units of extra length
and no more: a wire that circles the diagram to dodge one crossing is
worse than the crossing.

    cost = length
         + 60 × crossings
         + 25 × bends (step) / total turning beyond the plain S (curve)
         + proximity (rises steeply inside `clearance` of a foreign node
           or of another wire running alongside)
         + ∞ for passing through a foreign node

Hard rules, in priority order:

1. **Direct.** A forward wire (target's left side is right of the source's
   right side by ≥ 32) is x-monotone: it never travels backward in x and
   never leaves the vertical band spanned by its two nodes by more than
   it needs to pass an obstacle. Its length is ≤ 1.35 × the plain route
   unless a node blocks the plain route. No exterior loops, ever, for a
   forward wire.
2. **A curve is a curve.** The curve style is a smooth spline with
   horizontal end tangents. Unobstructed, it is exactly one cubic Bézier
   between the two slots, control arms `max(40, 0.45·dx)` — the React
   Flow shape. Blocked, it bends around the obstacle through via-points
   (clearance above or below the obstacle, or the midline between two
   obstacles) joined by a C1 spline that is monotone in x. It never
   degrades into straight runs with rounded corners.
3. **A step is three strokes.** Unobstructed: horizontal, one vertical
   channel, horizontal — two rounded corners. The channel x sits midway
   between the two nodes; wires sharing a channel get lanes ≥ 10 apart,
   ordered so they nest instead of crossing. Blocked: move the channel,
   or add one jog (four corners); never more than six corners.
4. **Port slots — arrows never pile up.** On each node side, wires
   without a named handle are spread along the side, ordered by the y
   (then x) of their far end so they do not cross at the node. Gap is
   `min(12, (height − 8) / (n − 1))`. The module reports each wire's
   slot gap so the viewport can shrink dots and arrowheads to fit
   (`dot radius = min(3, 0.4 × gap)`, arrow scale likewise): tips never
   overlap, even five on a 36-tall side.
5. **No wire lies on another.** Two wires never share a collinear run
   (within 4 units for more than 12 units of length). Parallel edges
   between the same pair, and wires sharing a channel, are fanned apart.
6. **Clearance, centred.** A wire keeps `clearance` from foreign nodes;
   between two objects it runs through the middle.
7. **Backward wires loop tight.** Target left of source: out of the right
   side, over the top or under the bottom of just the two nodes (the
   side with fewer obstacles, then the shorter), into the left side. A
   2-cycle A ⇄ B is one forward wire and one tight loop. The loop hugs
   the pair's own bounding box at `clearance`, not the diagram's.
8. **Every wire is whole.** `points` is one connected polyline from the
   source slot to the target slot; consecutive points are ≤ 12 apart on
   curves and arcs. No fragment ends in mid-air.
9. **Stable under dragging.** Deterministic; ties broken by edge order
   and ids. Moving a node 2 units moves no unrelated wire more than 6.
10. **Fast.** Under 3 ms for 40 nodes / 60 edges; memoised on the
    identity of `graph.nodes` and `graph.edges`. No new dependencies.

`wireMetrics` additionally reports: `overlap` (total length of rule-5
violations), `detour` (max over forward wires of length ÷ plain-route
length), `backtrack` (max distance any forward wire travels backward in
x), `maxCorners` (step) and `cost`.

## Patterns the spec must cover

Named fixtures in `wiring.spec.ts`, each asserted for the curve style and
for the step style (`route: "step"` on every edge). ALL nodes use the
default 104 × 36 box unless the pattern says otherwise.

- `single`: A → B, nothing in the way. Curve: exactly the one-Bézier
  shape. Step: two corners.
- `fanIn`: five sources stacked vertically → one target, default box.
- `fanOut`: one source → five targets stacked vertically.
- `cross`: N(−225,−100) S(−225,100) U(220,−95) L(220,100) with N→L, S→U,
  N→U, S→L. Expected: exactly ONE crossing, four direct wires, `detour`
  ≤ 1.1. (Zero crossings by looping around is a FAILURE.)
- `blocked`: A → B with a node C exactly on the straight path.
- `corridor`: A → B passing between two nodes 90 apart vertically.
- `backward`: A → B where B is left of A; and a 2-cycle A ⇄ B.
- `stacked`: target directly below source (same x).
- `bipartite`: A,B,C,D at x=−250, y=−150,−50,50,150; P,Q,R,S at x=200,
  same ys; M at (−20,0); edges A→S, B→P, C→Q, D→R, A→Q, D→P, S→A.
- `fanBlocked`: A..E at x=−250, y=−160..160 step 80 → T(150,0), with
  X(−40,−20) in the way.
- `dense`: 3×3 grid of nodes, 10 edges between non-adjacent ones.
- `parallel`: two edges between the same pair.
- `mixed`: curve, step and straight edges in one graph.

Assertions everywhere: `nodeHits === 0`; `overlap === 0`; every wire
connected (rule 8); first and last 12 units horizontal; forward wires:
`backtrack === 0` and `detour ≤ 1.35` (≤ 1.1 when unblocked);
`maxCorners ≤ 6`. Slots: neighbouring endpoints on a side ≥
`min(12, (height−8)/(n−1)) − 0.01` apart. `corridor`: within 6 of the
midline between the two nodes. `minClearance ≥ 10` in `blocked`,
`corridor`, `fanBlocked`, `dense`. Determinism, stability (rule 9), and a
generated 40-node / 60-edge graph within 15 ms.

## Viewport

`viewport.ts` computes the wires once per `flowView` call from the scene's
visible nodes and edges, and draws an edge without waypoints along
`wire.points` (through the existing `polylineSampler` path). Arrowheads,
labels at the midpoint, the `animated` class, hit testing, the active
highlight and alt-click-to-add-a-waypoint keep working.

A socket dot is drawn at every distinct wire endpoint on a node, at the
node's waist: the middle of its flank (`z = node.position.z`), not the
front edge — in 3D a dot on the front edge reads as sitting on the top
face. A flank turned away from the camera hides its dots and the last
stretch of its wires behind the solid, as a real box would. The default
connectable dots still appear when the node is chosen or a connection is
in progress. A wire's first and last point coincide with its dots.

The viewport sizes each socket dot and arrowhead from the wire's slot gap
(rule 4), so crowded sides stay legible.

## Review log

- **Round 1 — rejected.** Crossings were driven to zero by routing wires
  around the outside of the whole diagram (`cross`: S→U circled both
  columns), curve wires were rounded polylines, several wires shared one
  outer lane, one wire ended in mid-air, and five tips on a 36-tall side
  overlapped. The bar above was rewritten around a single cost so a
  detour can no longer buy a crossing at any price.
- **Round 2 — simple patterns accepted; four defects remain.**
  `single`, `fanIn`, `fanOut`, `cross`, `blocked`, `corridor`, `cycle`
  and `parallel` read well in both styles. Still wrong:
  1. **Speed.** Measured cold: `dense` 110 ms curve / 32 ms step,
     `bipartite` 44 ms / 10 ms. The budget is 3 ms. Candidate ×
     candidate interaction over dense polylines is the cost: compare
     coarse skeletons (via-points / corner lists and bounding boxes),
     sample the dense polyline only once for the chosen route, and cap
     the candidate set per wire (≤ 6).
  2. **Backward wires touch their own nodes.** `backward`
     (A(150,0) → B(−150,40)) threads the 4-unit gap between A's bottom
     and B's top. A loop keeps `clearance` from its OWN two nodes as
     well: it may pass between them only if the gap is ≥ 2 × clearance,
     otherwise it goes over the top or under the bottom of both.
  3. **Blocked curves go stiff.** `bipartite`, `dense` and `fanBlocked`
     curves contain long dead-straight horizontal runs joined by bends,
     and two wires to one target cross twice near it. A blocked curve
     is at most two or three cubic pieces through its via-points, with
     the tangent at each via-point following the chord between its
     neighbours (Catmull-Rom), horizontal only at the two ends. Sibling
     wires into one node never cross each other: if they would, swap
     their slots or their detour sides.
  4. **Step wires hairpin.** In `dense` and `bipartite` step wires
     overshoot and come back (U-turns beside n12/n22, a wire rising past
     its target row and returning). A step wire's vertical travel is
     monotone too unless a node blocks it: new metric `wander` = path
     length ÷ Manhattan distance between its slots, 1.0 unblocked and
     ≤ 1.25 blocked for forward wires. No jog shorter than 2 × radius:
     a near-level pair (|dy| < 2 × radius) is drawn as one smooth
     S-jog, not two tight corners.

## Four sides

Wires are no longer right-to-left only. Each wire picks the pair of
FACING sides from where its two nodes stand, and sockets appear on all
four sides of a node.

With `gx = max(t.left − s.right, s.left − t.right)` and
`gy = max(t.top − s.bottom, s.top − t.bottom)` (box-to-box gaps):

| Situation | Source side → target side |
|---|---|
| `gx ≥ gy`, target to the right | right → left |
| `gx ≥ gy`, target to the left | left → right |
| `gy > gx`, target below | bottom → top |
| `gy > gx`, target above | top → bottom |
| boxes overlap on both axes | right → left (tight loop) |

To keep a wire from flipping sides while a node is dragged across the
diagonal, the choice has hysteresis by construction: prefer the
horizontal pair unless `gy > gx + 24`.

- A wire leaves and arrives perpendicular to its side (first and last
  ~16 units), so the arrowhead points straight into the side.
- The unobstructed curve is one cubic whose control arms run along the
  side normals, `max(40, 0.45 × gap along that axis)`. The unobstructed
  step is three strokes: out along the normal, one channel across, in
  along the normal (vertical–horizontal–vertical for top/bottom pairs).
- Slots are assigned per SIDE, mixing incoming and outgoing wires,
  ordered by the far end's coordinate along that side (x for top/bottom,
  y for left/right), same gap rule as before using the side's length.
- A 2-cycle A ⇄ B is two wires on the same facing sides, in neighbouring
  slots — no loop. `backward` is a direct left → right wire. `stacked`
  is a direct bottom → top wire.
- Named ports (`sourceHandle` / `targetHandle`) stay on the left/right
  sides at their fixed offsets, as today.
- Everything in "What a good wire is" applies with "forward" read as
  "along the chosen axis": monotone along that axis, direct, no
  exterior loops.
- Viewport: a socket dot at every wire endpoint on whichever side it
  lands; top/bottom dots sit mid-depth too. A side whose face is turned
  away from the camera hides its dots and wire ends behind the solid
  (top face visible → bottom dots hidden, and so on). When the node is
  chosen or a connection is in progress, show one connectable dot at
  the centre of each of the four sides; a wire dragged from any of them
  creates the same edge as before (the side is derived, not stored).

## One socket per side (supersedes "Port slots")

Spreading a dot per wire does not scale: ten wires would need ten dots.
Each side of a node has ONE socket, at its centre, however many wires use
it. This replaces rule 4 ("Port slots") and the slot paragraphs above.

- Every wire on a side starts or ends at that side's centre.
- Wires on one side share a **stem**: the first (or last) 14 units run
  along the side's normal, exactly on top of each other, then they fan
  apart smoothly toward their far ends, ordered so they do not cross
  while fanning. The stem is the only place wires may coincide; rule 5
  ("No wire lies on another") exempts it and nothing else.
- One arrowhead shape sits on the stem at an incoming socket; arrowheads
  of wires sharing the socket coincide and read as one.
- Step style: the stem, then each wire turns into its own lane; lanes
  ≥ 10 apart, nested so they do not cross.
- `Wire` no longer reports a slot gap; dots and arrowheads have one
  size (dot radius 3).

## Choosing wires and nodes

- A chosen wire is drawn LAST (on top of every other wire and stem), at
  2.4× stroke, from its source socket to its arrow tip — so it reads as
  one unbroken line through any bundle. Its arrowhead is drawn on top
  too. Nothing else changes colour or size.
- Several things can be chosen at once, wires and nodes mixed:
  Shift+click toggles a wire or a node in the selection; a plain click
  chooses just that one; a click on empty ground clears everything.
  The model carries `chosenEdges?: readonly Edge[]` next to the node
  selection (`activeEdge` stays as the last chosen wire, for waypoint
  editing). Box and lasso selection also take every wire whose two ends
  are both inside.
- `deleteSelected` removes every chosen node and every chosen wire in
  one step. `data-chosen` marks a chosen wire's path for styling/tests.

## Round 4 review — rejected on realistic diagrams; the bar is now the audit

The twelve toy fixtures hid the truth. `scripts/wiring-audit.mjs` routes
seventeen realistic diagrams (a microservice map, a state machine with
self-loops, a top-down org tree, a pipeline with skip connections, a
20-wire hub, a radial map, two linked clusters, mixed node sizes, row and
column skips, diamonds, tight and overlapping nodes, multi-edges, a 5×4
grid, a scatter, a layered DAG) in both styles and detects defects by
geometry. Round 4 scores **130 severe, 256 moderate** (before the
one-socket rule): 61 wires through foreign nodes, 65 overlaps, 89 sibling
crossings, 42 drag jumps, 21 long detours.

**Acceptance is the audit, not the toy fixtures:**

    cd packages/plgg-flow && npm run build && node scripts/wiring-audit.mjs

- `TOTAL sev3` must be **0**. The only tolerated sev3 is inside the
  `overlapping` scenario, for the two nodes that overlap each other.
- `TOTAL sev2` must be **≤ 40** across all 34 runs, with **no**
  `drag-jump` of an *unrelated* wire, no `socket-off-centre-*`, no
  `side-faces-away-*`, no `slow`.
- Look at the sheet it writes (`plgg-flow-example/dist/wiring-audit.html`)
  — red wires are the offenders.
- Do not edit the audit to pass. If a check is wrong, say so in the
  final message with the case, and leave it.

### Why round 4 fails, and the design that fixes it

1. **Avoidance must hold by construction.** Picking the best of ≤ 6
   canned routes goes through a node whenever all six are blocked.
   Route each wire by SEARCH over free space instead, so "through a
   foreign node" is unreachable, not merely penalised:
   - Obstacles are foreign node boxes inflated by `clearance`
     (shrunk only as far as needed when two boxes are closer than
     2 × clearance, so the gap between them stays passable down its
     middle).
   - Step: A* over the sparse orthogonal grid made of the inflated
     boxes' edge lines, the mid-lines of the gaps between neighbouring
     boxes, and the two stems; cost = length + bend penalty + a soft
     cost per crossing of an already-routed wire + a soft cost for
     sharing a lane; then nudge parallel segments apart into lanes.
   - Curve: shortest path through the visibility graph of the inflated
     boxes' corners (tangent graph), from stem end to stem end, then a
     C1 spline through those corners (Catmull-Rom, tangents along the
     chord, corners rounded by pulling the knot outward by `clearance`
     again) — verified against the inflated boxes and re-tightened if a
     bulge re-enters one. Unobstructed it must still collapse to the
     single cubic.
   - Keep it fast: build the obstacle index once per graph; a wire
     whose straight corridor is free skips the search entirely.
2. **One socket per side, with stems** — implement the section above
   ("One socket per side"). Remove slots entirely.
3. **Sides are chosen per node, not only per wire.** A node's outgoing
   wires prefer ONE side, its incoming wires ONE side: take the side
   facing the mean direction of the far ends (the org tree's CEO sends
   all three wires out of its bottom; a left-to-right pipeline uses
   right → left throughout). A wire deviates from its node's preferred
   side only when its far end lies behind that side (more than ~100°
   off the side's normal) — then it takes the side that faces the far
   end. A wire never leaves a side that faces away from its target, and
   never needs to wrap around its own node.
   Self-loops (A → A) leave the right side and return to the top in a
   small rounded loop outside the box; several self-loops nest.
4. **Parallel wires between the same two nodes** share both stems and
   bow apart in the middle (±10 per extra wire), like a lens.
5. **Drag continuity.** Side choice and detour side have hysteresis via
   margins, not history: a choice flips only when the alternative is
   better by a clear margin, and unrelated wires may move only as far
   as lane nudging requires (≤ 14 between consecutive frames of a slow
   drag).

## Node width fits its label

A node without an explicit `width` is as wide as its label needs, with
the same padding on every node: `width = max(64, 8·⌈(text + 32) / 8⌉)`,
`text` estimated at the 13 px label face as 13 per CJK/full-width
character, 7.5 per other character. One function — `nodeSize(node)` in
`src/nodeSize.ts`, exported from `plgg-flow` — is the ONLY place a
default size is decided; replace every `node.width ?? 104` /
`node.height ?? 36` in the package (viewport, nodeBody, wiring, routing,
layout, hierarchy, connections, …) with it. Explicit sizes win.

## Round 5 review — avoidance holds; shape and legibility do not yet

Round 5 reached zero wires through nodes and zero overlaps, sockets are
centred, selection and multi-selection work in the browser. The audit
gained four checks from looking at the sheet (the reviewer's additions,
not negotiable): `diagonal-in-step`, `mixed-socket`, `stiff-curve`, and
crossings inside a shared fan no longer count. It now reads
**70 severe, 355 moderate**. What is wrong, in the order to fix it:

1. **Step wires contain diagonals** (70 severe — `stateMachine · step`
   shows lens-shaped diagonals between Loading and Error). A step wire
   is axis-aligned strokes joined by quarter-circle corners, nothing
   else: no diagonal, no S-blend, including in stems, fans, parallel
   pairs and self-loops. Parallel step wires separate by LANES (offset
   parallel strokes), never by bowing.
2. **A socket mixes arrivals and departures** (116). When incoming and
   outgoing wires share a socket, the arrowhead of the arrivals sits on
   the root of the departures and direction becomes unreadable (see
   `pipelineSkips`). Per node: the side(s) used by outgoing wires and
   the side(s) used by incoming wires are DISJOINT whenever the node
   has a free side to give — choose the outgoing side first (mean
   direction of targets), then the incoming side among the remaining
   three (mean direction of sources), then place deviating wires on the
   side that faces their far end but is not owned by the opposite
   direction. In a left-to-right pipeline: in = left, out = right, and
   a backward wire Ship → Src leaves Ship's top or bottom and arrives
   at Src's top or bottom, arcing over the row. Only a node whose wires
   come from all around (radial hub) may mix, and then as a last
   resort.
3. **Curves are stiff or bowed for no reason** (50 `stiff-curve`,
   40 `kink`, 16 `wiggly`). Many curve wires are a long dead-straight
   run, a tight bend, another straight run — a rounded step, not a
   curve. And an unobstructed single wire bows outward like a lens
   (`cross`: N → U arcs upward though nothing is near). Rules:
   - A wire with a free straight corridor between its stem ends is
     EXACTLY the one cubic (arms along the side normals,
     `max(40, 0.45 × gap)`), whatever its siblings do. Fanning comes
     from the different far ends, not from added bow.
   - A detoured curve spends its length turning gently: via-points are
     joined by cubics whose arms are ≥ 1/3 of the segment length, so
     no piece is a straight line unless the whole wire is straight;
     curvature radius never below 24 except at the stems.
   - No bump or hook: turning must not change sign more than once per
     obstacle passed.
4. **Dragging makes wires jump** (50 `drag-jump`). Run the audit's drag
   sweeps and find each flip. Typical causes: side choice flipping at a
   threshold with no margin, detour side (over/under) flipping, lane
   reassignment renumbering every lane. Fix with margins and stable
   ordering keys (edge index), and make the geometry continuous in node
   position everywhere else.
5. **Remaining crossings between siblings and double crossings**
   (31 + 19): two wires never cross twice; wires sharing an end never
   cross outside their fan.
6. **Speed**: `grid5x4` takes ~12 ms; budget is `max(4, 0.25 × edges)`
   ms cold.
7. **Viewport: thin wires look dotted in the flat view.** A wire is
   drawn as many depth-sorted segments even when the camera is face-on,
   and the 1-unit segments with round caps read as a dotted line. When
   the camera is face-on (pitch = yaw = 0) draw each wire as ONE path
   regardless of its z; keep per-segment depth sorting only for a
   tilted camera, and there overlap consecutive segments by a point so
   no gaps show.

Acceptance: `TOTAL sev3 0`; `TOTAL sev2 ≤ 60` with no `mixed-socket`
outside `radial`/`hub`/`scatter`/`grid5x4`, no `diagonal-in-step`, no
unrelated `drag-jump`, no `slow`.

## Round 6 review — close on structure; shape still not pleasant

Round 6 holds zero severe defects and reads as a diagram: steps are
axis-aligned, the state machine and the trace sample are clean. Looking
at the sheet and the demo, four things a person notices at once were not
measured; the audit now measures them (`wobble-on-straight`,
`excursion`, `awkward-side`; `mixed-socket` is demoted to a note). It
reads **0 severe, 227 moderate**.

1. **A straight wire wobbles** (13). `pipelineSkips · curve`: Src → Parse
   is a level wire between facing sockets with nothing between them, and
   it is drawn with a small wave. Level + facing + free corridor = a
   straight line, exactly. Nothing a sibling does may bend it.
2. **Detours swing far too wide** (25 `excursion`). Skip wires arc
   100–280 units away from their row (Ship → Src dips 280 below). A
   detour clears what it must by `clearance` plus its lane offset and no
   more: over a row of nodes it runs LEVEL at `clearance` above the
   tallest node it passes (next wires at +10 lanes), entering and
   leaving through quarter-turns of radius ≈ 24 — a flat-topped arch,
   not a semicircle. Curve style: same arch, corners as smooth cubics.
3. **Wires take the wrong side and hook back** (83 `awkward-side`).
   `cross` in the demo: N → Lower enters Lower's TOP through a hump
   though Lower's left side faces N. The disjoint in/out rule from round
   5 was applied too hard. New priority, per wire end:
   (a) the side that faces the far end (within 0.35 in cosine of the
   best-facing side), provided the corridor from it is not blocked;
   (b) among those, the side its siblings of the same direction already
   use; (c) only then, a side not used by the opposite direction.
   Mixing arrivals and departures on a socket is ALLOWED when (a) would
   otherwise be violated.
   So that a mixed socket stays readable: an arriving wire's arrowhead
   sits at the END OF ITS OWN FAN — just before the shared stem begins —
   whenever its socket also has departures; on an arrivals-only socket
   it stays at the tip. `Wire` exposes where its arrowhead goes
   (`arrow: { at: Point3; toward: Point3 }`), and the viewport draws it
   there.
4. **Dragging still makes wires jump** (27 `drag-jump`), e.g. moving
   Catalog makes the unrelated Search → Cache jump 82. An unrelated wire
   may change only if the moved node enters its corridor. Route each
   wire against obstacles only (not against other wires' current
   shapes) for its base path; separate wires afterwards with small,
   bounded lane offsets (≤ 14). Crossing reduction may reorder lanes and
   pick over/under, but with a margin so it does not flicker.
5. Still open from round 5: `wiggly` 19, `siblings-cross` 16, `kink` 11,
   `slow` 8 (`grid5x4` ≈ 12–18 ms; budget 6.5 ms).

Acceptance: `TOTAL sev3 0`; `TOTAL sev2 ≤ 60`; zero `wobble-on-straight`,
zero `slow`, zero unrelated `drag-jump`; `excursion` ≤ 5;
`awkward-side` ≤ 10.

## Round 7 review — reads as a diagram; finish the feel

The demo's `cross` is the plain one-crossing figure again, the layered
DAG and the pipeline arches read well. **0 severe, 149 moderate.** What
remains is feel, and it is what a person dragging nodes notices first:

1. **Dragging** (29 `drag-jump`, 14 of them unrelated wires). This is
   the first priority: the product is an editor. Reproduce each with
   the audit's sweep, and remove the discontinuity at its source —
   base paths depend on obstacles only; when a moved node enters a
   wire's corridor the wire should start bending as the node
   approaches (clearance grows smoothly from 0), not snap to a
   different route at one frame; choices between over/under and
   between sides carry a margin of at least 24 units.
2. **Speed** (10 `slow`): `grid5x4` 10–15 ms vs 6.5 ms. During a drag
   only the wires whose corridor or endpoints the moved node touches
   need re-routing: cache each wire's base path keyed by its own two
   nodes' boxes and the set of obstacle boxes intersecting its
   corridor; reuse everything else.
3. **Wiggle, kinks, needless loops** (22 `wiggly`, 13 `kink`,
   `microservices`: Gateway → Auth leaves the right side, swings left
   and climbs — it should leave toward Auth). After routing, run a
   straightening pass: drop any via-point whose removal keeps the wire
   clear, then rebuild the spline; never leave a turn that reverses
   within 40 units.
4. **Crossings that ordering can remove** (21 `siblings-cross`,
   10 `double-cross`, 10 `more-crossings-than-straight`): order a fan's
   branches by the angle of their far ends; two wires that cross twice
   swap their detour sides.
5. **Sides** (11 `awkward-side`), clearance (5 `grazes-node`,
   5 `hugs-own-node`).

Acceptance: `TOTAL sev3 0`; `TOTAL sev2 ≤ 60`; zero `slow`; zero
unrelated `drag-jump` and ≤ 6 own.

### Addendum to round 7 review (found by using the demo)

6. **Close neighbours squash their wire.** With nodes ~26 apart
   (`配線をたどる` after dragging Stock next to Ship) the wire between
   them squiggles and its arrowhead collides with the fan. Stems, fan
   length, arrowhead size and corner radius scale down with the
   available gap: stem ≤ gap / 3, and a wire between facing sockets
   closer than 60 is a plain short S (or a straight line when level).
   New audit scenario `closePairs`, new check `squashed-short-wire`.
7. **Wires must not move while a connection is being dragged.** In the
   demo, starting a connection from Order makes the existing
   Order → Stock wire bulge until the drag ends. A connection in
   progress (`state.source` / connect drag) changes no existing wire;
   only the dashed preview follows the pointer.
