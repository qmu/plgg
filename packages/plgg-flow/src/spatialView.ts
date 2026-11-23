import { nodeSize } from "plgg-flow/nodeSize";
import { isSome } from "plgg";
import { project, type Point3 } from "plgg-board";
import {
  el,
  attr,
  text,
  type Html,
} from "plgg-view";
import {
  angle3,
  distance3,
} from "plgg-flow/spatial";
import type { Change, Flow } from "./model";
const a = (
  name: string,
  value: string | number,
) => attr(name, String(value));
export const spatialGuides = (
  state: Flow,
): Html<Change>[] => {
  const at = project(state.camera),
    world = state.spatial,
    items: Html<Change>[] = [];
  const line = (
    a0: Point3,
    b0: Point3,
    color: string,
    dash: string,
  ) => {
    const p = at(a0),
      q = at(b0);
    return el(
      "line",
      [
        a("x1", p.x),
        a("y1", p.y),
        a("x2", q.x),
        a("y2", q.y),
        a("stroke", color),
        a("stroke-width", 2),
        a("stroke-dasharray", dash),
      ],
      [],
    );
  };
  const label = (
    p: Point3,
    value: string,
    color: string,
  ) =>
    el(
      "text",
      [
        a("x", at(p).x + 5),
        a("y", at(p).y - 7),
        a(
          "style",
          "fill:" +
            color +
            ";paint-order:stroke;stroke:white;stroke-width:3px",
        ),
      ],
      [text(value)],
    );
  if (world?.axes) {
    const origin = { x: 0, y: 0, z: 0 };
    for (const [axis, color] of [
      ["x", "#ad4c41"],
      ["y", "#3c7653"],
      ["z", "#3268a0"],
    ] satisfies [keyof Point3, string][]) {
      const end = { ...origin, [axis]: 100 };
      items.push(
        line(origin, end, color, "none"),
        label(end, axis.toUpperCase(), color),
      );
    }
  }
  const lookup = new Map(
    state.nodes.map((n) => [n.id, n.position]),
  );
  for (const dimension of world?.dimensions ??
    []) {
    const [i, j, k] = dimension.nodes,
      p = lookup.get(i ?? ""),
      q = lookup.get(j ?? ""),
      r = lookup.get(k ?? "");
    if (!p || !q) continue;
    if (dimension.kind === "distance") {
      const middle = {
        x: (p.x + q.x) / 2,
        y: (p.y + q.y) / 2,
        z: (p.z + q.z) / 2,
      };
      items.push(
        line(p, q, "#855327", "3 3"),
        label(
          middle,
          distance3(p, q).toFixed(1) + " u",
          "#76451e",
        ),
      );
    } else if (r) {
      const v = angle3(p, q, r);
      if (isSome(v))
        items.push(
          line(p, q, "#86517a", "4 4"),
          line(q, r, "#86517a", "4 4"),
          label(
            q,
            v.content.toFixed(1) + "°",
            "#74446c",
          ),
        );
    }
  }
  return items.length
    ? [
        el(
          "g",
          [
            a("pointer-events", "none"),
            a("class", "spatial-guides"),
          ],
          items,
        ),
      ]
    : [];
};

/** Accumulate visible child extents from the leaves up so an outer group
 * contains the padded volumes of its nested groups as well as its own card. */
export const groupVolumes = (
  nodes: Flow["nodes"],
  camera: Flow["camera"],
  selection: ReadonlySet<string>,
): Html<Change>[] => {
  if (!nodes.some((n) => n.group && !n.collapsed))
    return [];
  const boxes = new Map(
    nodes.map((n) => {
      const { x, y, z } = n.position,
        w = nodeSize(n).width / 2,
        h = nodeSize(n).height / 2;
      return [
        n.id,
        {
          left: x - w,
          right: x + w,
          top: y - h,
          bottom: y + h,
          back: z,
          front: z,
        },
      ];
    }),
  );
  const children = new Map<
      string,
      (typeof nodes)[number][]
    >(),
    order: (typeof nodes)[number][] = [];
  for (const n of nodes) {
    if (
      n.parent === undefined ||
      !boxes.has(n.parent)
    )
      order.push(n);
    else {
      const siblings = children.get(n.parent);
      if (siblings) siblings.push(n);
      else children.set(n.parent, [n]);
    }
  }
  for (let i = 0; i < order.length; i++)
    for (const child of children.get(
      order[i]!.id,
    ) ?? [])
      order.push(child);
  const at = project(camera),
    volumes: Html<Change>[] = [];
  for (let i = order.length - 1; i >= 0; i--) {
    const n = order[i]!,
      box = boxes.get(n.id)!;
    if (n.group && !n.collapsed) {
      box.left -= 12;
      box.right += 12;
      box.top -= 12;
      box.bottom += 12;
      box.back -= 16;
      box.front += 16;
      const face = (z: number) =>
        [
          [box.left, box.top],
          [box.right, box.top],
          [box.right, box.bottom],
          [box.left, box.bottom],
        ].map(([x, y]) =>
          at({ x: x!, y: y!, z }),
        );
      let far = face(box.back),
        near = face(box.front);
      if (far[0]!.z > near[0]!.z)
        [far, near] = [near, far];
      const xy = (p: Point3) => p.x + " " + p.y;
      const outline = (points: Point3[]) =>
        "M" + points.map(xy).join(" L") + " Z";
      const sides = near
        .map(
          (p, j) =>
            "M" + xy(p) + " L" + xy(far[j]!),
        )
        .join(" ");
      volumes.push(
        el(
          "g",
          [
            a("data-group-volume", n.id),
            a("pointer-events", "none"),
            a("aria-hidden", "true"),
            a(
              "stroke",
              selection.has(n.id)
                ? "#ae603c"
                : "#427b75",
            ),
            a("fill", "none"),
          ],
          [
            el(
              "path",
              [
                a("d", outline(far)),
                a("stroke-dasharray", "4 4"),
                a("opacity", 0.5),
              ],
              [],
            ),
            el(
              "path",
              [a("d", sides), a("opacity", 0.65)],
              [],
            ),
            el(
              "path",
              [
                a("d", outline(near)),
                a("fill", "#569d94"),
                a("fill-opacity", 0.05),
              ],
              [],
            ),
          ],
        ),
      );
    }
    const parent =
      n.parent === undefined
        ? undefined
        : boxes.get(n.parent);
    if (parent) {
      parent.left = Math.min(
        parent.left,
        box.left,
      );
      parent.right = Math.max(
        parent.right,
        box.right,
      );
      parent.top = Math.min(parent.top, box.top);
      parent.bottom = Math.max(
        parent.bottom,
        box.bottom,
      );
      parent.back = Math.min(
        parent.back,
        box.back,
      );
      parent.front = Math.max(
        parent.front,
        box.front,
      );
    }
  }
  return volumes.reverse();
};
