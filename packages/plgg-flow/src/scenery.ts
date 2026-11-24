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
    const x = at({...item.anchor,x:item.anchor.x+1});
    const z = at({...item.anchor,z:item.anchor.z+1});
    const dx=x.x-p.x, dy=x.y-p.y;
    const laid=item.onSurface && Math.abs(dx)>=camera.scale*.6 && Math.abs(dy)<=Math.abs(dx)*Math.tan(35*Math.PI/180) && Math.abs(z.y-p.y)>camera.scale*.15;
    const sx=Math.sign(dx)/camera.scale, sz=Math.sign(z.y-p.y)/camera.scale;
    const { press, enter, leave } = item;
    return {
      layer: item.layer,
      depth: p.z,
      html: el<Change>(
        "text",
        [
          ...(laid ? [attr("transform", `matrix(${dx*sx} ${dy*sx} ${(z.x-p.x)*sz} ${(z.y-p.y)*sz} ${p.x} ${p.y})`)] : []),
          attr("x", String(laid ? 0 : p.x + item.offset.x)),
          attr("y", String(laid ? -5 : p.y + item.offset.y)),
          attr("text-anchor", "middle"),
          attr("dominant-baseline", "middle"),
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
  const paths = [
    item.points,
    ...(item.kind === "line"
      ? (item.strokes ?? [])
      : item.patches ?? []),
  ];
  let depth = 0,
    count = 0;
  const d = paths
    .map((path) =>
      path
        .map((point, i) => {
          const p = at(point);
          depth += p.z;
          count++;
          return (
            (i ? "L" : "M") + p.x + " " + p.y
          );
        })
        .join("") + (item.kind === "plane" ? "Z" : ""),
    )
    .join("");
  return {
    layer: item.layer,
    depth: depth / (count || 1),
    html: el<Change>(
      "path",
      [
        style,
        attr(
          "d",
          d,
        ),
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
