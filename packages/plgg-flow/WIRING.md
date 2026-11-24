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

## Round 8 review — 0 severe, 90 moderate; three things left to feel right

Speed is met, `microservices` is down to its straight-line minimum of
five crossings. Using the demo, the two addendum items above (6: close
neighbours squash their wire; 7: wires move while a connection is being
dragged) are both still present — do them first, they are what a person
hits in the first minute. Then:

- **Dragging** (23 `drag-jump`). The remaining jumps are side flips
  (Search → Cache switching its target side when Catalog moves). A side
  flip is allowed only for the dragged node's own wires, and it must be
  *blended*: within a 24-unit band around the flip threshold, emit the
  route of the side being left, so the flip happens once and far from
  where the hand is hovering — never back and forth, and never on a
  wire neither of whose nodes moved unless the moved node now blocks
  it.
- **Wide swings** (6 `excursion`, e.g. Audit → Gateway 194 outside its
  span) and **entering from above for no reason** (7 `awkward-side`,
  Catalog → Cache).
- **Leftover shape** (9 `kink`, 7 `wiggly`, 5 `stiff-curve`,
  3 `squashed-short-wire`) and **clearance** (5 `grazes-node`,
  5 `hugs-own-node`), **crossings** (9 `siblings-cross`, 2
  `double-cross`).

Acceptance: `TOTAL sev3 0`; `TOTAL sev2 ≤ 45`; zero unrelated
`drag-jump`; zero `squashed-short-wire`; zero `slow`; and in the demo,
existing wires do not change while a connection is dragged (add a
viewport spec: the wires computed with a connect drag in progress equal
the wires computed without it).

## Round 9 review — 53 moderate, but routes now depend on history: rejected

Item 7 is fixed (wires are byte-identical before and during a connect
drag) and moderate defects fell to 53. But the drag-jump work bought
smoothness with memory: after dragging Stock next to Ship in the demo,
Order → Stock stays bulged upward, while the same graph routed fresh
draws it straight. The audit now compares the last frame of every drag
sweep with a fresh routing of the identical graph (new node and edge
objects): **54 `history-dependent`, severe.**

**Hard rule: `wireGraph` is a pure function of the graph's values.**
Same node positions/sizes and same edges ⇒ same wires, whatever was
routed before, whatever object identities are passed. Caches may only
memoise that pure function (key = the values a wire's route depends on),
never carry state from one graph to the next: no "side being left", no
remembered detour side, no previous-frame blending.

Continuity then has to come from geometry alone:
- Choices (side, over/under, lane order) are decided by scores that are
  continuous in node position, with ties broken by stable keys. A flip
  happens at one position and is the same flip in both directions.
- Make the *shapes on both sides of a flip close to each other* so the
  flip is small: near the threshold where a wire would change side,
  both candidate routes should approach the same curve (e.g. as the far
  end crosses a node's diagonal, the wire leaves from near the corner
  on either side). Where that is impossible (over vs under an
  obstacle), the flip is accepted.
- An unrelated wire changes only when the moved node enters or leaves
  its corridor; as the node approaches, clearance pushes the wire
  gradually (soft margin), so by the time the node would block it the
  wire has already moved aside.

Acceptance: `TOTAL sev3 0` (so zero `history-dependent`);
`TOTAL sev2 ≤ 60`; `drag-jump` on unrelated wires ≤ 5 and each explained
by the moved node entering that wire's corridor; zero `slow`,
`squashed-short-wire`, `wobble-on-straight`, `diagonal-in-step`.
Add a spec: route graph G1, then G2, then G1 again with fresh objects —
the two G1 results are deep-equal; and routing G2 first changes nothing.

## Round 10 review — pure again, 27 static defects; dragging is the last wall

`history-dependent` is zero and the static picture is close (27 moderate
static defects over 36 runs). Every drag sweep still reports a jump
(54): 31 on the dragged node's own wires, 23 on unrelated wires — one of
them 372 units away from the moved node (`scatter`: dragging `s14`
changes both sockets of `s2 → s15`).

**Locality is the rule that fixes this.** A wire's route may depend on:
(a) its own two nodes; (b) the other wires on its two sockets (fan
order); (c) the nodes whose inflated boxes intersect its corridor — the
box spanned by its two sockets grown by `2 × clearance`, or by its
detour when it has one; (d) wires it shares a lane with inside that
corridor. NOTHING else. In particular:
- A node's side assignment depends only on that node and the nodes its
  own wires go to — never on a global pass, a global ordering, or how
  many wires another node has.
- Crossing reduction and lane assignment work on connected components
  of "corridors that intersect", not on the whole diagram, and lane
  order inside a component is keyed by the wires' own geometry (socket
  coordinates, then edge order), so an unrelated edit cannot permute
  it.
- Moving a node therefore changes only wires in (a)–(d) relative to its
  old or new position.

**Own-wire flips must be small.** When a dragged node's wire changes
side, the shapes before and after the flip should nearly coincide:
around the flip threshold (far end near the node's diagonal), route the
wire out of the side *near the corner* it is about to cross — i.e. let
the socket slide along the side toward that corner within the last 30°
before the flip, on both sides of the threshold — so the flip moves the
wire by a few units, not by half a node. (This is the one place a
socket may leave the centre: `socket-off-centre` in the audit tolerates
it only if you report it; the reviewer will adapt the check.)
If sliding sockets proves worse than it sounds, the alternative is to
keep sockets centred and accept own-wire flips, but then unrelated
wires must be perfectly still.

Acceptance: `TOTAL sev3 0`; unrelated `drag-jump` ≤ 3, each with the
moved node inside that wire's corridor at the jump; static moderate
defects (everything except `drag-jump`) ≤ 25; zero `slow`.
Add a spec for locality: in a two-cluster graph, moving a node of one
cluster leaves every wire of the other cluster deep-equal.

## Round 11 review — the architecture decision that ends the drag jumps

Round 11 made routing local per corridor component and fixed the three
new checks (`siblings-disagree-on-side`, `awkward-side`,
`runs-too-close` are all zero). But `drag-jump` is unchanged at 54 (27
unrelated), and static defects rose to 81. Codex's own analysis names
the cause: 25 of 27 unrelated jumps keep both sockets — the wire changes
its *path between fixed ends* because lane and detour choices react to
other wires.

**Decision (the reviewer's, final): two layers, and only the second
sees other wires.**

1. **Base path — obstacles only.** A wire's base path is computed from
   its own two nodes, its two sides, and the foreign node boxes — and
   nothing else. No other wire's shape, no crossing count, no lane
   occupancy may influence which way it goes around a node or which
   via-points it takes. The detour side (over/under, left/right of an
   obstacle) is chosen by the shorter clear path, with a margin, and a
   stable tie-break. Result: a wire's base path changes only when a
   node enters, leaves, or moves within its own corridor.
2. **Separation — bounded offsets on top.** Other wires may affect a
   wire only through: (a) fan order at a shared socket; (b) lane order
   among wires whose base paths run along the same channel — each lane
   offset is a parallel shift of that stretch, at most ±14 from the
   base path (compress the lane pitch when a channel is crowded rather
   than exceeding 14); (c) the lens for parallel wires between the same
   two nodes. Crossing reduction happens ONLY here, by choosing fan and
   lane orders. It never changes a base path.

Consequences to accept: a few more crossings than a global optimiser
would find; that is the price of wires that stay still while an
unrelated node is dragged, and it is the right trade for an editor.

With that in place, an unrelated wire can move by more than 14 only
when the moved node is inside its corridor — the allowed case.

Then the static leftovers, all per-wire and now independent of each
other, so each fix stays fixed: 19 `siblings-cross` (fan order by far-
end angle), 12 `kink`, 11 `grazes-node` (inflate by full clearance;
shrink only in gaps narrower than 2 × clearance, to the middle),
9 `wiggly`, 4 `wobble-on-straight`, 4 `hugs-own-node`.

Acceptance: `TOTAL sev3 0`; unrelated `drag-jump` ≤ 5; static moderate
defects ≤ 35; zero `slow`, `wobble-on-straight`, `diagonal-in-step`,
`squashed-short-wire`, `siblings-disagree-on-side`, `awkward-side` ≤ 5.
Add a spec: for a wire W and any other wire V not on W's sockets,
removing V from the graph moves no point of W by more than 14.

## Round 12 review — right architecture, wrong bound (the reviewer's mistake)

Two-layer routing cut unrelated drag jumps from 27 to 12, proving the
direction — but static quality collapsed (35 overlaps, 85
`siblings-cross`, 50 `double-cross`). The cause is the reviewer's own
±14 cap on lane offsets: in a crowded channel the wires cannot get out
of each other's way. **The cap is withdrawn.** What stays:

1. **Base path — nodes only** (unchanged): sides, via-points and detour
   side depend on node boxes alone.
2. **Separation — lanes, as many as needed.** Wires whose base paths
   share a channel are spread into lanes at pitch 10 (compressed toward
   6 only when the channel is physically too narrow), centred on the
   base path, however many lanes that takes. A lane shift moves the
   whole parallel stretch and its two corners, keeping clearance from
   nodes (the channel was inflated-box-free; if lanes spill into a
   node's clearance, push the whole bundle away from that node).
   Order lanes and fans to remove crossings: two wires in one channel
   are ordered by where they LEAVE it (the one turning off first takes
   the lane on the side it turns to), fans by far-end angle — the
   classic rules that make bundles untangle with zero crossings among
   wires that need not cross. No two wires may end up collinear.
3. Parallel pairs: lens, as before.

The audit's drag check was also refined after inspecting its hits: a
jump is no longer a defect when the moved node is in that wire's way
(`flip-around-moved-node`, a note) or when the wire belongs to the moved
node (`own-flip`, a note). Defects are `drag-jump` (truly unrelated) and
`drag-jump-neighbour` (the wire shares a node with one of the moved
node's wires — it may shift by a lane or two, not reroute).

Baseline to beat is round 11: `TOTAL sev3 0`, static moderate 81,
`drag-jump` 19, `drag-jump-neighbour` 31.

Acceptance: `TOTAL sev3 0` (zero `overlap`); static moderate ≤ 60;
`drag-jump` ≤ 5; `drag-jump-neighbour` ≤ 12; zero `slow`,
`wobble-on-straight`, `diagonal-in-step`, `squashed-short-wire`,
`siblings-disagree-on-side`, `history-dependent`.

## Round 13 review — dragging solved; now make the bundles tidy

Two-layer routing with uncapped lanes: `sev3 0`, `drag-jump` 4,
`drag-jump-neighbour` 13 — the drag targets are essentially met. Static
quality is the price so far: 226 moderate (round 11 had 81):
78 `siblings-cross` (57 in step), 29 `double-cross` (27 in step),
45 `kink` (all curve), 31 `wiggly`, 16 `more-crossings-than-straight`.
All of these live in layer 2 or in per-wire smoothing — none needs a
base path to change. Fix them there:

1. **Step fans and lanes cross because order is wrong, not because
   they must.** For the wires leaving one socket (same for arriving):
   sort by the direction each wire turns at the end of the stem and
   then by how far it travels before turning — wires turning "up" take
   the upper lanes with the one that travels FARTHEST along the stem
   axis turning LAST and lying OUTERMOST; mirror for "down"; straight-
   ahead wires sit in the middle. Within a shared channel, two wires
   are ordered by their entry and exit sides so that they nest (the
   wire that enters first and leaves last is outermost). Two wires that
   cross twice are, by definition, mis-ordered in a channel they share:
   swap them. After ordering, verify per pair and repair with adjacent
   swaps until no removable crossing remains (bounded passes).
2. **Curve kinks** come from joining pieces without matching tangents,
   or from lane shifts applied to a spline's control points piecewise.
   Apply the lane offset to the base polyline FIRST, then fit ONE
   C1 spline through the shifted via-points (Catmull-Rom with chord
   tangents, arm ≥ 1/3 of each piece, horizontal/vertical only at the
   stems). No post-hoc nudging of spline points.
3. **Wiggle**: after lane shifting, drop via-points that are collinear
   within 2 units or whose removal keeps clearance; a wire never has
   two turns in opposite directions within 40 units unless an obstacle
   sits between them.
4. Keep the drag numbers: nothing in 1–3 may read other wires for base
   paths.

Acceptance (to adopt this architecture over round 11): `TOTAL sev3 0`;
static moderate ≤ 81 (target ≤ 60); `drag-jump` ≤ 5;
`drag-jump-neighbour` ≤ 15; the zero-kinds stay zero.

## Round 14 review — adopted

Two-layer routing now matches round 11's static quality (81 moderate)
with dragging essentially solved (`drag-jump` 3, `drag-jump-neighbour`
15), `sev3 0`. `microservices` draws at its five-crossing minimum, the
org tree leaves every parent from the bottom, and in the demo a wire no
longer bulges after a drag. This is the committed architecture.

Left for round 15, all polish inside layer 2 / per-wire shape:

1. **Step fans show a wedge.** Where several step wires leave one
   socket, the first few units are drawn as short diagonals converging
   on the socket (`microservices · step`: Web/Mobile → Gateway, Queue's
   outputs). The audit's diagonal threshold was tightened to 7 units:
   6 `diagonal-in-step`, severe. A step fan is orthogonal too: the
   shared stem runs straight out along the normal; each wire leaves it
   with a quarter-circle into its own lane at a different distance
   along the stem (nearest lane turns first), like a bus. If the stem
   is too short for all the turns, lengthen the stem (up to gap / 2)
   before compressing the pitch.
2. `siblings-cross` 26 (12 in `diamonds` and `grid5x4`),
   `double-cross` 8, `more-crossings-than-straight` 8.
3. `wiggly` 18 (15 step: an elbow that buys nothing — remove it when
   the straight continuation keeps clearance and adds no crossing).
4. `kink` 5 (3 in `tight`), `grazes-node` 6, `hugs-own-node` 4,
   `runs-too-close` 3.
5. `drag-jump-neighbour` 15: a neighbour may shift by lanes, not
   re-route.

Acceptance: `TOTAL sev3 0`; static moderate ≤ 55; `drag-jump` ≤ 3;
`drag-jump-neighbour` ≤ 10; zero kinds stay zero.

Note on specs: wall-clock assertions in `wiring.spec.ts` were loosened
to blow-up guards by the reviewer (CI runners are slow; eight commits
went red on a 15 ms assertion). Keep time budgets in the audit only.

## Round 15 review — adopted; the step hub regressed in looks

`sev3 0`, static moderate 72, `drag-jump` 3, `drag-jump-neighbour` 10.
Step wedges are gone (`microservices · step` is clean and orthogonal).

One visible regression the numbers under-report — `hub · step`: twelve
wires arriving at Hub's left socket now pile into a narrow vertical
trunk a few units apart right in front of the socket, with jogs
(in4/in5/in6/in7) and crossings (in0, in9, in10). The bus rule was
right for the *stem* but wrong for the approach. The rule for a step
fan with many wires, stated fully:

- The shared stem is short (≤ 14) and straight.
- Each wire then has exactly ONE vertical run (for a left/right socket)
  in its own lane, and the lanes NEST: the wire whose far end is
  farthest above the socket takes the lane farthest from the node,
  the next one the next lane inward, and so on; same below, mirrored.
  The wire level with the socket goes straight in. Lane pitch 10
  (compress toward 6 when the gap to the nearest far-end node is too
  small). Result: concentric L-shapes, zero crossings, no jogs — what
  the `fanIn` toy fixture has always looked like.
- A wire's horizontal run from its far end meets its lane with one
  corner. No second jog unless a node blocks the run.

Also still open: `siblings-cross` 24, `wiggly` 15,
`more-crossings-than-straight` 11, `runs-too-close` 5, `grazes-node` 5,
`hugs-own-node` 4, `kink` 3, `double-cross` 3.

Acceptance: `TOTAL sev3 0`; static moderate ≤ 50; `hub · step` and
`hub · curve` with zero sev2; drag kinds no worse (3 / 10).

## Round 16 review — adopted

`sev3 0`; static moderate 48; `hub` clean in both styles (concentric
L-shapes, zero crossings); `drag-jump` 3, `drag-jump-neighbour` 9.
Open, in order of how visible they are: `siblings-cross` 15 (mostly
`grid5x4`, `diamonds`), `wiggly` 13 (step elbows), 9 neighbour drag
jumps, `hugs-own-node` 4 and the `overlapping` scenario's A → B, which
has to wrap two intersecting cards.

## Round 16, second look — the speed numbers were an illusion; this is now the priority

CI caught it: the spec "40 cards and 60 wires route within a frame"
failed at its 500 ms blow-up guard. Measured locally: the step style
takes ~800 ms for that graph. The audit had reported `slow: 0` since
round 8 only because the router's value-keyed cache answered the
audit's repeated timing calls. The audit's timing was the reviewer's
flaw and is fixed:

- `slow-cold`: each timing run shifts every node slightly, so nothing
  can be remembered. Budget `max(30, 1.0 × edges)` ms; severe above 4×.
- `slow-drag`: every frame of the drag sweeps is timed (one node moves
  2–4 units per frame — exactly what an editor does). Budget 8 ms at
  the 90th percentile; severe above 32 ms. Step sweeps are now run too
  (one short sweep per scenario while it is this slow).
- New scenario `big40x60` (40 cards, 60 wires).

Measured on the committed round 16:

| | curve | step |
|---|---|---|
| cold, worst | 63 ms (`grid5x4`) | 1032 ms (`hub`), 890 (`layered`), 525 (`grid5x4`) |
| drag frame p90, median over scenarios | 16 ms | 229 ms |
| drag frame p90, worst | 76 ms (`grid5x4`) | 1345 ms (`layered`) |

`TOTAL sev3 36` (all `slow-*`), `slow-drag` 65, `slow-cold` 19.
Dragging a node in the step style is unusable, and in the curve style
it stutters. Nothing else matters until this is fixed.

**What to do**

1. **Profile first** (`node --cpu-prof` on a script that routes
   `layered`, `hub` and `big40x60` in step style and replays a drag);
   fix what the profile shows, not what seems likely. Suspects: lane
   nesting or crossing repair doing pairwise work over ALL wires
   (should be per channel component, and pairwise only within one
   channel); re-sampling dense polylines inside loops; A* without a
   spatial index or rebuilding the grid per wire; splines re-fitted
   repeatedly; `Array.includes`/`find` in hot loops; JSON/string keys
   built per call.
2. **Algorithmic bounds to hold**: with N nodes, E wires, and K wires
   in the busiest channel — obstacle index built once per graph
   O(N log N); each base path O(grid-local) with no dependence on E;
   lane and fan ordering O(K log K) per channel/socket, plus adjacent-
   swap repair bounded by a small constant number of passes; emitting
   points O(length).
3. **Incremental drags**: memoise per wire on the VALUES it depends on
   (its two nodes' boxes and sides, the boxes intersecting its
   corridor); memoise layer 2 per channel component on the base paths
   in it. Moving one node then recomputes only the base paths whose
   key changed and only the components those wires belong to. Keep it
   pure (value keys only; bounded size, e.g. LRU of a few thousand
   entries).
4. No quality regression: static moderate stays ≤ 55, the drag-jump
   kinds no worse, zero kinds stay zero.

Acceptance: zero `slow-cold` and zero `slow-drag` in every scenario and
both styles (so `TOTAL sev3 0`); `big40x60 · step` cold ≤ 60 ms; the
spec's 500 ms guard passes with a wide margin on a slow machine.

## Round 17 review — adopted; 20× faster, not yet at budget

Profile: 92 % of time was layer-2 separation (conflict scoring 35 %,
contour profiling 18 %, shortcut generation 14 %, self-crossing checks
11 %). After a shared obstacle index, value-keyed caches per wire and
per channel component, and early-exit scoring:

| | curve | step |
|---|---|---|
| cold, worst | 25 ms | 56 ms (`grid5x4`) |
| drag frame p90, median | 5.7 ms | 9.4 ms |
| drag frame p90, worst | 25–32 ms | 51 ms (`grid5x4`) |

`big40x60 · step` cold 11 ms (was ~800). Static moderate 53. Remaining:
25 `slow-drag` (15 curve, 10 step), 3 `slow-cold`, and with step sweeps
now counted `drag-jump` 7, `drag-jump-neighbour` 21.

Round 18: (1) drag frames to budget — the dragged node's own wires and
the components they touch are the only work a frame should do; trying
lane offsets by repeated scoring is the remaining cost: compute lane
order once per component by sorting (entry/exit keys), not by trial;
(2) the step-style drag jumps (4 new unrelated, 12 new neighbour);
(3) leftovers: `siblings-cross` 19, `wiggly` 16.
Acceptance: zero `slow-cold`; `slow-drag` ≤ 5, none above 16 ms;
`drag-jump` ≤ 5; `drag-jump-neighbour` ≤ 14; static moderate ≤ 55.

## Round 18 review — adopted; the frame, not just the router

Audit: `sev3 0`, zero `slow-cold`, drag frames ≤ 17 ms worst (median
4–5 ms), static moderate 52, `drag-jump` 5; open: `slow-drag` 16,
`drag-jump-neighbour` 20 (traced: M → d keeps its base path, shifts 10
in lane assignment, then jumps 68 in *shortcut selection* — shortcuts
are a wire-dependent reroute hiding in layer 2; a shortcut may only be
taken if it is also valid with the wire alone on the sheet, i.e. decide
it in layer 1).

Measured in the browser on the demo (15 cards, 23 wires, dragging
Orders): frame time median 1.6 ms but **p90 33 ms (curve) / 47 ms
(step)** — the drag stutters. `scripts/drag-bench.mjs` shows why from
Node: every frame costs 7–10 ms (curve) / 10–14 ms (step) inside
`flowView` even when `wireGraph` was just called with the same nodes —
the view's call does not hit the router's cache (its scene nodes differ
in value or it rebuilds keys expensively), and then the whole SVG tree
is rebuilt and diffed.

Round 19, in order:
1. `flowView` during a drag: make the router's memo hit for wires whose
   inputs did not change (check what `scene.nodes` passes — strip
   anything the router does not depend on before keying), and make key
   construction cheap (no JSON of whole graphs per frame).
   Target in `drag-bench.mjs`: `flowView` p90 ≤ 4 ms for both styles.
2. Stop rebuilding what did not change: plgg-view has `lazy`
   (`Html/model/element.ts`) — a subtree whose argument is `===` the
   previous one is skipped by the diff. Give each wire's path group and
   each node's group a `lazy` keyed by a stable object (the cached
   `Wire`, the node object) so a drag frame only re-renders the moved
   node and the wires that changed. Keep painter-order sorting working
   for a tilted camera (lazy per layer item is fine).
3. The shortcut rule above, to cut `drag-jump-neighbour`.
4. Leftovers: `siblings-cross` 19, `wiggly` 12.

Acceptance: `drag-bench.mjs` `flowView` p90 ≤ 4 ms (curve and step);
audit `sev3 0`, `slow-drag` ≤ 5, `drag-jump-neighbour` ≤ 14, static
moderate ≤ 55, `drag-jump` ≤ 5; all specs pass; a spec asserting that
two consecutive `flowView` calls with one node moved return `===`
lazy arguments for an unrelated wire.

## Round 19 review — adopted; the remaining frame cost is the renderer

`drag-bench` `flowView` p90: 10.2 → 1.3 ms (curve), 14.9 → 0.9 ms
(step). Audit unchanged in quality (`sev3 0`, static 53).

In the browser the drag frame went 30 → 21–22 ms only after the
reviewer fixed the demo: it built a fresh `mapHtml` function every
frame, and plgg-view compares `messageMaps` by identity, so no lazy
subtree was ever skipped (now one module-level mapper and one node
renderer). A CPU profile of 60 drag frames (15 cards, 23 wires, 290
SVG elements) then shows 1211 ms in `paint`, of which ~600 ms is
plgg-view's `render` (diff/patch) and most of the rest the view
function; the hot self-time is plgg's `match` machinery (`isAtomic`,
proxy `get`, the `attr$`/`handler$`/`anim$`/`eventHandler$`/`host$`
pattern constructors) — i.e. per-vnode and per-attribute dispatch by
pattern matching. Router functions are negligible (`measureConflict`
26 ms total).

Round 20 — get a drag frame under 8 ms in the browser:
1. plgg-flow: everything `flowView` emits that does not depend on the
   moved node must sit behind a `lazy` with a stable argument — ground
   plane and grid (camera only), guides, group frames, labels, arrow-
   heads, sockets of unmoved nodes. Check with a spec that counts how
   many non-lazy vnodes `flowView` returns at the top level for a
   20-node sheet (should be a handful).
2. plgg-flow-example: wrap the sidebar, header, toolbar and DSL panel
   in `lazy` with stable arguments so a drag frame does not rebuild
   them (the DSL text does change while dragging — keep it live, but
   key it on the flow only).
3. plgg-view (allowed this round, narrowly): in
   `src/Program/usecase/render.ts` and the attribute/vnode dispatch it
   calls, replace `match(...)` over pattern constructors in the hot
   diff/patch path with a direct `switch` on the discriminant tag,
   and avoid constructing pattern objects per call. Behaviour must be
   byte-identical: all plgg-view specs pass unchanged, no API change.
   Measure before/after with a Node micro-bench that diffs two
   290-element SVG trees (keep the bench out of the repo or under
   `packages/plgg-view/scripts/`).

## Round 20 review — adopted; drags fit a 60 fps frame

plgg-view's diff/patch dispatches on `__tag` with exhaustive switches
(13 functions in `render.ts`; 290-element SVG diff 12.3 → 0.6 ms in the
package's Node test DOM), `flowView` keeps everything unrelated to the
moved node behind `lazy`, and the demo's chrome is lazy too. Measured
in the browser on the 15-card / 23-wire sheet, per pointer move:
curve 11.6 ms median / 13.6 p90 (was 30), step 14.0 / 15.7, a
lightly-wired node 9.2 / 11.2. The remaining cost per frame is the
router re-routing the moved node's own wires (6–10 ms).

Open: frame budget of 8 ms not yet met (router: own wires of the moved
node); audit `slow-drag` 12; `drag-jump-neighbour` 18; static moderate
53 (`siblings-cross` 18, `wiggly` 14).

## Round 21 review — adopted; the named scenes read better, step in dense sheets does not

Reviewer first tightened the audit: on a fat span a wire that strays
more than 30u outside the box of its own two nodes is a moderate
`excursion` (the diamond humps were only a note before).

Seen on the contact sheet: `pipelineSkips` 4 → 2 crossings (the
two-page minimum), arcs nested by span; `diamonds` curve a→f / c→d
pass M as one S inside their span; `selfAndMulti` bundles are centred
on the chord, C→B enters B from below, no crossings; `siblings-cross`
18 → 2 (both in `overlapping`).

Not good enough, carried to round 22:
- step style in dense sheets (`grid5x4` 15 moderate, `clusters` 8):
  `wiggly` 14 → 19, `double-cross` 2 → 6.
- `siblings-disagree-on-side` 0 → 10: diamonds/step sends a→M out of
  a's bottom while a→d, a→f leave its right. Allowed only when the
  facing side is blocked; here it is a workaround.
- the curve bundle is a flat-topped hexagon, not a lens of arcs.
- drag: `drag-jump` 5 → 8, `drag-jump-neighbour` 18 → 20; clusters
  a1→a4 still flips sides (102u) when a3 narrows the passage.
- total moderate 93 → 93: the gain in looks is not a gain in count.

## Round 22 review — adopted; moderate 93 → 81

Confirmed by the reviewer's own audit run: `siblings-disagree-on-side`
10 → 0, `double-cross` 6 → 3, `selfAndMulti` curve bundle is a lens of
single arcs, the clusters a1→a4 102u flip is gone. sev3 0, excursion 0,
192 specs.

Open, as seen on the sheet:
- `diamonds` curve: S→T humps over b and then dips under M — one wire
  with two bulges; it should pass M on one side only.
- step in dense sheets still tangles (`wiggly` 18; grid5x4, clusters).
- drag: `drag-jump-neighbour` 20, `drag-jump` 7. Codex's own count:
  of 910 jumps > 30u over all sweeps, 528 start at socket
  reassignment — the side choice, not the router, is the main source.
- `slow-drag` 16 (budget 8 ms; frames fit 16 ms).

## Curve shape — reset after the user's review ("too many slight curves, it looks wavy; an approximation is fine")

The reviewer's design was wrong for curves: a searched polyline,
smoothed, then pushed sideways for clearance from other wires gives
every wire its own irregular shape. The audit did not measure shape,
so it reported progress while the sheet looked wavy. Round 23 was
stopped (its partial work is in `git stash`, "round23-partial").

The rule from now on, in this order of priority:

1. **The canonical wire.** A curve is ONE cubic Bézier from socket A
   to socket B with control points on the socket normals:
   `P1 = A + nA·c`, `P2 = B + nB·c`, `c = clamp(0.45·|AB|, 24, 160)`.
   If that cubic clears every node (10u from foreign nodes; own nodes
   away from the stems), the wire IS that cubic. No lanes, no pushes,
   no repair may alter it. Wires from one socket then fan out by
   themselves, all with the same family of shape.
2. **Level facing sockets** with a free corridor: a straight line
   (the cubic degenerates to it).
3. **Blocked canonical.** Add the fewest via points (one, rarely two)
   beside the blocking node at clearance, and draw one cubic per span
   with tangent continuity. The result bends in one direction (C) or
   changes direction once (S). Never more. Approximate clearance is
   fine; uniform shape beats uniform distance.
4. **Bundles** (several wires between the same two nodes, incl. both
   directions): symmetric arcs about the chord, as built in round 22.
   This is the only case where other wires change a curve.
5. Crossings between curves are accepted as they fall. Side choice
   (which socket) is the lever for crossings, not the curve's shape.

Audit kinds added (curve style, moderate): `not-canonical` (the plain
cubic is free but the wire is > 14u off it) and `snake` (the bend
direction changes more than once). Baseline on round 22 code:
`snake` 84, `not-canonical` 55.

## Round 24 review — adopted as the new base for curves

Free wires are now the plain cubic: `not-canonical` 55 → 0, `snake`
84 → 7, curve drags no longer move unrelated wires
(`drag-jump-neighbour` 13 → 0 for curves), 1350 lines of spline code
gone, cold time halved. On the sheet the ordinary wires finally look
alike.

The audit was recalibrated by the reviewer: curves that share a socket
and part by themselves are a fan (`fan-overlap`, a note), an `overlap`
only if they stay together for 40 % of the shorter wire.

What the reset broke (sev3 16, moderate 182), for round 25:
- **Blocked wires** (via points): pretzels and dents — diamonds a→f,
  c→d loop back on themselves; microservices Gateway→Search snakes;
  S→T has a dent at its start. Cubic spans through a via do not work.
  New rule: a blocked wire is a *soft polyline* — short stem along the
  socket normal, straight runs between the fewest via points, joined by
  large circular fillets (radius up to 40, never more than half the
  shorter adjoining run). No cubic spans.
- **Arches** (both sockets on the same side, e.g. row skips): all the
  same height, so they overlap and cross (`pipelineSkips` 2 → 8
  crossings, `excursion` 27). Arch height must grow with span so
  arches nest: `c = 24 + 0.13·|AB|` for same-side sockets (the audit's
  canonical check does not apply to these — see below).
- **Siblings crossing** (43) and `double-cross` (21): the lever is the
  side of the far socket, not the curve.

## Round 25 review — adopted

Seen on the sheet: arches nest by span (`pipelineSkips` back to 2
crossings), the pretzels are gone (diamonds a→f, c→d are plain cubics
via another side), `not-canonical`, `excursion`, `grazes-node` 0.
microservices, pipelineSkips, diamonds, orgTree read cleanly.

Open:
- the side retry picks odd sides to stay canonical: S→T leaves S's
  top, Idle→Loading leaves Idle's top and curls in from below, hub
  out4 enters from the top (`awkward-side` 15). Retry should prefer a
  soft polyline on the facing sides over a canonical cubic on a side
  that faces away by more than 45°.
- soft polylines are counted as `stiff-curve` (32) by the audit — the
  check predates them and needs recalibrating by the reviewer; but in
  `hub` a fan mixes cubics and polylines, which does look uneven.
- drag: `drag-jump-neighbour` 18, `drag-jump` 6 (side retry depends on
  blocking boxes, so a passing node flips sides).
- dense sheets (grid5x4, scatter) remain busy: that is placement, the
  subject of the layout work that follows.
