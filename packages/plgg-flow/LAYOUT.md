# Auto layout — nodes and edges in, a readable sheet out

Wiring (WIRING.md) answers "given where the nodes are, how do the
wires run". This answers the step before it: the author writes only
nodes and edges, no coordinates, and gets a diagram they would have
drawn by hand. Placement decides most of how a diagram looks; the
dense sheets the wiring audit could never make calm are placement
problems.

The acceptance tool is `scripts/layout-audit.mjs` (reviewer-owned):
14 diagrams without coordinates, laid out rightwards and downwards,
defects detected, contact sheet at
`plgg-flow-example/dist/layout-audit.html`.

## API

A new entry `plgg-flow/autoLayout` (add it to `bundle.config.ts` and
`package.json` exports like `layout`):

```ts
type LayerOptions = Readonly<{
  direction?: "right" | "down"; // default "right"
  depth?: boolean;              // default false
}>;
type LayerPlan = Readonly<{
  graph: Graph;                          // same nodes/edges, positions set
  layers: ReadonlyMap<string, number>;   // node id -> layer, 0-based
  reversed: readonly number[];           // indices into graph.edges drawn against the flow
}>;
planLayers(graph: Graph, options?: LayerOptions): LayerPlan
layeredLayout(graph: Graph, options?: LayerOptions): Graph // = planLayers(...).graph
```

Pure and deterministic: the result depends on the set of nodes and
edges (ids, sizes via `nodeSize`), not on the order they are listed
in and not on previous positions. Node order in the returned graph is
the input order.

## What a good layout is (the method is the classic layered one)

1. **Flow has one direction.** Break cycles by reversing as few edges
   as a good heuristic finds (greedy feedback arc set; self-loops are
   ignored). Every other edge goes from a lower layer to a higher one.
   Edges in `reversed` are simply drawn backwards; nodes are not moved
   for them.
2. **Layers.** Assign layers so the total edge span is small (network
   simplex or longest path followed by pulling nodes toward their
   neighbours), not just longest path — a source feeding only layer 3
   sits in layer 2, not 0.
3. **Order within layers.** Long edges get virtual nodes in the layers
   they pass. Minimise crossings with median/barycentre sweeps plus
   adjacent transposition, several deterministic starts, keep the
   best. Trees and planar flows must come out with 0 crossings.
   Ties are broken by id so the input order does not matter.
4. **Coordinates.** Layers are straight lines, spaced by the widest
   node in each layer plus a gap (main-axis gap 96, cross-axis gap 40
   between boxes). Within a layer, positions follow Brandes–Köpf or a
   priority method with the same effect: a chain of single in / single
   out nodes is a straight line; a parent sits centred over its
   children; virtual nodes of one long edge line up so the wire is
   straight; nothing overlaps; sizes vary and are respected.
5. **Components** are laid out separately and packed along the cross
   axis, largest first; isolated nodes go in a row at the end.
6. The whole sheet is centred on the origin.
7. **Stable.** Adding one leaf must not rearrange the sheet (the audit
   allows 140u for the worst node after removing the common shift).
8. **Depth.** With `depth: true` x and y are exactly as without it and
   `z = layer × 48`. From the front it is the same 2D diagram; turned,
   the layers are steps. (Reversed edges and long edges then visibly
   travel across steps — that is the point.)

## DSL

- `layout layered [right|down] [depth]` — a directive line. When
  present, `specFlow` places every node that has no `at` with
  `planLayers`; nodes with `at` keep their position and are left out
  of the layout (they do not push the others). `printSpec` keeps the
  directive and prints no `at` for nodes still at their computed
  place; once the user drags a node, that node gets an `at`.
- An edge may name a node that has no `node` line: it is created with
  the name as its label. `A -> B` alone is a valid diagram.

## Demo

A new sample "自動配置" in plgg-flow-example: a 15-node service
diagram written as edges only with `layout layered right depth`, with
the existing view-angle sliders so the user can turn it and see the
layers as steps. The description (Japanese) says what to try.

## Round L1 review — adopted

sev3 0; trees, lattice, diamonds, CI, components come out as a person
would draw them; 200 nodes in 4 ms; depth shows the layers as steps in
the demo. The audit let three things through that the sheet shows, and
now checks them:

- `reversed-the-wrong-edge`: cycles were broken without regard to
  where the flow starts. microservices put Payments and Queue in layer
  0, left of Gateway, by reversing Orders→Payments instead of
  Payments→Orders. Rule: a reversed edge returns toward the roots
  (nodes with no inputs; if there are none, the node written first —
  the one exception to order-independence, because for a pure cycle
  the author's first node IS the start). Break cycles by DFS from the
  roots in that sense: only edges that close a cycle back to an
  ancestor are reversed.
- `start-not-first` and `ribbon`: stateMachine came out as one row of
  seven with arcs underneath, starting at Editing. With the rule above
  Idle is first; layering should then give Loading / Ready+Error / …
  a second dimension, not a line.
- The demo sample still lists every node; it should be edges only.

Still open: `sprawl` on wide layers (hub downwards: 12 inputs in one
row). Wide layers of leaves may wrap into two rows when a layer is
more than 3× wider than the median layer.

## Round L2 review — adopted

Layout audit 0/0 by the old checks; microservices now starts at
Web/Mobile → Gateway, hubs wrap. The sheet still shows cyclic flows
stretched out, so the reviewer added two cyclic scenes (`retryLoop`,
`orderFlow`) and replaced the `ribbon` check: a flow with cycles may
be no deeper than it needs to be from its start.

For round L3:
- **Cycles by distance from the start.** Inside a strongly connected
  component, an edge is forward iff it increases the BFS distance from
  the start (roots, else the first-written node); edges that decrease
  it are reversed; equal-distance edges are forward in a fixed order
  unless that closes a cycle. stateMachine then reads
  Idle | Loading | Ready, Error | Editing, Closed | Saving — the way a
  person draws it — instead of a row of six. Edges outside an SCC are
  never reversed.
- `chain-not-straight` in the cyclic scenes (retryLoop Parse→Validate,
  orderFlow Cart→Checkout): the main line of a flow stays straight;
  the side nodes of loops (Retry, Fix, Failed) sit beside it.
- Wrapped wide layers (hub): rows of a wrapped layer are centred on
  the same axis and filled evenly (12 → 6+6, not 3+6+3).
- `printSpec`: a node needs no `node` line when it appears in an edge
  and has nothing but its name (no `at`, label, group…). The demo's
  DSL panel then shows edges only.

## Round L3 review — adopted

stateMachine reads Idle | Loading | Error, Ready | Editing, Closed |
Saving; retryLoop and orderFlow keep their main line straight with
the loop nodes beside it; the demo's DSL panel shows edges only.
Codex found the reviewer's `ribbon` bound wrong for orderFlow (it
dropped an edge between components that must stay forward); the audit
was corrected, and the sheet is 0 / 0 over 16 scenes × 2 directions.

Open, from looking at the sheet rather than the numbers:
- downward layouts of cyclic flows are tall and thin; reversed edges
  hug the column on both sides.
- microservices: 4 centre-line crossings (plain reference 9) but 8
  wire crossings — long edges are not routed through the places the
  layout reserved for them (virtual nodes are not passed to wiring).
- the sample sits small in the demo frame; fit-to-view on load.
- depth: reversed and long edges do not yet get their own height.

## For round L4

- **Long edges follow the layout.** `planLayers` also returns
  `routes: ReadonlyMap<number, readonly Point[]>` (edge index → the
  positions of its virtual nodes, in order). `specFlow` stores them on
  the edge as `via` (new optional `Edge` field), dropped as soon as
  either end node is moved by hand. Wiring uses `via` as the soft
  polyline's via points for that edge (curve style) or as the bend
  rows (step style) when present and free. Audit expectation:
  microservices wire crossings ≤ centre-line crossings + 2.
- **Depth carries meaning beyond layers.** With `depth: true`:
  reversed edges travel at their own height — the wire rises 24 above
  the higher of its two ends, runs back, and comes down (the viewport
  already draws wires between nodes of different z; extend the wire
  with an optional `lift` so a reversed edge is visibly a bridge over
  the forward flow when the sheet is turned). From the front the 2D
  picture is unchanged.
- **Fit to view.** The demo fits the diagram to the board on load and
  on reset (largest scale ≤ 1 that leaves a 48px margin).

## Round L4 review — adopted in part

Long edges follow the layout's virtual nodes (microservices wire
crossings 6/8 → 4/4, equal to the centre-line count). Fit-to-view
works on load and reset.

Not right yet:
- the bridge: a reversed edge with depth is drawn *below* the sheet
  when turned and reads as a sagging cable, not a bridge. It must rise
  above the higher end (z + 24), with vertical risers at both ends.
- the demo sample has no cycle, so the bridge is never seen: add
  `Audit -> Gateway` and `DB -> Catalog`.
- fit-to-view must also run after the DSL is edited (the layout
  changes and the sheet may leave the frame).

## Round L5 review — adopted

Seen in the demo turned from above: the reversed edge Audit→Gateway
rises over the forward flow as a deck with risers; from the front the
2D picture is unchanged; the sample now has two cycles; the sheet
refits after a DSL edit. Open: the bridge has raw corners in 3D, and
long forward edges have no height of their own yet.

## Rooms — three discrete axes, a lattice of rooms (owner's brief, 2026-11-24)

> When X, Y and Z each take a few discrete values, space becomes a
> run of rooms. Declare which room each node belongs to and the
> layout places it there; what a node *is* can then be read from where
> it stands on each axis. It should look like a cube, and turning it
> is what makes "what is where" clear.

### Writing it

Nodes carry attributes; axes say which attribute runs along which
direction. Nothing else is positioned by hand.

```
layout rooms
axis x 層 入口 処理 保存
axis y 担当 顧客 注文 基盤
axis z 環境 本番 検証
node Gateway 層=入口 担当=基盤 環境=本番
node Orders 層=処理 担当=注文 環境=本番
Gateway -> Orders
```

- `axis <x|y|z> <attribute> [values…]` — the values in the order
  they run along the axis; if none are listed, the order of first
  appearance. An axis line may be omitted: that direction has one
  value. Swapping two axis lines' letters turns the sheet — the same
  data, classified along other directions.
- `key=value` on a node line sets an attribute (stored in the node's
  `data`). A node lacking an axis's attribute goes to a last,
  unnamed value on that axis ("—").
- `at` is not used under `layout rooms`; a node dragged by hand keeps
  its room (it snaps back inside its room's bounds on release).
- `printSpec` round-trips all of it.

### Placing

- A room is the cell (i, j, k). All rooms in one x-slab share a
  width, in one y-slab a depth (sheet-y), in one z-slab a height:
  each slab is as large as its fullest room needs, with a minimum
  (160 × 110) and 28 of padding inside the walls.
- **The front view must stay a readable table.** Seen from the
  front, z collapses, so the nodes of one (x, y) column — over all
  z — are placed so that none overlaps another in the sheet plane:
  the column is laid out as one group, each z-level taking its own
  band inside the cell. From the front it is a table of x × y with
  every node visible; turned, the bands lift apart into floors.
- Inside a room, nodes are ordered to keep wires short and uncrossed:
  by the barycentre of their neighbours' positions along the room's
  free direction, ties by id; a room with internal edges lays them
  out with the layered layout along x.
- z of a node = k × floor height (floor height = 140), so floors are
  clearly apart when turned.
- Deterministic, order-independent, stable under adding a node (only
  its slabs may grow).
- API in `plgg-flow/autoLayout`:
  `planRooms(graph, axes): { graph; rooms: Room[]; axes }` where a
  `Room` is `{ index: [i,j,k]; values: [string,string,string];
  min: Point3; max: Point3 }` and every slab boundary is available
  for drawing.

### Drawing

- The lattice is drawn in space: every room's 12 edges as hairlines
  in the trace colour (shared edges once), the outer cuboid's edges
  in ink. No fills.
- Axis values are written along the lattice's outer edges (x values
  along the front bottom edge, y values along the left edge, z values
  up the front-left vertical), the attribute name at each axis's end;
  text faces the viewer, 11px, graphite; from the front only x and y
  labels show (z labels appear as the sheet turns).
- A node sits on its floor: its drop line goes to its own floor, not
  the ground.
- Empty rooms are drawn (the lattice is the classification).
- Front view: the same picture as a 2D table with ruled cells.

### Demo

A sample "部屋に分ける" after "自動配置": about 14 services on
層 (入口/処理/保存) × 担当 (顧客/注文/基盤) × 環境 (本番/検証), a dozen
edges, opened slightly turned (yaw −0.5, pitch 0.45) so the cube
reads at first sight. Description: 「ノードに属性を書くと、軸ごとの部屋に
自動で入ります。⌘（Ctrl）を押しながらドラッグして回すと、どこに何があるかが
立体で分かります。axis の x・y・z を入れ替えると、分け方が変わります。」
The 最適化 button re-runs the rooms layout on such a sheet.

### Specs to write

No two node boxes overlap in the sheet plane; every node lies inside
its room on all three axes; slabs are monotone and non-overlapping;
swapping axis letters permutes coordinates consistently; a node
without an attribute lands in the "—" slab; order-independence;
adding one node moves no node out of its room; print/parse round
trip; the lattice has (X+1)(Y+1)(Z+1) corners.

## Grid fit — everything sits on the squares (owner's brief, 2026-11-24)

> A node is as tall as one square of the grid; when it snaps, its
> corners land on the squares' corners; a rectangle's size fits the
> squares too. It should feel like things click into place.

One unit: **G = 32**, the visible grid square.

- **Size.** Default height = G. Default width = whole squares:
  `G × max(2, ceil((textWidth + 24) / G))` (at least 12 of padding
  each side, so labels never touch the border). An explicit
  `width` / `height` in the DSL is honoured as written.
- **Snap is on by default** at G. `snap 16` (or any number) changes
  the step, `snap off` turns it off. What snaps is the **box**: the
  node's top-left corner goes to a grid intersection
  (`centre = k·snap + size/2`), so a default-sized node has all four
  corners on intersections and its border lies on the grid lines.
- **Dragging** moves a square at a time (as today: the node holds
  until the pointer passes the next line, then jumps). A multi-
  selection moves as one, each box staying on the grid.
- **Resizing** a node or a group changes it by whole squares; a group's
  frame closes outward to grid lines around its members.
- **New nodes** (the ＋ button, paste, split) appear box-aligned in
  the nearest free squares.
- **Layouts** produce box-aligned places: the layered layout's gaps
  become whole squares (between layers 3G, between neighbours 1G) and
  every position it returns is box-aligned; the rooms layout the
  same (room padding 1G, slab sizes whole squares, floor height
  unchanged).
- **Loading.** `at x y` is the centre the author wrote and is not
  moved on load; the samples in plgg-flow-example are rewritten so
  that every box is on the grid (and the 立体交差, エッジの経路… samples
  read as drawn on the squares).
- Wires need no change: sockets are at side centres, so a level wire
  between two default nodes runs along the middle of a row of
  squares. The wiring audit's scenes carry explicit sizes and must be
  unaffected.
- Specs: default sizes are whole squares; snapping any drag leaves
  `(x − width/2) mod snap = 0` and likewise for y; resize keeps whole
  squares; layered and rooms outputs are box-aligned; `snap off`
  restores free movement; print/parse round trip of the directive.
