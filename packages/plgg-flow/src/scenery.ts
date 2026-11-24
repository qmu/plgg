import { project, type Camera } from "plgg-board";
import {
  el,
  attr,
  text,
  onEvent,
} from "plgg-view";
import { none, some } from "plgg";
import type { Change, Scenery } from "./model";

export const drawScenery = (
  item: Scenery,
  camera: Camera,
) => {
  const at = project(camera);
  const style = attr("pointer-events", "none");
  if (item.kind === "label") {
    const p = at(item.anchor);
    const x = at({
      ...item.anchor,
      x: item.anchor.x + 1,
    });
    const z = at({
      ...item.anchor,
      z: item.anchor.z + 1,
    });
    const dx = x.x - p.x,
      dy = x.y - p.y;
    const laid =
      item.onSurface &&
      Math.abs(dx) >= camera.scale * 0.6 &&
      Math.abs(dy) <=
        Math.abs(dx) *
          Math.tan((35 * Math.PI) / 180) &&
      Math.abs(z.y - p.y) > camera.scale * 0.15;
    const sx = Math.sign(dx) / camera.scale,
      sz = Math.sign(z.y - p.y) / camera.scale;
    const { press, enter, leave } = item;
    return {
      layer: item.layer,
      depth: p.z,
      html: el<Change>(
        "text",
        [
          ...(laid
            ? [
                attr(
                  "transform",
                  `matrix(${dx * sx} ${dy * sx} ${(z.x - p.x) * sz} ${(z.y - p.y) * sz} ${p.x} ${p.y})`,
                ),
              ]
            : []),
          attr(
            "x",
            String(
              laid ? 0 : p.x + item.offset.x,
            ),
          ),
          attr(
            "y",
            String(
              laid ? 0 : p.y + item.offset.y,
            ),
          ),
          attr("text-anchor", "middle"),
          attr(
            "dominant-baseline",
            laid ? "alphabetic" : "middle",
          ),
          attr(
            "style",
            `font-size:${item.size}px;font-weight:${item.weight};fill:${item.tone} !important${press ? ";cursor:pointer" : ""}`,
          ),
          ...(press
            ? [
                attr("pointer-events", "all"),
                onEvent<Change>(
                  "pointerdown",
                  (e) => {
                    e.stopPropagation();
                    return none();
                  },
                ),
                onEvent<Change>("click", (e) => {
                  e.stopPropagation();
                  return some(press);
                }),
              ]
            : [style]),
          ...(enter
            ? [
                onEvent<Change>(
                  "pointerenter",
                  () => some(enter),
                ),
              ]
            : []),
          ...(leave
            ? [
                onEvent<Change>(
                  "pointerleave",
                  () => some(leave),
                ),
              ]
            : []),
        ],
        [text(item.text)],
      ),
    };
  }
  if (item.kind === "plane" && item.thickness) {
    const top = item.points.map(at),
      bottom = item.points.map((p) =>
        at({ ...p, y: p.y + item.thickness! }),
      );
    const center = top.reduce(
      (p, q) => ({
        x: p.x + q.x / top.length,
        z: p.z + q.z / top.length,
      }),
      { x: 0, z: 0 },
    );
    const polygon = (points: typeof top) =>
      points
        .map(
          (p, i) =>
            (i ? "L" : "M") + p.x + " " + p.y,
        )
        .join("") + "Z";
    const face = (
      points: typeof top,
      fill: string,
      opacity: number,
    ) =>
      el<Change>(
        "path",
        [
          attr("d", polygon(points)),
          attr("fill-opacity", String(opacity)),
          attr(
            "style",
            `fill:${fill};stroke:${item.tone};stroke-width:${item.width ?? 1}px;stroke-linejoin:round`,
          ),
        ],
        [],
      );
    const above = Math.sin(camera.pitch) <= 0;
    const sides = top.flatMap((a, i) => {
      const j = (i + 1) % top.length,
        b = top[j]!;
      if ((a.z + b.z) / 2 <= center.z + 1e-8)
        return [];
      return [
        face(
          [a, b, bottom[j]!, bottom[i]!],
          (a.x + b.x) / 2 < center.x
            ? "var(--wash,white)"
            : "var(--shade,#e9e9e9)",
          1,
        ),
      ];
    });
    const surface = face(
      above ? top : bottom,
      above ? item.fill : "var(--shade,#e9e9e9)",
      item.opacity,
    );
    const halo =
      item.opacity === 1
        ? [
            el<Change>(
              "path",
              [
                attr(
                  "d",
                  polygon(top) + polygon(bottom),
                ),
                attr("fill", "none"),
                attr(
                  "style",
                  "stroke:var(--paper,white);stroke-width:7.25px;stroke-linejoin:round",
                ),
              ],
              [],
            ),
          ]
        : [];
    return {
      layer: item.layer,
      depth: center.z,
      html: el<Change>(
        "g",
        [style],
        [...halo, ...sides, surface],
      ),
    };
  }
  const paths = [
    item.points,
    ...(item.kind === "line"
      ? (item.strokes ?? [])
      : (item.patches ?? [])),
  ];
  let depth = 0,
    count = 0;
  const d = paths
    .map(
      (path) =>
        path
          .map((point, i) => {
            const p = at(point);
            depth += p.z;
            count++;
            return (
              (i ? "L" : "M") + p.x + " " + p.y
            );
          })
          .join("") +
        (item.kind === "plane" ? "Z" : ""),
    )
    .join("");
  return {
    layer: item.layer,
    depth: depth / (count || 1),
    html: el<Change>(
      "path",
      [
        style,
        attr("d", d),
        attr(
          "style",
          `stroke-width:${item.width ?? 1}px;stroke:${item.tone};fill:${item.kind === "plane" ? item.fill : "none"}`,
        ),
        ...(item.kind === "plane"
          ? [
              attr(
                "fill-opacity",
                String(item.opacity),
              ),
            ]
          : item.dotted
            ? [attr("stroke-dasharray", "1 3")]
            : []),
      ],
      [],
    ),
  };
};
