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

### Grid fit, revised the same day: the square is half a node

Owner, on seeing one square = one node height: too jerky; it should
move more smoothly and still click.

- **G = 16.** The square is half a node's height. Default node
  height = 2G (32, unchanged in pixels); default width = whole
  squares, `G × max(4, ceil((textWidth + 24) / G))` — so widths now
  fit labels in steps of 16, not 32.
- Snap default = G = 16: a drag clicks twice per node height. Boxes
  still land corner-on-intersection; sizes, resizing, new nodes and
  layouts stay whole squares (layer gap 6G = 96, neighbour gap
  2G = 32, room padding 2G).
- The drawn grid follows G: a line every 16 in a lighter tone than
  today's, and every fourth line (64) in the current trace tone, so
  the sheet reads as fine squares grouped in fours rather than as a
  dense mesh. When zoomed out so that 16 would be under 6 screen
  pixels, only the 64 lines are drawn.
- `snap 32`, `snap 8`, `snap off` keep working as written.

## Round G1 review — adopted as a base; three things to redo

Grid fit and rooms are in. Seen in the demo: default boxes sit on the
squares; the rooms sample draws the lattice with its labels and puts
14 services in their rooms. The layout audit's centring and
layer-line checks now allow half a square (a box-aligned sheet cannot
centre to the unit).

For round G2:
1. **G = 16** — the revision above ("the square is half a node").
2. **Layout regressions from the grid** (layout audit, 10 moderate):
   hub lost its wrap and its fan (`sprawl`, 25 wire crossings for 0
   centre-line crossings), trees sprawl when laid out downwards,
   stateMachine / ciPipeline / selfAndMulti gained wire crossings.
   Whole-square gaps must not undo L2–L5: back to 0 moderate.
3. **Rooms, as seen turned** (the sample's opening view):
   - every lattice line is drawn in ink: only the outer cuboid is
     ink, inner partitions are the trace tone, and partitions of
     empty rooms lighter still;
   - nodes hide each other (Orders behind Sandbox, Web behind
     Preview): a room's nodes on different floors must not share the
     same sheet position — spread the z-bands inside a cell along the
     cell's free direction so that from the front AND at the opening
     angle no box covers another by more than a quarter;
   - labels collide (担当 values sit behind nodes, 環境 / 本番 / 検証
     pile up at one corner): axis values go outside the cuboid on the
     edge nearest the viewer for the current angle, 12px clear of the
     lattice, the attribute name at the far end of its axis; z values
     up the nearest vertical edge;
   - wires between rooms run as the sheet's ordinary wires and cut
     through room partitions at random: between rooms on the same
     floor they are routed as today; a wire that changes floor leaves
     and arrives vertically for 16 before it runs;
   - the floor of each z level is a faint plane (wash at 40 %) so the
     floors read as floors;
   - the opening angle: yaw −0.6, pitch 0.5, fitted with 48 margin
     clear of the DSL overlay; リセット returns to it, and the toolbar
     of this sample has 「正面」 and 「立体」 buttons (front view / the
     opening angle), because the front view is the table the brief
     asks for.

## Round G2 review — adopted

G = 16 with the grid in fours; the layout audit is back to 0 / 0; the
rooms sample reads as a ruled table from the front (層 across, 担当
down) and as a cuboid with lifted floors when turned.

The opening angle the reviewer prescribed (yaw −0.6, pitch 0.5) was
wrong: perspective grows with tilt and the cuboid became a wedge with
tiny nodes. It is now −0.32 / 0.26, chosen by looking.

Open: at that angle the z values and the two attribute names at the
front-right bottom corner (環境, 本番, 検証, 担当) overlap; labels need
collision avoidance at the corners. Shift-drag, ⌘-drag and the
marquee are still unverified by real input.

## Rooms, second pass — from "it works" to "turning it tells you"

Owner on the first rooms sheet: not bad, but a starting point. The
brief's promise is that *turning it* makes "what is where" clear.
Today the cuboid is there, but turning it teaches little: the lattice
is a cage of similar lines, depth is hard to read, labels pile up,
and nothing answers a question such as "which of these are 本番?".

In order of what changes the experience most:

1. **Ask the axes.** Hovering (tapping) an axis value lights its
   whole slab — the rooms of that value get the wash, their nodes
   stay ink, everything else drops to the pencil tone, wires leaving
   the slab fade. Clicking pins it; a second value on another axis
   intersects (層=処理 ∧ 環境=本番 → one column of rooms). Clicking
   the attribute name clears. This is the classification made
   interactive.
2. **Three tables and the turn between them.** Buttons 「正面」
   (x × y), 「上」 (x × z), 「横」 (y × z) and 「立体」: each face view
   is a ruled table of two attributes, the third collapsed. Moving
   between views is an animated turn (350 ms, eased) so the eye keeps
   hold of the nodes — the turn itself is the explanation. ⌘-drag
   release near a face (within 12°) settles onto it.
3. **Depth you can read.** Near edges of the cuboid ink, far edges
   pencil; inner partitions trace; a node's box and label scale with
   depth as today, plus its floor shadow (a wash rectangle on its
   floor under it) so its floor is unmistakable; floors nearer the
   viewer are drawn after those behind. No perspective distortion
   beyond what makes near things larger: cap the perspective so the
   cuboid's far face is never under 70 % of the near face.
4. **Labels that stay out of the way.** Axis values sit outside the
   cuboid along the three edges nearest the viewer *for the current
   angle* (recomputed as it turns), each attribute name at the far
   end of its edge; labels never overlap each other (shift along the
   edge, then drop the attribute name to the next free corner).
   From a face view, only that face's two axes are labelled.
5. **Rooms worth looking at.** A room with nodes shows its floor
   wash; an empty room shows only its far corner ticks, not its
   whole frame — the lattice reads from the occupied rooms. Hovering
   a room shows its three values as a small caption at its near
   bottom edge.
6. **Wires in space.** A wire between floors travels on the lower
   floor to under its target and rises (or the reverse), so floors
   visibly connect by risers; in a face view it is an ordinary wire.
7. **Movement.** When the DSL changes (a node's value, an axis
   swap), nodes glide to their new rooms (300 ms) instead of jumping;
   the lattice morphs with them.

Specs: slab membership for a value and for an intersection; the
three face views are axis-aligned tables with no overlapping boxes;
label anchors do not intersect for a sweep of yaw/pitch in steps of
15°; perspective cap; far/near edge classes swap when the cuboid is
turned round.

## Rooms, second pass — review

Adopted without item 6 (wires rising between floors): it arrived
entangled with wiring round 32 in wiring.ts and is stashed with it.
Seen in the demo: clicking 処理 then 本番 lights the four services in
both and drops the rest to pencil; 正面 / 上 / 横 are ruled tables of
two attributes; near edges ink, far edges faint; labels no longer
pile up at the opening angle.

Open: the face views fit small (the table uses about half the board);
item 6; the turn animation and reduced-motion path are unverified by
eye.

## Groups — one shape, in space (owner pointed at the turned sheet, 2026-11-24)

Turned, a group is two things that disagree: a tall solid box (the
group node drawn as a solid like any node, with the frame's width and
height) and a dashed rounded outline lying on the ground (the frame
of its members, drawn flat). From the front they nearly coincide and
show as a doubled border, with two resize handles; turned they come
apart. Members float at their own heights inside neither.

A group is **a tray**: one flat rectangle in space, nothing else.

- The tray lies in the plane of the group's own z. Its rectangle is
  the group's frame (stored width × height around its position),
  drawn as a 1px ink outline with square corners, no fill from the
  front; when the sheet is turned its floor takes the wash tone at
  40 % so it reads as a surface. Projected with the sheet like the
  grid — never a screen-space shape.
- No solid body, no walls, no second outline. The dashed "extent"
  line is drawn only while a group is being resized or a member is
  dragged across its edge (the frame it would take).
- The group's name is a label on the tray's top-left corner, inside,
  in the node label type at 600 weight — not a node-shaped card. It
  is the handle for dragging the group; the tray's edge is too.
- Members stand on or above the tray: a member's drop line ends on
  the tray (its group's plane), not on the ground, so belonging is
  visible when turned. A nested group is a tray above (or on) its
  parent's tray, by its own z.
- The frame always encloses its members with one square (16) of
  padding on the grid; moving a member out past the edge grows the
  tray (as today's expanding parents) and it snaps to whole squares.
- One resize handle, on the tray's bottom-right corner, in the
  tray's plane.
- Sockets: a group can still send and receive wires; its sockets sit
  on the tray's edges at their centres.
- A collapsed group is drawn as an ordinary node (as today).
- Wiring treats a tray as passable for wires of its own members and
  as a box to avoid for others — unchanged.

Samples: グループとネスト and グループ一覧 are re-laid so every member
sits inside its tray with the padding, no member straddles another
group's edge (Build must not sit on Design's border), and trays do
not share edges with their parents.

Specs: a group renders exactly one outline element and no solid
faces; its outline's projected corners are the frame's corners at the
group's z for a turned camera; a member's drop line ends at its
group's z; the frame contains every member's box plus 16; one resize
handle per group.

## Performance of the sheet — measured 2026-11-24 (owner: "drawing is a bit heavy")

Measured in the browser: synchronous time of one update (a ⌘-wheel
zoom step, which re-renders the board) per demo sample.

| sample | ms per update | SVG elements |
|---|---|---|
| most samples (3–8 nodes) | 2.6 – 4.7 | 50 – 107 |
| 自動配置 (15 nodes, 19 wires) | 10.6 | 286 |
| 部屋に分ける (14 nodes, 12 wires) | **74** | **2411** (1089 `path`) |

Budget: an update is 8 ms at most for a sheet of 20 nodes; the small
samples should cost about 1 ms.

What to do, in this order:
1. **Rooms**: the lattice is ~1000 separate path elements and is
   recomputed with its labels on every update. Draw the lattice as
   one path per tone (outer / near / far / inner / empty: five `d`
   strings), floors and shadows as one path per floor; compute rooms,
   slab boundaries and room membership once per flow (memo by the
   flow's nodes/axes identity), and per update only project corners
   (8 per slab boundary plane) and choose label edges. Target ≤ 8 ms,
   ≤ 150 elements.
2. **Every sheet**: the DSL panel (lines + properties) must not be
   rebuilt when only the camera or a drag position changes — `lazy`
   on the values it actually shows (during a node drag only that
   node's line and its position fields change). Wires and nodes not
   touched by an update stay behind their `lazy` (as built in rounds
   19–20); check the edge hit band and the arrow/dot layering did not
   break those `lazy` boundaries.
3. **Grid**: with G = 16 the grid path has four times the lines; it
   is one path already — keep it so, cap the line count per axis at
   160 by widening the step (fine lines drop out first), and do not
   rebuild its `d` when the camera did not change.
4. A bench that guards it: `scripts/sheet-bench.mjs` in plgg-flow —
   builds the 自動配置 and 部屋に分ける flows, runs 60 zoom steps and
   60 one-node drag steps through `flowView` + the shared sheet's
   view with plgg-view's diff against the Node test DOM, prints
   median / p90 per step and the element count, and exits non-zero
   above 8 ms median.

## Groups as trays — review, adopted

Seen from the front and turned (グループとネスト): Team and Design are
each one flat rectangle with its name at the corner, a wash floor
when turned, one handle; Review and Build stand inside with padding;
nothing doubles and nothing comes apart.

Open: a wire between a group and one of its own members (Team →
Design, Team → Build) leaves the tray's edge centre and has to curl
back inside — a loop over the top edge. For such wires the group's
end is its **name label** (the label's box, top-left of the tray):
the wire leaves the label's right or bottom side and runs to the
member inside the tray. Wires to anything outside keep the tray's
edges.

## Rooms — the three axes, drawn (owner, 2026-11-24)

Owner: the rooms sheet is ambitious and good, but it is still hard to
tell what lies along each dimension; draw the axes properly, in
space, as dotted lines.

Today the values float near whichever edges happen to face the
viewer and the attribute names sit at corners; nothing says "this
direction is 層". The lattice gets a real set of axes, like a 3D
chart:

- **One origin, three axes.** The origin is the lattice corner at
  (x min, y min, z min) — the top-left of the ground floor, where a
  table starts. From it run three axis lines, each along one edge of
  the cuboid and 40 beyond its far end:
  x to the right along the top edge, y down the left edge, z up
  through the floors.
- **Dotted.** Each axis is a dotted ink line (1.25px, dash 2 / gap
  4, round caps) drawn over the lattice, with a small open arrowhead
  at its far end. The cuboid's own edges stay solid hairlines, so
  the axes read as a different thing: the measure, not the box.
- **Named at the arrow.** The attribute name (層, 担当, 環境) sits
  just past the arrowhead, 12px, weight 600, ink, with its axis
  letter small before it in pencil (`x 層`). It always faces the
  viewer.
- **Ticked and labelled along its length.** At every slab boundary a
  tick 6 long crosses the axis (perpendicular to it, in the plane
  that faces the viewer most). Each value's label sits at the middle
  of its segment, on the outer side of the axis (away from the
  cuboid), 11px, graphite, facing the viewer — clickable as today
  (the slab highlight). The pinned value is ink with an ink underline.
- **Guides from a node (on hover or selection).** Three dotted
  pencil lines drop from the node to the three axes (to its value's
  segment on each), so its place on every dimension can be read off;
  its three values turn ink on the axes.
- The old corner labels and nearest-edge value labels go; the axes
  are the only labelling. From a face view the two visible axes are
  the table's header row and column (the third axis is a dot at the
  origin with its name beside it).
- The fit includes the axes, arrowheads and names. Labels along one
  axis never overlap each other (they shift along the segment or
  shrink to 10px; never dropped).
- The origin stays the same corner at every angle, so the picture is
  stable while turning; when that corner is behind the cuboid the
  axes are still drawn over the lattice (they are the reference).
- Performance rules from the previous section hold: the three axes,
  their ticks and labels are at most 3 paths plus the label texts.

Specs: three axis paths from one origin, each parallel to its edge
and 40 longer; ticks count = values + 1 per axis; value labels at
segment midpoints on the outer side; name labels beyond the arrows;
node guides end on its three value segments; labels of one axis do
not intersect for yaw/pitch swept in 15° steps.

## Performance, first pass — review: the bench measured the wrong path

Adopted (lattice in four paths, camera-only updates keep the DSL
panel's lazy argument, group wires leave the name label). But the
reviewer's browser measurement, same method as before (synchronous
time of the wheel handler for one zoom step):

| sample | before | after | bench (Node) says |
|---|---|---|---|
| 立体交差 (4 nodes) | 4.2 | 3.8 – 7.6 | 0.28 |
| 自動配置 | 10.6 | 10.1 – 10.9 | 1.43 |
| 部屋に分ける | 74 | 39 – 40 | 0.43 |

Forced layout after the handler is small (0.3 / 0.6 / 5.5 ms) and
only 46 / 185 / 96 attributes change per update, so the time is
JavaScript inside the handler that `sheet-bench.mjs` does not run:
the bench drives `flowView` and the shared sheet's view, while the
page runs the **demo's** update and view
(plgg-flow-example/src/index.ts: sessions, per-sample tools,
`workbench.ts` / `analysisTools.ts` features, fit, DSL cache …).

Second pass:
1. Make the bench run what the page runs: the demo's own `init`,
   `update` and `view` (export them for the bench if needed), one
   wheel-zoom message and one pointer-move drag message per step,
   through plgg-view's real diff. Its numbers must be within 2× of
   the browser figures above before any optimising starts — if not,
   the bench is still not measuring the page.
2. Profile it (`node --cpu-prof`) for the three samples and remove
   what dominates. Expected suspects: work done for every sample on
   every update whichever sample is shown (tool/feature views,
   analysis, link lists, minimap), re-deriving the fitted frame,
   re-printing the DSL, rebuilding wire segments for depth order on
   camera-only changes, `match`-heavy hot paths.
3. Targets in the browser (the reviewer re-measures): 部屋に分ける
   ≤ 8 ms, 自動配置 ≤ 5 ms, small samples ≤ 1.5 ms per zoom step and
   per drag step.
4. Rooms still has 1,426 elements because every wire segment and its
   hit band is painted separately for depth order: paint a wire as
   one path (plus one hit path) and order whole wires by their
   nearest point; split only wires that pass both in front of and
   behind a node.

## Performance second pass, toolbar, axes — review, adopted

Reviewer's browser measurement (same method): 部屋に分ける 74 → 40 →
**3.9 ms** per update (1,426 → 298 elements), 自動配置 10.6 → 6.4 ms,
the first small sample 4.9 ms (unchanged; possibly warm-up — to be
looked at). The time had been in plgg-view's message mapping and CSS
collection (`match` dispatch again), not in the sheet. The bench now
runs the demo's own update and view.

Toolbar: リセット re-lays and returns to the front; ⏮ ◀ ▶ ⏭ walk one
history (checked: reset → back → next → first → last give the
expected texts and disabled states). Axes: three dotted axes from the
ground-floor origin with arrowheads, `x 層`, `y 担当`, `z 環境`,
ticks and values.

## Rooms, third pass — it must read as space (owner: "still not working, is it")

With the axes the directions are named, but the sheet still reads as
a slightly tilted table. Four changes:

1. **Parallel projection for rooms.** A rooms sheet is drawn without
   perspective: parallel lines stay parallel, far nodes are the size
   of near ones, the lattice stays a lattice. (Other sheets keep
   their projection.)
2. **Floors are plates, clearly apart.** Floor height 140 → 220.
   Each floor is a plate: its outline in ink, its surface the wash at
   55 %, drawn back to front so nearer floors cover farther ones; the
   floor's value (本番, 検証) is written on the plate's near-left
   corner, 12px 600. The cuboid's vertical edges stay hairlines.
   Rooms on a plate are ruled by trace lines on the plate itself, not
   by walls.
3. **Wires step back.** On a rooms sheet wires are drawn in the
   pencil tone at 1px; a wire turns ink when either end's node is
   hovered or selected, or when both its ends are in the pinned
   slab. Wires between floors keep their riser.
4. **The opening view shows three faces**: yaw −0.62, pitch 0.48 (in
   parallel projection this is a near-isometric view from the front
   left above), fitted clear of the DSL overlay. 「立体」 returns to
   it.

Specs: a rooms sheet's projected parallel edges stay parallel within
0.5°; node boxes on different floors have equal projected size;
plates are painted far to near; a wire's tone follows the hover /
selection / slab rule; the opening view shows the top, front and side
of the cuboid (three faces with positive projected area).

## Rooms, third pass — review, adopted

Seen at the opening view: parallel projection, two plates (本番,
検証) clearly apart with their names at the corner, rulings on the
plates, wires in pencil turning ink for a selected node, the dotted
axes following. 1.6 ms per update in the browser, 245 elements.

Open, from looking: the sheet is fitted small (the cuboid takes
about half the board and the node labels are near 8px) — the fit
counts the axes' full length and the far plate's corner; fit to the
plates and let axis names sit inside the margin. With z toward the
viewer the plates stand like panes rather than lie like floors; the
owner has not said which they want.

## Space, from the ground up (owner, 2026-11-24: "this is wrong; first build the 3D space properly — in principle it extends to 4D, 5D; that foundation is what we are designing now")

What was built so far is a table that tilts: three axes are wired
to x, y, z by letter, the front view is the real layout, depth is a
lift added to it, and each pass patched the picture. It cannot grow
a fourth axis, and it does not read as space. Rebuild in four
layers, each usable and specified without the ones above it.

### 1. Classification — N axes, no geometry

- A sheet has any number of axes. `Axis = { attribute; values }`.
  A node's **address** is one index per axis (a missing attribute is
  the last, unnamed value "—", as today). A **cell** is an address;
  the cells are the product of the axes' values.
- `classify(graph, axes) → { axes; cells; addressOf(node) }`. Pure,
  order-independent, any N ≥ 0. No coordinates anywhere in it.

DSL: `axis 層 入口 処理 保存` — an axis is named by its attribute;
order of the lines is the order of the axes. The old spelling
`axis x 層 …` still parses (it means the same axis plus a `view`
entry) and is printed in the new spelling.

### 2. View — which axis goes where

A view assigns each axis one **role**:

| role | meaning |
| --- | --- |
| `x`, `y`, `z` | a direction of the space (at most one axis each) |
| `row`, `column` | the whole space is repeated once per value, side by side (`column`) or stacked (`row`) — this is how a 4th and 5th axis are seen at once |
| `pin=value` | only that value's slice is shown |

DSL: `view x=層 y=担当 z=環境 column=地域`. Without a `view` line:
the first three axes are x, y, z; a 4th is `column`, a 5th `row`,
any further axis is pinned to its first value. Changing the view
never changes the classification — it is the same data seen along
other directions; the sheet animates between views.

`View` is data (`{ x?; y?; z?; row?; column?; pins }` by attribute
name); `planSpace(classification, view, sizes) → Space`.

### 3. Space — real three-dimensional geometry

World coordinates: **x to the right, y up, z toward the viewer**;
the ground is the plane y = 0. (The flow's sheet coordinates stay
as they are for other layouts; a rooms sheet converts at the edge.)

- A **block** is one cuboid of cells for one (row, column) value
  pair; with no row/column axis there is one block. Blocks stand on
  the same ground in a grid, a gap of 96 between them, each with its
  row/column value written at its foot.
- Inside a block every x-slab shares a width, every y-slab a height
  (a storey), every z-slab a depth; minimums 160 × 96 × 96, all
  multiples of 16; a slab is as large as its fullest cell needs.
  The same slab has the same size in every block, so blocks compare
  cell for cell.
- Nodes **stand on the floor of their cell**: upright cards facing
  +z, bottom edge 16 above the storey's floor, laid out in a row
  along x, wrapping into further rows along z; ordered by the
  barycentre of their neighbours, ties by id.
- `Space = { blocks: { address; min; max; cells }[]; slabs;
  place(node) → Point3 }` — pure; specs: no two nodes overlap in
  3D; every node inside its cell on all three directions; slabs
  monotone; equal slabs across blocks; deterministic and
  order-independent; adding a node moves no node out of its cell;
  works for 0, 1, 2, 3, 4 and 5 axes.

### 4. Camera and stage

- **Turntable camera**: yaw about the world's up axis through the
  centre of the space, elevation −0.2 … 1.45 rad, parallel
  projection, zoom. Up stays up. ⌘/Ctrl-drag turns; two fingers on
  touch.
- **The stage is drawn first and does not depend on the nodes**:
  per block, of the six faces of its cuboid the three facing away
  from the viewer are drawn — the wash at 55 %, a pencil outline,
  trace rulings at the slab boundaries of the face's two axes. As
  the camera turns the far faces change; the ground face is the
  floor whenever the camera is above. Storey floors inside the block
  are drawn as outlines only (trace), so the block stays see-through.
- Each node drops a soft shadow straight down on its storey's floor.
- **Axes**: three dotted axes from the block's far-bottom corner
  along its edges, ticks at slab boundaries, values at slab
  midpoints on the outside, the attribute name beside each tip
  (first block only when blocks repeat; the others carry just their
  row/column value).
- Paint order: stage far faces, then cells far to near along the
  view direction (nodes and their shadows with their cell), then
  the axes and labels.
- **Face views are camera positions, not other layouts**: 正面
  (yaw 0, elevation 0), 上 (elevation π/2), 横 (yaw π/2). Seen
  face-on, the hidden direction's levels would cover each other;
  there, each deeper level is drawn shifted by (12, −12) px per
  level in pencil, the nearest in ink, and clicking a value of the
  hidden axis shows that level alone. Cards turn to face the viewer
  in 上 and 横 (a card always shows its face), keeping their place.
- Clicking an axis value pins/unpins it as today (intersection of
  the pinned slabs in ink, the rest pencil).

### Order of work

A. Layers 1–3 with their specs, old DSL still parsing, and the
   current sample drawn through the new space (stage, floors, cards
   standing, turntable). The sample must open reading as a
   three-storey building seen from the front left above.
B. `row`/`column` blocks and `pin`, with a four-axis sample
   ("部屋に分ける" gains 地域 = 東京 / 大阪 as a fourth axis shown as
   two blocks side by side) and a five-axis spec.
C. Animated change of view (roles swapped from the properties area).

Budget unchanged: one update of the sample under 8 ms in the
browser, the element count near today's (245).

## Space — where the values are written, and the partitions (owner, on the first sight of the new space: "much better; put which stretch of each axis is what where it does not overlap and is easy to see, and let the spatial partitions show")

Seen: the axes start at the far-bottom corner, which with two blocks
is the middle of the picture, so 顧客 / 注文 / 基盤 and 本番 / 検証
are written over walls, wires and cards; the cells are hinted only
by faint rulings on the far faces.

**Axes go on the outline.** For the current camera, each axis is
drawn along the edge of the block's cuboid that lies on the outline
of its projection (a silhouette edge), choosing among those the one
on the outer side of the whole picture; values are written outside
that edge, away from the block.

- x (across): the front-bottom edge of **every** block; values
  below it.
- z (depth): the bottom edge on the outward side — of the rightmost
  block when it is the right side that shows, of the leftmost
  otherwise; values outside it.
- y (storeys): the outline's vertical edge on the outer left (or
  right) of the leftmost (rightmost) block; values beside it,
  reading from the ground up in the order the storeys stand.
- A value is centred on its slab, between two ticks that reach 6px
  outward; the attribute name is written once, beyond the last
  value, 12px 600. The dotted line, ticks and arrowhead stay.
- A label's box (13px per glyph × 14) must not meet any card's
  projected box, another label, or a block's value at its foot;
  when the chosen edge fails that at the current camera, take the
  other outline edge of that axis; when both fail, move the label
  outward in steps of 4px.
- As the camera turns the edges change — labels jump to the new
  outline edge, never slide across the picture.

**Partitions show.** A cell must read as a box:

- Every storey's floor is a plate: wash at 35 %, pencil outline,
  ruled into its cells by trace lines.
- Every vertical partition line that reaches the block's hull is
  drawn on the hull as a trace line, on near faces too (near faces
  have no fill): the block is ruled like a crate on all sides.
- The pinned slab or cell is framed in ink with its faces washed at
  20 %; everything else steps back to pencil as today.
- Budget: the element count may rise to about 400; one update
  still under 8 ms.

Specs: for the opening view and after turning to each of eight
yaws at two elevations, no axis label box meets a card box or
another label; every axis edge used is a silhouette edge of its
block; each storey draws one plate; hull rulings count
(X−1)+(Z−1) per vertical face pair and per storey.

## Space — every view is a correct 3D drawing (owner: "front / top / side are a good idea, but they are entirely unreadable; the ideal is: drawn in three dimensions, correctly, with the axes auxiliary, placed where they do not get in the way")

Seen: in 正面 the deeper level is a pencil copy shifted (12, −12)
over the near one; in 上 the three storeys are three shifted
outlines with the cards crushed to slivers; in 横 the cards are huge
and cover each other. The "stacked level" cue of the earlier
section is withdrawn — it is not a drawing of the space, it is a
trick, and it is unreadable.

**One rule: the sheet is always the same solid scene, seen from a
camera; the buttons only move the camera.** No view dims, shifts,
re-lays or resizes anything.

- 正面 / 上 / 横 are **three-quarter views that favour one face**,
  never exactly face-on, so depth is always visible:
  - 正面: yaw −0.22, elevation 0.20 — the x × y face dominates,
    the depth shows as a narrow side and top.
  - 上: yaw −0.22, elevation 1.05 — the storeys are seen from
    above like a plan, stepping up the screen.
  - 横: yaw −1.30, elevation 0.20 — the z × y face dominates.
  - 立体: yaw −0.60, elevation 0.50 (the opening view).
  The camera turns there in 300 ms; each view is re-fitted to the
  open frame (48px clear each side, scale ≤ 1.25).
- **Cards are billboards**: a card always faces the viewer at its
  own size (width × 32 at the fitted scale), upright, standing at
  its place on its storey; its foot point is what is placed. Size
  never changes with the view.
- **Solid, correct occlusion**: cards and plates are opaque paper;
  everything is painted far to near along the view direction (cell
  by cell, a storey's plate before the cards standing on it), so a
  nearer card covers a farther one and a floor covers what is under
  it when seen from above. Nothing is dimmed for being far.
- Wires run in space between the cards' foot-level sockets and are
  painted with the farther of their two ends' cells (pencil unless
  hovered / selected / pinned, as before).
- If something is hidden behind something else, that is the truth
  of that view; turning, or pinning a value, is how to see it. A
  pinned slab is drawn alone at full ink with the rest of the block
  as outline only.

**Axes are auxiliary.** On top of the outline-edge rule of the
previous section: axis lines, ticks and arrowheads in the pencil
tone at 1px; values 11px graphite; the attribute name 11px 600
graphite; nothing of an axis is ink unless its value is pinned
(then that value alone is ink 600). Axes are painted last but must
not sit over any card (the no-overlap spec holds in all four
named views and while turning).

Specs: the four named views have the listed angles; in none of
them is any direction of the block edge-on (each of the three
world axes projects to at least 12 % of its length); a card's
projected box has the same size in all four views; paint order is
far to near for the four views; no opacity or tone depends on
depth; the stacked-level offset is gone.

## Space, every view a 3D drawing — review, adopted with one correction

Seen in all four named views: one solid scene, the buttons only
turn the camera; cards are billboards standing on their storeys;
axes pencil on the outline, clear of the cards.

Correction to the design: **opaque storey plates were wrong.** Seen
from above they hid every card on the storeys below (only socket
dots showed). Plates are now the wash at 45 %, so lower storeys
show through, quieter. Card captions are one size (13) rather than
growing where a card has room. Cell minimums 160 × 96 × 96 →
112 × 80 × 80.

Open: the two blocks side by side are fitted by width and leave
half a tall board empty; cards in adjacent depth rows can cover
one another in 上; step C (animated change of roles) not started.

## Space is a layout and a scenery; the standard drawing draws it (owner: "the nodes' boxes are omitted — unacceptable; this must be drawn as an extension of the standard sheet, and instead it is an ad hoc implementation, isn't it")

It is. The previous section told cards to be billboards, and the
viewport now branches on `state.rooms` in 38 places (14 before the
space work): its own node body, caption, sockets, wire route, tone,
paint order, drag. A rooms sheet is drawn by a second renderer
living inside the first. "Cards are billboards" is withdrawn.

**Principle.** A space sheet is an ordinary sheet whose positions
came from `planSpace` and which carries a scenery. Everything a
reader sees of a node or a wire is drawn by the same code as on any
other sheet: the node is the standard box with its standard depth,
caption, sockets, selection, hover, resize; a wire is the standard
wire between sockets with the standard routing and arrowhead; the
camera is the standard camera. `viewport.ts` must not mention
rooms, cells, storeys or axes at all.

What a space adds goes through four **general** seams, each usable
by any sheet:

1. **Positions.** `planSpace` returns ordinary node positions in
   the flow's own coordinates (x right, y down the sheet, z toward
   the viewer). A storey is a band of sheet-y; "up" is −y. The one
   conversion from the space's world coordinates lives in
   `space.ts`. A node's box stands in its cell with its face to +z,
   exactly as a node on any 3D sheet.
2. **Scenery.** `Flow.scenery?: Scenery[]`, plain data in the
   flow's 3D coordinates, drawn by the viewport with no knowledge of
   what it means:
   - `plane` (four corners, fill tone + opacity, stroke tone),
   - `line` (points, tone, dotted or solid),
   - `label` (anchor point, screen offset, text, size, weight, tone,
     optional `press: Change` making it clickable),
   - each with `layer: "behind" | "sorted" | "front"`; `sorted`
     items are depth-sorted together with nodes and wires by the
     viewport's existing painter's order.
   The stage (far faces, storey plates, hull rulings, pinned frame)
   and the axes (dotted lines, dimension lines, value names) are
   produced as scenery by `roomView.ts` from the space and the
   camera; choosing outline edges and avoiding boxes stays there.
3. **Confinement.** `FlowNode.within?: { min: Point3; max: Point3 }`
   — the standard drag keeps a node inside it (and on its plane
   when the box is flat in one direction). The space sets it to the
   node's cell.
4. **Emphasis.** `FlowNode.quiet?: boolean` and `FlowEdge.quiet?`
   — drawn in the pencil tone by the standard renderer, ink on
   hover / selection as usual. Pinning a slab sets `quiet` on
   everything outside it; a space sheet sets `quiet` on its wires.

Camera: the standard camera and orbit. The named views (正面, 上,
横, 立体) are camera positions set by the sheet, as before. If the
standard orbit lets the sheet's up direction tip over, fix that in
the standard camera for every sheet, not with a rooms flag.

Remove: `billboardBody`, `roomCaption`, the rooms wire route and
tone, the rooms socket and paint-order branches, `Camera.turntable`
if the standard camera can serve, `roomReceded` in favour of
`quiet`.

Kept from the last two sections: one solid scene in every view;
three-quarter named views; plates at 45 %; axes pencil, on outline
edges, clear of nodes (the boxes to avoid are now the standard
boxes' projected hulls); storeys, blocks, pins.

Acceptance: `grep -c rooms src/viewport.ts` is 0; the sample's
nodes are the same boxes as in "立体交差" at the same zoom; the
existing specs of other sheets are untouched; a spec draws a
non-rooms flow with one plane, one line and one label of scenery;
a spec drags a node with `within` and it stays inside.

## Space as scenery — review, adopted; and what "intuitive from any angle" still needs (owner's goal: shoot it from many angles and polish until a not-too-complex solid structure reads at a glance from all of them)

Adopted: `viewport.ts` mentions rooms nowhere; nodes are the
standard boxes; scenery / within / quiet are general and specified.
Browser, four named views, looked at.

What still stands between this and "reads at a glance":

1. **Scenery veils the nodes.** A node on a lower storey is seen
   through every plate above it and through the near faces' lines
   and comes out grey. Rule: scenery never changes how a node
   looks. Plates: wash at 14 %, pencil outline, trace rulings —
   and a plate is painted *before* every node and wire of its block
   that is not below it from the camera; simplest correct form:
   all plates of a block, far to near, then nodes and wires in the
   standard order. Near faces of the hull: outer edges only.
2. **A cage of lines.** Rulings on near faces are withdrawn (they
   were this reviewer's instruction). Partitions are shown where
   they are useful and behind: the far three faces carry the
   rulings; each storey plate carries its cells' rulings; four
   corner posts and the top outline complete the box in pencil.
3. **Names vanish when a box is seen from the side or from above.**
   General rule for every sheet, in the standard node renderer: a
   node's caption is drawn on its front face while that face's
   projected width is at least 45 % of its true width and its
   height at least 45 %; otherwise the caption is drawn as an
   upright tag centred just above the box's projected top (same
   size and weight, paper halo 2px so it stays legible over lines).
   Switching is by face ratio with 5 % hysteresis.
4. **The sample is two things at once.** "部屋に分ける" goes back to
   three axes, one block — the plain case, twice as large on the
   board. A new sample right after it, 「次元を足す」, is the same
   system with 地域 (東京 / 大阪) as a fourth axis shown as two
   blocks; description 「4つ目の軸は、空間そのものを並べて見せます。」
5. **Fit.** Scale cap 1.25 → 1.6 for space sheets so a single
   block fills the board; 40px clear each side.
6. **Axis text.** Values 10px (9 was too small on screen), name
   10px 600.

Specs: a node's fill, stroke and caption tone are identical with
and without scenery present; no scenery element is painted after a
node unless its layer is "front"; caption placement follows the
face-ratio rule at yaw 0, 0.9, 1.4 and elevation 0, 0.8, 1.3; the
two samples parse, print and fit.

Reviewer's shooting list for acceptance (browser): yaw −150° to
150° in 30° steps at elevations 10°, 30°, 55°, plus the four named
views — in every shot each node's name is readable, its storey and
cell can be told without touching the sheet, and no label lies on
a node.

## Layers — one axis on an auto-laid graph (owner: "rooms is the hard case; a frequent one is an auto-laid graph with just one axis added as layers, showing which layer each node is on — support that pattern too")

The same foundation, the simplest view of it: the graph is laid
out by its edges as always, and one axis lifts each node onto its
layer.

```
layout layered down
axis 層 画面 業務 データ
node Web 層=画面
node Orders 層=業務
Web -> Orders
```

- Under `layout layered`, an axis has the role **`layer`** (the
  default for the first axis there; `view layer=層` says it
  explicitly). Only one layer axis; a second axis under `layered`
  is an error naming the line. Classification is `classify`, as
  for rooms — nothing new.
- **Placing.** `planLayers` places every node in the sheet plane
  from the edges exactly as without the axis: seen from the front
  the sheet is the ordinary auto layout. Then z = the layer's
  level × 112, the first-written value nearest the viewer. The
  `depth` option (z by rank) cannot be combined with a layer axis.
  API: `planLayers(graph, { direction, layerAxis })` returning the
  layers' planes beside what it returns today.
- **Scenery** (general primitives only): one plate per layer — the
  rectangle around *all* nodes plus 32, the same for every layer,
  in the sheet plane just behind that layer's nodes; wash 14 %,
  pencil outline; the layer's name at the plate's top-left corner
  (10px 600 graphite, a label that pins the layer on click — other
  layers' nodes and wires go quiet). Plates are painted far to
  near, each before the nodes standing on it.
- Wires between layers are the standard 3D wires.
- **Views.** Opens turned so the layers stand apart (yaw −0.5,
  elevation 0.35); 正面 is the flat graph (here exactly face-on is
  right: it *is* the ordinary sheet, the plates coincide and only
  the outline shows); 立体 returns to the opening view. No 上 / 横
  buttons on a layers sheet.
- Dragging a node moves it on its own layer (`within` flat in z).
  The properties area's axis row offers the role `layer` on a
  layered sheet, and a node's row offers its layer as a choice.
- Sample 「レイヤーに分ける」 right after 「自動配置」: about ten
  nodes, 層 = 画面 / 業務 / データ, a dozen edges crossing layers;
  description 「軸を1つ足すと、ノードが層ごとの面に乗ります。」

Specs: front projection equals the layout without the axis; each
node's z is its layer's level; plates share one rectangle and
contain every node; a second axis is a parse error; `depth` plus
an axis is a parse error; print/parse round trip; pinning a layer
quiets the others; `viewport.ts` still mentions neither rooms nor
layers-as-axis.

## Shooting round 1 (browser, 部屋に分ける, eight angles) — adopted; what the shots show

The opening view now reads at a glance: one block, three storeys,
standard boxes, ink wires, quiet axes. Turned, four things break:

1. **Tags are covered and collide.** Side-on (横, and any yaw near
   ±90°) the upright name tags are cut by nearer boxes (Payments,
   Sandbox, Orders, Checkout) and run into one another. Rule, in
   the standard renderer: tags are painted after every box and
   wire (front layer), each with its paper halo; they are placed
   nearest node first, and a tag whose box (text + 2px) meets an
   already placed tag moves up in 4px steps until free; a tag moved
   more than 6px gets a pencil leader to its box's top centre.
2. **A squashed caption is not a readable caption.** In 上 the
   captions lie on faces seen at about half height and are crushed.
   The face keeps its caption only while its projected width and
   height are both at least 70 % of true (back to face at 75 %);
   below that, the tag.
3. **The back of a box is a face too.** Seen from behind (|yaw|
   beyond 90°) the caption is drawn on the back face, readable
   left to right (not mirrored), under the same 70 % rule.
4. **Turning drifts the picture under the overlay.** Orbit must
   turn about the centre of what is drawn (nodes and scenery
   bounds) and keep that centre at the centre of the *open* frame
   (frame minus `cover`), on every sheet. After a turn ends, if any
   part of the bounds is outside the open frame less 24px, the
   camera eases (200 ms) to the fitted scale and origin for the new
   angle; a sheet the user has zoomed by hand is not re-scaled,
   only re-centred.

Specs: at yaw ±90° and at 上, no two tag boxes meet and no tag is
painted before a box; caption-on-face switches at 70 / 75 %; at
yaw 150° captions are on back faces and their text runs left to
right on screen; after `orbitByDrag` on a sheet with `cover`, the
bounds' centre projects to the open frame's centre.

## Wires in space — no compromise (owner: "I don't want to compromise on the edges either")

Seen in the shots: wires on a space sheet are the flat sheet's
curves stretched between sockets that happen to differ in depth
and height. In parallel projection a free curve through space has
no readable depth — the eye cannot tell where it is — and several
pass through boxes and plates.

**A wire in space runs along the lattice's directions.** The stage
gives the eye three directions; a wire made of runs parallel to
them is as readable as the stage itself, from any angle.

Route (pure, in `space.ts` beside the positions, returned as
`routes: Map<edgeId, Point3[]>`; drawn by the standard renderer
through one general seam — an edge may carry `path?: Point3[]`,
waypoints in the flow's coordinates, drawn as a polyline with the
standard fillet, depth-sorted run by run):

1. **Same storey, same depth row, facing sockets**: no path — the
   standard wire (it lies in one plane and already reads).
2. Otherwise an orthogonal route of at most four runs, in this
   order of preference:
   - leave the source's socket along x by a 16 stub into the
     **aisle** beside the node (the free strip between node rows
     and cell walls);
   - change depth (z) in the aisle, at socket height;
   - change storey (y) with one vertical **riser** in the aisle —
     risers of one block share few aisles so they read as shafts;
   - arrive along x into the target's socket with a 16 stub.
   Same column, different storey, same depth: top / bottom sockets
   and one straight riser.
3. **Nothing is pierced**: no run passes through any node's box
   (grown by 6); a riser passes a storey plate only in an aisle.
4. **Parallel runs keep apart**: runs sharing an aisle take lanes
   8 apart, ordered so they do not cross each other where avoidable
   (sort by the far end's position along the run's direction).
5. Corners are filleted (radius 8); the arrowhead lies along the
   last run and stops at the dot rim as on every sheet.
6. **Depth is visible**: runs are painted in the standard depth
   order with boxes and plates; where two runs cross on screen the
   nearer one is drawn over a 3px paper halo (the existing bridge
   gap), so which is in front is never in doubt.
7. Tone as decided: ink. (Quiet only when a pin puts them outside
   the chosen slab.)
8. Dragging a node re-routes only its own wires; the route is a
   function of the two end cells, the two nodes and the aisle lanes
   — stable under orbit (routes never depend on the camera).

Blocks (4th / 5th axis): a wire between blocks leaves by the
block's nearest side aisle, crosses the gap at ground level + its
socket height in one straight run, and enters the other block's
side aisle. The same rules.

Layers sheets: a wire between layers is the in-plane standard wire
on the source's layer up to a point 16 short of the target's
position in the sheet plane, then one straight run along z to the
target's layer (a short "via"), then the 16 stub. In-layer wires
are the standard wires.

Specs (in `space.spec.ts`, over the two space samples, the layers
sample and ten random spaces of 2–4 axes): every run of a path is
parallel to x, y or z; at most four runs between stubs; no run
meets a grown node box; no riser meets a plate outside an aisle;
parallel runs in one aisle are ≥ 8 apart; path length ≤ 1.6 × the
Manhattan distance between its sockets; routes are identical for
two cameras; moving one node changes only paths touching it;
routing all wires of the sample takes under 2 ms.

## Layers, redone as a layer cake (owner on the layers sample: "I see it, but as an example it is ugly; I would not want to use this")

Agreed, looking at it: three identical upright panes overlapping
almost entirely, nodes that do not visibly belong to any of them,
names on top of each other, captions skewed, wires weaving through
the panes. And the sample's layers repeat what the top-down ranks
already said, so the third dimension adds nothing. "The front view
is exactly the layout without the axis" was this reviewer's
requirement and it is what forces the panes. Withdrawn.

**The picture people want is the layer cake**: flat boards stacked
one above another with air between, each carrying its own nodes,
connections dropping from board to board. Everyone has drawn it by
hand; nobody has it from a text.

- `layout layered` + one axis: each value is a **board**. Boards
  are horizontal (the flow's x–z plane), stacked along y, the
  first-written value on top, 144 between boards (multiple of 16).
- **On a board** the layer's nodes are laid out by the edges among
  them with the layered layout along x (left to right), rows going
  back along z; nodes with no in-layer edges are ordered by the
  barycentre of their neighbours on the boards above and below, so
  drops are short. Every board has the same footprint (the largest
  one, padded by 32), centred on one vertical line.
- Nodes are the standard boxes standing on their board, face to the
  viewer (as in the rooms storeys).
- **A board is a thing**: paper fill at 92 %, ink outline 1px, and
  a thickness of 6 (a thin slab: its two visible side faces in the
  wash). Painted far to near with the nodes and wires of the board
  below before the board above.
- The layer's name stands at the board's front-left corner, on the
  front edge, 12px 600 ink — outside the footprint, never on a
  node.
- Wires: in-board wires are the standard wires lying on the board's
  plane at socket height; between boards the orthogonal route of
  "Wires in space" — out to the aisle, one vertical drop, in. A
  drop passes through a board only if there is no aisle free; then
  it is drawn dotted for the stretch hidden by the board.
- **Views.** Opens as a true isometric from the front left above
  (yaw −π/4, elevation 0.62). 正面 (yaw 0, elevation 0.12): the
  boards seen nearly edge-on — a banded diagram, layers as rows.
  上 (elevation 1.2): the boards as plans, stepping up the screen.
  No exact face-on views. 立体 returns to the opening view.
- Pinning a layer (click its name) lifts everything else to quiet.
- This is the rooms space with a single axis in role `y` and the
  in-cell layout done by edges; implement it as that — one
  mechanism, not a second one. Remove the upright-pane layer mode
  (`layerAxis` planes in z) and its specs.

Sample 「レイヤーに分ける」: the same ten nodes and layers, but the
edges inside a layer matter (画面: Web → Checkout; 業務: Auth →
Orders → Payments, Catalog → Orders; データ: none), about twelve
edges in all. It must look like something one would put in a
design document as it is.

**The same taste applies to every space sheet** (rooms, added
dimensions): storey floors become boards — paper 92 %, pencil
outline, thickness 4 — and the opening view is the isometric
(yaw −π/4, elevation 0.62) unless that hides a whole slab behind
another, in which case yaw −0.6.

Specs: boards are parallel, equally spaced, share one footprint and
one centre line; every node stands on its layer's board inside the
footprint; in-board order follows the edges (a source is left of
its target); printed text round-trips; pinning quiets the other
boards; no upright-pane code remains.

## Crossings are optimised in space, node positions included (owner: "crossing lines must be optimised in 3D too, node positions included — otherwise lines overlap, smear and look dirty")

Today a cell orders its nodes by one barycentre along x and the
wires take what is left. Routing cannot repair a bad placement.
Placement and routing are one problem in space, as they are on the
flat sheet (LAYOUT.md's first sections), with one more direction.

**What is minimised**, in this order (lexicographic):

1. **Overlaps: zero.** No two runs of different wires are collinear
   and overlapping (in space), and no two wires share a socket
   stub. This is a hard rule, not a cost.
2. **Piercings: zero** (boxes; boards outside aisles). Hard rule.
3. **Crossings in the three lattice projections** — the wires'
   runs projected along x, along y and along z; a crossing is two
   runs of different wires meeting at interior points. Summed over
   the three. (The named views look almost along these directions;
   a crossing there is a crossing on screen.)
4. **Bends** — a wire between nodes that share two coordinates is
   one straight run; count the runs beyond one.
5. **Length** — total run length.

**How**, deterministic and order-independent:

- *Slots, not free positions.* A cell (or a board) is a small grid
  of slots (columns along x, rows along z, pitch = widest node +
  32 by 80); a node occupies a slot. Slabs are sized from the slot
  counts.
- *Alignment first.* Two nodes joined by a wire, in cells that
  differ along one direction only, want the same slot coordinates
  in the other two — then the wire is one straight run. Build
  these wishes as a graph and assign slot coordinates by sweeps:
  for each of the three directions in turn, order the nodes of
  every cell by the barycentre of their neighbours' coordinates in
  that direction (ties by id), four rounds forward and back, keep
  the best assignment by the cost above (the classic layered
  sweep, applied per direction).
- *Then improve by exchange.* Repeat until no gain or 40 moves:
  try swapping two nodes of one cell, or moving a node to a free
  slot of its cell; keep the move if the cost drops. Cost is
  evaluated on the routed wires of the affected nodes only.
- *Lanes.* Runs sharing an aisle are ordered by their far ends so
  that they leave the aisle without crossing one another (the
  standard channel ordering); parallel runs are 8 apart; an aisle
  widens (the slab grows by 16) when its lanes are full.
- Budget: the two space samples and the layer cake place and route
  in under 20 ms in Node; a drag re-routes only the touched wires
  (under 2 ms) and does not re-place.
- Stability: adding a node or an edge changes the slots of that
  node's cell and at most the lane order of the aisles its wires
  use; everything else keeps its place (re-placement of other
  cells happens only on 最適化/リセット or when the text is
  re-laid).

**Measured by the reviewer's audit** `scripts/space-audit.mjs`
(owned by the reviewer; the implementer does not edit it): a dozen
spaces — the three samples, single-axis cakes of 2–4 boards, 2- and
3-axis rooms with 8–30 nodes and 1–2 edges per node, two 4-axis
ones — each reporting overlaps, piercings, crossings per
projection, bends, length, time, and, for the small ones, the gap
to the best of 2 000 random slot assignments. Pass: overlaps 0,
piercings 0, crossings ≤ the random-best + 1, never more than
twice the random-best, time within budget, order-independence and
the stability rule.

## Colour, for one job (owner: "at this point colour may be used after all")

The sheets stay ink on paper. Colour is admitted for exactly one
job: **telling the values of one axis apart at a glance, from any
angle** — the thing position alone cannot do once a space is
turned. It encodes identity, never emphasis or decoration.

- `color <attribute>` in the text chooses the axis (properties
  area: a 「色」 select listing the axes and 「なし」). Defaults:
  a layer cake colours its layer axis; a rooms sheet colours the
  axis in role `y` (storeys); `color off` returns to ink.
- **Palette**: eight categorical hues in fixed order, assigned to
  the axis's values in their written order (never by count, never
  cycled — a 9th value and the unnamed "—" stay ink). Light / dark
  steps, validated for adjacent colour-vision separation:
  blue `#2a78d6`/`#3987e5`, orange `#eb6834`/`#d95926`,
  aqua `#1baf7a`/`#199e70`, yellow `#eda100`/`#c98500`,
  magenta `#e87ba4`/`#d55181`, green `#008300`/`#0ca30c`,
  violet `#6250d6`/`#9085e9`, red `#e34948`/`#e66767`.
  Tokens `--hue-1 … --hue-8` beside the sheet's ink tokens
  (`light-dark()`), shared by demo and plggpress.
- **What wears it** (a value's hue = H):
  - its board / storey floor: fill H at 10 %, outline H at 1px
    (instead of pencil), the slab's side faces H at 22 %;
  - its nodes: the box's side and top faces H at 18 %, the front
    face stays paper, outline stays ink;
  - a wire: H of its **source** node, 1.25px; a wire between two
    values is therefore readable as "comes from the blue layer";
  - the value's name on its axis / board: a 8px square of H before
    the text.
- **What never wears it**: text (captions, names, values stay ink
  or graphite), sockets, arrowheads' outline, selection and hover
  (ink, as now). Quiet things lose their hue (pencil).
- Identity is never colour alone: the board's name is on the
  board, the axis names its values, the DSL says it in words.
- General seam, no rooms knowledge in the viewport: nodes, edges
  and scenery carry an optional `hue: 1…8`; the standard renderer
  maps it to the tokens.

Specs: hue follows the value's written index and survives
reordering of nodes, pinning and filtering (colour follows the
entity); a 9th value has no hue; `color off` yields the exact
ink sheet of before; captions' fill is never a hue; print / parse
round trip of `color`.

**Order (owner, right after): "only after every effort that can be
made in black and white has been made."** The colour section above
is parked — not to be implemented until the monochrome sheet is as
good as it can be: boards as things, wires along the lattice with
zero overlaps, crossings optimised with node positions, names
readable from every side, the shooting list passing. Colour then
has to earn its place against that result, not cover for what the
drawing fails to say.

## Wires along the lattice — review, adopted; the space audit's first numbers

Adopted: an edge may carry a 3D `path`, the standard renderer draws
it; rooms wires run in aisles and risers and read far better than
the stretched curves. `viewport.ts` still knows no rooms.

`scripts/space-audit.mjs` (new, reviewer-owned), 13 spaces:
**every one has overlapping runs** (rooms3 4 pairs, rooms4 10,
cakes 7–28, random spaces up to 69), one space pierces boxes (4
runs) and has 3 oblique runs; crossings 313 and bends 585 in
total. That is the owner's "lines overlap and smear", counted.
Lanes exist in the design, not yet in the result.

Seen in the browser as well: on the rooms sheet four nodes (Auth,
Users, Payments, Ledger) are drawn grey although nothing is pinned
— scenery or a stale `quiet` is veiling them again; and the layer
sheet is still the upright panes (to be replaced by the cake).

## Drawing the space well — art direction, black and white (owner: "after that, pursue spatial intuition and beauty again; it is still 20 points out of 100")

Correctness is in place (one scene, standard boxes, lattice wires,
an audit). What is missing is *drawing*: the sheet is a wireframe
with labels. A good technical illustration says depth with five
old means, none of which needs colour. Apply all five, to every
3D sheet (they belong to the standard renderer and the scenery
primitives, not to rooms):

1. **Light from the upper left: three tones for three
   orientations.** Every solid — node box, board, slab — is
   shaded by which way a face looks, the same everywhere: faces
   looking up are paper; faces looking toward the viewer's left
   are the wash; faces looking right are a darker wash (new token
   `--shade`, between wash and trace… light `#e9e9e9`, dark
   `#1f1f1f`). Front faces carrying a caption stay paper. Tone
   depends on the face's world normal and the camera's side, never
   on distance.
2. **Line weight says what is an edge of the thing and what is
   inside it.** Silhouette edges (between a visible face and
   nothing) 1.5px ink; inner edges (between two visible faces)
   0.75px ink; hidden edges are not drawn. Boards: silhouette
   1.25px ink, rulings 0.5px trace. Wires stay 1.25px.
3. **Things rest on things: cast shadows.** A node casts a flat
   shadow on its board, offset down-right along the light (a
   parallelogram, `--shade` at 60 %, no blur); a board casts the
   same on the board below, clipped to it, at 35 %. Shadows are
   scenery in the `sorted` layer just above the receiving board.
   This is what makes a box *stand* instead of float.
4. **Behind means interrupted.** A line that passes behind a
   solid stops 3px short of its silhouette and resumes 3px after
   (the paper halo already used at wire crossings, applied to
   solids). Where a vertical drop passes *through* a board, a
   small ellipse (the hole, 6 × 3 in the board's plane, ink
   0.75px, paper fill) marks the place; where it *lands*, the
   arrowhead sits on the node as usual.
5. **Rhythm: things line up.** Columns of nodes on different
   boards share x and z whenever the optimiser can (already its
   aim), so drops are parallel verticals; boards have equal
   margins (32) and equal gaps; every dimension a multiple of 16.
   Add to the audit: the share of drops that are exactly vertical
   and the number of distinct x / z coordinates used by node
   centres (fewer is calmer).

**The stage, quieter.** A single ground shadow under the whole
stack (the footprint offset along the light, `--shade` 35 %)
replaces the far-face rulings on cake sheets; rooms keep the far
faces but at 0.5px trace. Axis dimension lines stay pencil.

**Lettering.** Board names: 12px 600 ink, lying *in the board's
plane* along its front edge (isometric lettering — sheared with
the board, baseline on the edge), because a name that lies on the
board belongs to it; if the edge's projected slope makes the text
steeper than 35° or narrower than 60 %, it stands upright as a
tag instead. Node captions as decided (face ≥ 70 %, else tag).

**Opening.** A space sheet opens with the boards (or storeys)
together and moves them apart to their places in 500 ms, ease-out,
once (respecting reduced motion: no animation). 正面 ↔ 立体 turn
in 300 ms as now.

**Scoring** (the reviewer scores every round out of 100 from
browser shots at the opening view, 正面, 上, behind, and two
arbitrary angles; a round passes on to the owner at ≥ 80):
depth readable without labels 20 · which board / cell each node
is in 15 · wires followable start to end 20 · nothing overlaps
or smears 15 · line and tone hierarchy 10 · typography and
spacing 10 · calm (alignment, few coordinates) 10.

## What it is for (owner: "across many kinds of drawings, from many angles — how can the things of the world be modelled, and seen which way do they become plain")

This is the aim the space work serves, and it changes what is
judged. One pretty sample proves nothing. The questions are:
*can a real subject be written down as axes, nodes and edges
without strain*, and *is there a way of looking at it in which its
point is obvious — and does the sheet find that way itself*.

**1. Subjects, not samples.** A corpus of real things, each with
the sentence it is supposed to make plain. It is the reviewer's
shooting set, the audit's input and the gallery's source:

| subject | axes | what should be plain |
|---|---|---|
| a web service's tiers | 層 | requests fall through the layers; one service skips a layer |
| the same across environments | 層 × 環境 | 検証 lacks what 本番 has |
| teams × stages of a release | 担当 × 工程 | where work piles up; one team touches every stage |
| a supply chain | 工程 × 地域 | one region is a single point of failure |
| data lineage | 領域 × 段階 (raw / cleaned / served) × 機密度 | sensitive data reaches a public table |
| an incident | 時刻帯 × チーム | who waited on whom |
| a curriculum | 学年 × 分野 | prerequisites that jump years |
| a network | 層 (L2 / L3 / L7) × 拠点 | a path that leaves and re-enters a site |
| module dependencies | パッケージ × 層 | an upward dependency (a cycle across layers) |
| an org with projects | 部署 × 案件 × 四半期 | one person-node carrying three projects |

Each is 8–20 nodes; each goes into `space-audit.mjs` and, written
as Markdown, into the gallery.

**2. The sheet finds the telling view.** For a classified graph
there are only so many ways to look: which axis takes which role
(x, y, z, column, row — permutations, with storeys preferred for
the axis whose values are ordered like layers) and a handful of
camera positions. Score each candidate on the *projected* picture
and open with the best:

- nodes hidden behind others (area covered) — weight 5
- wire crossings on screen, wire-over-node — weight 3
- overlapping labels / tags — weight 2
- the picture's aspect against the open frame (wasted area) — 1
- wires that run against the reading direction (right-to-left,
  bottom-to-top) — 1

`bestViews(classification, frame) → { view, camera, score }[]`,
pure, the top three kept. A written `view` line fixes the roles
(then only cameras are searched). Toolbar: 「見方」 steps through
the top three, animated; the DSL shows the `view` line of the one
on screen so a liked view can be kept by writing it down.

**3. The point can be shown.** A subject's sentence is usually
about a few nodes and edges. `mark A B "A -> B"` (a line in the
text) marks them: everything else goes quiet when the sheet opens,
and the view search weights the marked things' visibility ×3. One
click on the paper clears the mark. (Emphasis through the general
`quiet` seam.)

Acceptance for this section is by the corpus: for each subject the
reviewer opens the sheet cold and writes down what they see in one
sentence *before* reading the intended one; a subject passes when
the two agree. Target 8 of 10.

## Optimised placement and the cake — review, adopted (reviewer's score: cake 45 / 100, rooms 30)

Space audit: sev3 16 → 0, sev2 3 → 0; overlapping runs 327 → 0,
piercings 4 → 0, oblique 3 → 0, crossings 313 → 214, bends
585 → 492, slowest 18 ms. The cake reads as boards one would draw.

Seen, to fix in the drawing round that follows:

- **Boards do not hide anything.** To cure the grey nodes all
  floors were moved behind the whole graph, so a board no longer
  covers the wires and nodes under it: every drop and every lower
  wire shows through and the eye cannot tell above from below.
  Correct order for a stack seen from above: lowest board, the
  nodes and in-board wires on it, then the next board up, and so
  on; a wire between boards is split at each board it passes and
  each part painted with the storey it is in. Boards are opaque
  paper. (Seen from below, the reverse.) Rooms storeys likewise,
  but their floors stay see-through (wash 14 %) because a block
  has walls of cells — there, order still matters for wires.
- **Captions are sheared 45°** at yaw −π/4 and are tiring to read.
  Opening view becomes yaw −π/6, elevation 0.55 (faces seen at
  87 % width), for cake and rooms.
- **Drops go a long way round the rims** (cakeWide 21 → 40
  crossings from rim clearance). A drop may pass *through* a board
  where no node stands — with the hole mark of the drawing
  section — when that is shorter than going round; rims are for
  when the straight way is blocked.
- Rooms at this angle: Trace and a neighbour touch; cell minimum
  depth is not respected after the optimiser's exchange — keep
  boxes 16 apart on screen-relevant directions (x and z) in every
  cell.

## See-through or not (owner, musing on the boards: "perhaps not see-through is better… hm, I see")

Both have a cost. See-through: nothing is lost, but above and
below cannot be told and everything is on top of everything.
Opaque: above and below are plain, but what a board covers is gone
until the sheet is turned.

The drafting answer is the third thing — **hidden lines**. Boards
are opaque, and what they cover is not erased but drawn the way a
drawing says "behind": the covered part of a wire dotted in
pencil (1 3), a covered node as its outline only, dashed pencil,
no fill, its caption in pencil. The covered things stay findable;
the covering is unmistakable. One rule for every solid that covers
something (boards, and nodes covering wires).

Pinning or hovering a board's name turns the boards above it to
outlines for as long as it is held, so one layer can be looked at
whole without turning.

To be tried on screen after the drawing round, against plain
opaque: keep whichever reads better at the six shooting angles.

**Owner, looking at the engine drawing in progress: "good — try
not letting the nodes be see-through."** So the hidden-line rule
narrows: **a node is solid and nothing shows through it.** What a
node covers is simply not drawn (no dotted wire across a node's
face, no dashed outline of a node behind a node). Hidden lines
remain only for what a *board* covers — and that is the thing to
compare on screen against boards that hide completely. Node faces
are opaque paper / wash / shade, never translucent.

## The name on a node's face is never smeared (owner: "the text is on the front face, yet the edges' start and end points land on it and the text is smeared and hard to read — solve this well")

Seen on the cake: arrowheads and socket dots sit on top of the
captions (Auth, Orders, Stock), and runs pass in front of faces.
Three rules, in the router, the standard node and the engine:

1. **Wires meet a node on its flanks, never on its lettered
   faces.** Sockets exist on the four flanks only (left, right,
   top, bottom), at the flank's centre *at mid-depth*; the last
   16 of a wire is perpendicular to that flank. Seen on screen the
   dot and the arrowhead then lie on the flank's surface or beyond
   the face's edge — outside the caption's box by construction.
   Dots are r 3 in 3D. An arrowhead's tip stops on the flank
   plane; its body lies outside the box.
2. **The air in front of a face is kept clear.** For routing, a
   node's box is grown by 24 toward its lettered sides (±z) as
   well as by 6 around: no run passes just in front of or behind a
   caption. (Audit: piercing is tested against this grown box.)
3. **Text has the right of way.** Whatever still crosses a
   caption's box on screen from some angle — a wire far in front,
   an axis line — is interrupted across the box plus 2px, the way
   a draughtsman breaks a line around lettering. In the engine: a
   label may `clear` — strokes painted after it are cut by its
   screen box; fills are not. Applies to node captions, tags,
   board names and axis values.

Specs: no socket or arrowhead centre projects inside its own
node's caption box at the four named views and 12 turned ones; no
run enters the grown box of a node it does not end at; with
`clear`, no stroke segment lies inside a caption box.

## The axis name embraces its values (owner: "x, y, z should each gather their elements — enclosed by a dotted line that holds them, the name centred; where they are now is half-hearted")

The name of an axis hangs off the tip of its line, beside the last
value: it belongs to nothing. An axis is drawn as two rows of
dimension lines, the second holding the first:

```
 |·· 入口 ··|·· 処理 ··|·· 保存 ··|      values, one stretch each
 |··············· 層 ···············|     the axis, one stretch for all
```

- Row 1 (as now): each value centred in the dotted line that runs
  from both ends of its stretch, extension ticks at the ends.
- Row 2: one dotted line from the first value's start to the last
  value's end, 16 further out than row 1, its extension ticks
  reaching from row 1's line; the attribute name centred in it,
  10px 600 graphite. The role letter (x / y / z) is dropped from
  the drawing — the properties area says which is which.
- No line beyond the last value, no arrowhead: an axis of
  categories has no direction to point in.
- Row 2 obeys the same outline-edge and no-overlap rules as row 1
  (it moves outward in 4px steps when its name's box meets
  anything).
- With repeated blocks (4th / 5th axis): row 2 appears on the
  first block only; the block axis itself gets the same treatment
  across all blocks — the block values (東京, 大阪) centred under
  their blocks, one dotted line holding them with 地域 centred.

## The engine draws the 3D sheets — review, adopted (reviewer's score: cake 65, rooms 50)

`viewport.ts` lost 553 lines (its depth sort, per-storey wire
splitting, 3D halos). Engine audit: surfaces, lines and pick 100 %
on all seven scenes (after one more fault of the reviewer's oracle
was fixed: samples at the very point a line goes under). Space
audit sev3 0 / sev2 0; flat wiring byte-identical.

Seen: wires are whole again — the fragments are gone; covered
parts are dotted; boards are solids with shadows; board names
stand readable at the front-left corner; rooms with storeys 256
tall read as three floors at last.

**Broken — interaction parity.** On 「立体交差」 (drawn by the
engine because its nodes have depth) selecting a node shows no
connection dots (0 port elements), so an edge cannot be added; the
sheet's grid is gone as well. Before the engine, selecting a node
showed its dots and a drag from one made an edge. Everything a
flat sheet can do must work on an engine-drawn sheet, face-on and
turned: select, marquee, drag, resize, rename, connect from a
selected node's dots, reconnect an end, insert on an edge, delete,
hover tones, the world grid on the sheet plane.

Still to do from the owner's notes: nodes solid (nothing through a
node); names never smeared; axis names embracing their values.
On rooms the storeys' cast shadows read as grey slabs — rooms
floors cast no shadow (nodes still do).
