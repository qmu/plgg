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
    const { press, enter, leave } = item;
    return {
      layer: item.layer,
      depth: p.z,
      html: el<Change>(
        "text",
        [
          attr("x", String(p.x + item.offset.x)),
          attr("y", String(p.y + item.offset.y)),
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
