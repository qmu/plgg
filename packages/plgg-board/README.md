# plgg-board

> Part of the [plgg monorepo](../../README.md).

Platform-independent 3D drawing and camera geometry. It has no DOM dependency;
[plgg-flow](../plgg-flow/README.md) draws its boards with it.

- `frontCamera`, `orbit`, `pan`, `zoomAt` — move the camera
- `project`, `projectedScale`, `worldDelta` — map world points to the screen and back
- `fit` — frame a set of points
- `projectStroke`, `projectLayer` — project drawn strokes and layers

## Vector scene renderer

Build a scene from convex solids with outward face loops, convex sheets, polylines, marks and labels. Give each item a unique `id` and a CSS `style` key. Keep scenes immutable. Camera changes reuse the scene’s BSP. Replacing a solid while retaining the sheets array lets the renderer reuse existing geometry and reinsert the changed faces.

```ts
const drawing = render(
  {
    solids: [
      box(
        { x: 0, y: 0, z: 0 },
        { x: 96, y: 48, z: 24 },
        { id: "body", style: "wood" },
      ),
    ],
    sheets: [], lines: [], marks: [], labels: [],
  },
  frontCamera({ x: 0, y: 0 }),
  { direction: { x: 0.5, y: 1, z: -0.3 } },
);
const id = pick(drawing, { x: 0, y: 0 });
const svg = toSvg(drawing, {
  wood: "fill:tan",
  silhouette: "stroke:black;fill:none",
  hidden: "display:none",
});
```

`slab({ x, z, width, depth }, y, thickness, item)` extends from the minimum corner towards positive coordinates. `quad(a, b, c, d, item)` makes a two-sided sheet. Set `oneSided` to cull its back. Light direction follows the travelling rays. Set `casts` on a solid or sheet and `receives` on a surface to enable shadows. World up is negative Y.

Fills are BSP fragments in paint order. Strokes retain complete visible and hidden intervals. Gap marks identify the farther stroke at a crossing, and the SVG writer cuts that stroke. Hole marks carry their receiving face’s projected basis. Label and mark anchors use `point`; optional `axes: { u, v }` place them in a plane. A label’s optional `size: { x, y }` is the text width and ascent in those local coordinates. The default estimate is eight units per character and sixteen units high. Style `covered` to control covered text.

The perspective renderer clips geometry at the camera’s minimum projection denominator. Drawing depths use camera depth divided by the homogeneous denominator so interpolation stays linear in screen coordinates.

After `npm run build`, run `node gallery/turn.mjs` and open `dist/gallery.html` for an offline, pausable rotation of the audit’s line-behind-box scene.
