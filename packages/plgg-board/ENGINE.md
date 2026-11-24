# plgg-board as a 3D engine — design

Owner, 2026-11-25: "I am starting to think a solid 3D engine has to
come first — what do you think?" and "it can be built on plgg,
can't it."

Yes to both. The space work in plgg-flow has been adding, one
review at a time, exactly what a small engine does in general:
painter's order, occlusion, tone by orientation, silhouette
weights, cast shadows, interrupted lines, holes, hidden lines. Each
arrived as a special case in the flow's viewport and each new angle
finds the next hole. An engine makes "correct from any angle" true
by construction, for every sheet, once.

## What kind of engine

**A vector hidden-line / hidden-surface renderer**, not a raster
(WebGL / canvas) one.

- Output is a *drawing*: polygons, strokes and texts with exact
  geometry — what plgg-view turns into SVG. Lines stay crisp at any
  zoom, text is text, the DOM gives events and accessibility, the
  server renders the same picture, it prints, and the look is the
  ink-on-paper line drawing the sheets already have.
- Pure TypeScript on `plgg` (data-last functions, `Option` /
  `Result`, exhaustive `match`; no `as`, no `any`), no DOM, no
  dependency. It lives in `plgg-board`, which already owns the
  camera and projection.
- Scale it is built for: a few hundred solids and a few hundred
  line segments, redrawn while the camera turns.

## Model

```ts
type Scene = {
  solids: Solid[]; // convex polyhedra: vertices, faces (loops, outward)
  sheets: Sheet[]; // flat convex polygons, one- or two-sided
  lines: Line[]; // polylines in space (wires, axes, rulings)
  labels: Label[]; // text: upright at a point, or lying in a plane
  marks: Mark[]; // small figures in a plane (hole ellipse, dot)
};
```

Every item has an `id` (for picking and for the caller's styles), a
`style` key (the caller's class — the engine knows no colours) and
`casts` / `receives` for shadows. Helpers build the common ones:
`box(centre, size)`, `slab(rect, y, thickness)`, `quad(...)`.

`Light = { direction: Point3 }`; `Camera` as today (parallel
projection first; perspective keeps working through the same
homogeneous pipeline).

## Pipeline — `render(scene, camera, light) → Drawing`

1. **View transform** of all vertices; back faces culled.
2. **Hidden surfaces: a BSP tree** over faces and sheets, built once
   per scene (splitting where planes cut one another; a lattice
   scene splits almost never) and walked per camera — exact
   back-to-front order with no cycles, no sort heuristics.
3. **Edges classified** per solid: *silhouette* (one adjacent face
   visible, the other not or none), *crease* (both visible),
   *hidden* (neither).
4. **Hidden lines, analytically**: every edge and every line
   segment is clipped against the faces nearer than it — segment
   against convex polygon in screen space, depth compared on the
   overlap — giving visible and hidden intervals. Hidden intervals
   are emitted as their own class (the caller may draw them dashed
   or not at all).
5. **Tone**: each visible face carries its world normal's class
   under the light: `up`, `lit`, `shade` (three orientations — more
   only if a caller asks).
6. **Cast shadows**: a caster's silhouette projected along the
   light onto each receiving plane, clipped to the receiver's
   polygon and to what is visible of it.
7. **Line over line**: where two visible lines cross on screen the
   nearer one carries a gap marker on the farther (the halo).
8. **Passing through**: where a line crosses a sheet or a slab's
   face inside its polygon, a `hole` mark at the crossing, in the
   plane.
9. **Labels**: visibility of the anchor (visible / covered →
   class); lying labels get the plane's affine matrix; the engine
   reports each label's screen box so callers can separate them.
10. **Pick**: `pick(drawing, point) → id | none` — the nearest item
    under a screen point, from the same visibility data.

`Drawing` is plain data in paint order:
`{ fills: {id, style, tone, points}[]; strokes: {id, style, kind:
"silhouette"|"crease"|"line"|"hidden", points}[]; shadows; marks;
labels }` — batched by class so the SVG stays near a few hundred
elements. `toSvg(drawing, styles)` and a plgg-view adapter are thin.

## Performance

- BSP built once per scene edit; per camera only a walk and the
  clipping. Target: 60 solids + 300 line segments in **under 4 ms**
  per frame in Node, measured by the audit.
- A moved solid re-inserts its own faces; nothing else is rebuilt.
- A uniform grid over screen boxes prunes the clipping pairs.

## Proof — an oracle, not opinions

`scripts/engine-audit.mjs` (reviewer-owned). For a set of scenes
(boxes on stacked slabs, lattice wires through them, a rooms block,
random convex solids, a degenerate edge-on view) and 50 seeded
cameras each:

- a 256 × 256 **z-buffer rasteriser** written in the audit (thirty
  lines, obviously correct) draws the same scene per item id;
- the engine's drawing is rasterised with the same grid;
- **the two id-images must agree** on at least 99.5 % of pixels
  (the rest is edge anti-alias), and every line's visible /
  hidden split must agree with the z-buffer along the line.

Plus invariants: a box has 1–3 visible faces and a closed
silhouette loop of 4 or 6 edges from every direction; a line
behind a box is hidden exactly between the box's silhouette
crossings; a shadow lies inside its receiver; `pick` returns what
the z-buffer shows at that pixel; time within budget.

## Bringing the sheets onto it

- plgg-flow's viewport hands 3D sheets to the engine: node →
  `box`, wire with a 3D path → `Line`, scenery planes → `Sheet` /
  `slab`, scenery lines and labels as they are. Styles (ink,
  pencil, wash, shade, weights, dashes) stay in the sheet's CSS,
  keyed by the engine's classes.
- Flat sheets (camera face-on, no depth) keep today's 2D path — it
  is the same picture and already fast.
- What the viewport drops: its own depth sort, wire depth runs,
  bridge halos, body faces, paint-order rules for scenery, hit
  testing by geometry.
- The art direction in plgg-flow/LAYOUT.md ("Drawing the space
  well") becomes a style sheet over the engine's output rather than
  code: three tones, silhouette 1.5 / crease 0.75, shadows, gaps,
  holes, hidden lines dashed.

## Order of work

1. Engine core in plgg-board with the audit: scene, BSP,
   visibility, edges, tone, pick; `toSvg`. A page in the gallery
   that turns a test scene (the audit's scenes), so it can be
   looked at on its own.
2. Shadows, holes, line gaps, lying labels.
3. plgg-flow's 3D sheets move onto it; the viewport's own 3D
   drawing is deleted.
4. Then the art direction, the hidden-line comparison, the
   subjects and the view search, on top.
