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
