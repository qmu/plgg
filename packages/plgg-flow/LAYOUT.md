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
