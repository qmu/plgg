import {
  box,
  slab,
  render,
  strokePath,
  clearLabelStrokes,
  pick,
  facingXYPlane,
  project,
  type Solid,
  type Sheet,
  type Line,
  type Mark,
  type Label,
  type DrawLabel,
  type Point,
  type Point3,
} from "plgg-board";
import {
  el,
  attr,
  text,
  type Html,
} from "plgg-view";
import { isSome, getOr } from "plgg";
import {
  type Flow,
  type FlowNode,
  type Edge,
  type Change,
  type Scenery,
  quietMarked,
  selectedNodes,
  selectedEdges,
} from "plgg-flow/model";
import {
  bodyDepth,
  captionTagged,
} from "plgg-flow/nodeBody";
import {
  nodeSize,
  labelWidth,
} from "plgg-flow/nodeSize";
import {
  type Wire,
  type Side,
} from "plgg-flow/wiring";
import { type Port } from "plgg-flow/connections";

import {
  roomBlocks,
  stageBounds,
} from "plgg-flow/roomView";

const off = (p: Point3) => p.z !== 0;
export const spatialDrawing = (
  flow: Flow,
  wires: readonly Wire[],
) =>
  Boolean(
    flow.camera.yaw ||
      flow.camera.pitch ||
      // a bare node is named beside it, which only
      // this drawing does
      flow.nodes.some(
        (n) => n.bare || off(n.position),
      ) ||
      wires.some((w) =>
        (w.edge.path ?? w.points).some(off),
      ) ||
      flow.scenery?.some((s) =>
        s.kind === "label"
          ? off(s.anchor)
          : s.points.some(off) ||
            (s.kind === "plane"
              ? s.thickness ||
                s.patches?.some((p) =>
                  p.some(off),
                )
              : s.strokes?.some((p) =>
                  p.some(off),
                )),
      ),
  );
export type SheetTarget = {
  node?: string;

  id?: string;
  edge?: Edge;
  port?: {
    node: string;
    point: Point3;
    handle: string | undefined;
    direction: Port["direction"];
  };
  label?: Extract<Scenery, { kind: "label" }>;
};
const tagged = new WeakMap<
  readonly FlowNode[],
  boolean
>();
// Keep BSP geometry stable across camera and interaction changes.
const geometry = new WeakMap<
  Flow["edges"],
  { solids: Solid[]; sheets: Sheet[] }
>();
const samePoints = (
  a: readonly Point3[],
  b: readonly Point3[],
) =>
  a.length === b.length &&
  a.every(
    (p, i) =>
      p.x === b[i]?.x &&
      p.y === b[i]?.y &&
      p.z === b[i]?.z,
  );
const path = (points: readonly Point[]) =>
  "M" +
  points.map((p) => p.x + " " + p.y).join("L");
export const engineView = (
  flow: Flow,
  nodes: readonly FlowNode[],
  edges: readonly {
    edge: Edge;
    original: Edge;
  }[],
  wires: readonly Wire[],
  caption: (node: FlowNode) => Html<Change>,
) => {
  const solids: Solid[] = [],
    sheets: Sheet[] = [],
    lines: Line[] = [],
    marks: Mark[] = [],
    labels: Label[] = [];
  const quietInk = new Set<string>();
  const captions = new Map<string, FlowNode>();
  const targets = new Map<string, SheetTarget>(),
    offsets = new Map<string, Point>(),
    styles = new Map<string, string>();
  const { camera } = flow,
    selected = new Set(selectedNodes(flow)),
    chosen = new Set(selectedEdges(flow));

  const socket = (
    node: string,
    side: Side,
    point: Point3,
    direction: Port["direction"],
    handle: string | undefined,
  ) => {
    const id = JSON.stringify([
      "socket",
      node,
      side,
      point,
      handle,
    ]);
    if (targets.has(id)) return;

    targets.set(id, {
      port: { node, point, direction, handle },
    });
    if (quietMarked(flow, node)) quietInk.add(id);
    marks.push({ id, style: "socket", point });
  };
  const originals = new Map(
    edges.map((e) => [e.edge, e.original]),
  );
  const wireItems = new Map<string, Wire>();
  const edgeIndices = new Map(
    flow.edges.map((edge, i) => [edge, i]),
  );
  for (const [index, w] of wires.entries()) {
    const id = "wire" + index,
      edge = originals.get(w.edge) ?? w.edge,
      style =
        "wire" +
        (chosen.has(edge) ||
        flow.hoveredEdge === edge ||
        [edge.source, edge.target].some(
          (n) =>
            selected.has(n) ||
            flow.hoveredNode === n,
        )
          ? " active"
          : edge.quiet || quietMarked(flow, edge)
            ? " quiet"
            : "");
    if (style.endsWith(" quiet"))
      quietInk.add(id);
    targets.set(id, { edge });
    wireItems.set(id, w);
    lines.push({
      id,
      style,
      points: w.edge.path ?? w.points,
    });
    const arrow = (
      tip: Point3,
      toward: Point3,
    ) => {
      const dx = toward.x - tip.x,
        dy = toward.y - tip.y,
        dz = toward.z - tip.z,
        length = Math.hypot(dx, dy, dz) || 1;
      // The head is 12 long and 9 wide, and it is turned
      // about its wire to face the eye, so that it reads
      // as an arrow from any side.
      const along = {
        x: dx / length,
        y: dy / length,
        z: dz / length,
      };
      const base = {
        x: tip.x - 12 * along.x,
        y: tip.y - 12 * along.y,
        z: tip.z - 12 * along.z,
      };
      const eye = {
        x:
          -Math.sin(flow.camera.yaw) *
          Math.cos(flow.camera.pitch),
        y: Math.sin(flow.camera.pitch),
        z:
          Math.cos(flow.camera.yaw) *
          Math.cos(flow.camera.pitch),
      };
      const cross = {
        x: along.y * eye.z - along.z * eye.y,
        y: along.z * eye.x - along.x * eye.z,
        z: along.x * eye.y - along.y * eye.x,
      };
      const size = Math.hypot(
        cross.x,
        cross.y,
        cross.z,
      );
      const wing =
        size > 0.2
          ? {
              x: (4.5 * cross.x) / size,
              y: (4.5 * cross.y) / size,
              z: (4.5 * cross.z) / size,
            }
          : { x: 4.5, y: 0, z: 0 };
      sheets.push({
        id,
        style: "arrow",
        opaqueInk: true,
        points: [
          tip,
          {
            x: base.x + wing.x,
            y: base.y + wing.y,
            z: base.z + wing.z,
          },
          {
            x: base.x - wing.x,
            y: base.y - wing.y,
            z: base.z - wing.z,
          },
        ],
      });
    };
    if (
      edge.arrows !== "none" &&
      edge.arrows !== "backward"
    )
      arrow(w.target, {
        ...w.target,
        x:
          w.target.x +
          (w.targetSide === "right"
            ? -1
            : w.targetSide === "left"
              ? 1
              : 0),
        y:
          w.target.y +
          (w.targetSide === "bottom"
            ? -1
            : w.targetSide === "top"
              ? 1
              : 0),
      });
    if (
      edge.arrows === "both" ||
      edge.arrows === "backward"
    ) {
      const q =
          (edge.path ?? w.points)[1] ?? w.target,
        p = w.source;
      arrow(p, {
        x: 2 * p.x - q.x,
        y: 2 * p.y - q.y,
        z: 2 * p.z - q.z,
      });
    }
    if (
      !selected.has(edge.source) &&
      !isSome(flow.source)
    )
      socket(
        edge.source,
        w.sourceSide,
        w.source,
        "source",
        edge.sourceHandle,
      );
    if (edge.label)
      labels.push({
        id,
        style: "edge-caption",
        point:
          w.points[
            Math.floor(w.points.length / 2)
          ] ?? w.source,
        text: edge.label,
      });
  }
  const boards = (flow.scenery ?? [])
    .flatMap((s, i) =>
      s.kind === "plane" && s.thickness
        ? [
            {
              id: "scenery" + i,
              level: s.points[0]!.y,
              points: s.points,
            },
          ]
        : [],
    )
    .sort((a, b) => a.level - b.level);
  const receiver = (p: Point3) =>
    boards.find(
      (b) =>
        b.level > p.y &&
        p.x >=
          Math.min(...b.points.map((q) => q.x)) &&
        p.x <=
          Math.max(...b.points.map((q) => q.x)) &&
        p.z >=
          Math.min(...b.points.map((q) => q.z)) &&
        p.z <=
          Math.max(...b.points.map((q) => q.z)),
    )?.id;
  const parents = new Map(
    nodes
      .filter((n) => n.group && !n.collapsed)
      .map((n) => [n.id, n]),
  );
  const upright = captionTagged(
    camera,
    tagged.get(flow.nodes),
  );
  tagged.set(flow.nodes, upright);
  const at = project(camera);
  for (const n of nodes) {
    if (flow.focus && !flow.focus.has(n.id))
      continue;
    const id = "node:" + n.id,
      size = nodeSize(n),
      d = bodyDepth(n),
      p = n.position;
    const parent = parents.get(n.parent ?? "");
    if (parent && parent.position.z !== p.z)
      lines.push({
        id,
        style: "stem",
        points: [
          { ...p, z: parent.position.z },
          p,
        ],
      });
    targets.set(id, { node: n.id });
    captions.set(id, n);
    if (quietMarked(flow, n.id)) quietInk.add(id);
    const style =
      "node" +
      (selected.has(n.id) ||
      flow.hoveredNode === n.id
        ? " active"
        : n.quiet || quietMarked(flow, n.id)
          ? " quiet"
          : "");
    const tray = n.group && !n.collapsed;
    if (tray) {
      const points = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([x, y]) => ({
        ...p,
        x: p.x + (x! * size.width) / 2,
        y: p.y + (y! * size.height) / 2,
      }));
      sheets.push({
        id,
        style: "tray",
        opaqueInk: true,
        points,
      });
    } else
      solids.push(
        box(
          p,
          {
            x: size.width,
            y: size.height,
            z: 2 * d,
          },
          {
            id,
            style,
            opaqueInk: true,
            casts: !!receiver(p),
            shadowReceiver: receiver(p) ?? "",
          },
        ),
      );
    const sign =
        facingXYPlane(camera, p.z) >= 0 ? 1 : -1,
      width = labelWidth(n.label);
    const face = {
      ...p,
      z: tray ? p.z : p.z + sign * d,
    };
    const fitsFace = () => {
      const centre = at(face);
      const corner = (x: number, y: number) =>
        at({
          x: face.x + sign * x,
          y: face.y + y,
          z: face.z,
        });
      const u = corner(1, 0),
        v = corner(0, 1);
      const w = size.width / 2,
        h = size.height / 2;
      const corners = [
        corner(-w, -h),
        corner(w, -h),
        corner(w, h),
        corner(-w, h),
      ];
      return corners.every((p, i) => {
        const q = corners[(i + 1) % 4]!;
        const nx = q.y - p.y,
          ny = p.x - q.x;
        // Compare the face edge with the transformed text rectangle
        // and its two screen pixels of clearance on each side.
        const alongNormal = (q: Point) =>
          Math.abs(
            nx * (q.x - centre.x) +
              ny * (q.y - centre.y),
          );
        return (
          alongNormal(p) >=
          (alongNormal(u) * width) / 2 +
            alongNormal(v) * 8 +
            2 * (Math.abs(nx) + Math.abs(ny))
        );
      });
    };
    const tag =
      !tray &&
      (upright || !!n.bare || !fitsFace());
    const eye = {
      x:
        -Math.sin(camera.yaw) *
        Math.cos(camera.pitch),
      y: Math.sin(camera.pitch),
      z:
        Math.cos(camera.yaw) *
        Math.cos(camera.pitch),
    };
    const point = face;
    if (tag && !tray) {
      if (
        Math.abs(eye.x) > Math.abs(eye.z) &&
        Math.abs(eye.x) >= Math.abs(eye.y)
      ) {
        point.z = p.z;
        point.x +=
          (Math.sign(eye.x) * size.width) / 2;
      } else if (
        Math.abs(eye.y) > Math.abs(eye.z)
      ) {
        point.z = p.z;
        point.y +=
          (Math.sign(eye.y) * size.height) / 2;
      }
    }
    labels.push({
      id,
      style: tag ? "tag" : "caption",
      clear: true,
      // a node behind another keeps its name, on a tag
      behind: "tag",
      text: n.label,
      point,
      size: { x: width, y: 16 },
      ...(!tag && {
        axes: {
          u: { x: sign, y: 0, z: 0 },
          v: { x: 0, y: 1, z: 0 },
        },
      }),
    });
  }
  for (const [i, s] of (
    flow.scenery ?? []
  ).entries()) {
    const id = "scenery" + i,
      style = id;
    if (s.kind === "label") {
      targets.set(id, { label: s, id });
      styles.set(
        style,
        `font-size:${s.size}px;font-weight:${s.weight};fill:${s.tone} !important`,
      );
      labels.push({
        id,
        style,
        clear: true,
        text: s.text,
        point: s.anchor,
        size: {
          x: (labelWidth(s.text) * s.size) / 13,
          y: s.size,
        },
      });
      offsets.set(id, s.offset);
    } else if (s.kind === "line") {
      styles.set(
        style,
        `--stroke:${s.tone};--weight:${s.width ?? 1};stroke-dasharray:${s.dotted ? "1 3" : "none"}`,
      );
      for (const points of [
        s.points,
        ...(s.strokes ?? []),
      ])
        lines.push({ id, style, points });
    } else if (s.thickness) {
      const xs = s.points.map((p) => p.x),
        zs = s.points.map((p) => p.z);
      solids.push(
        slab(
          {
            x: Math.min(...xs),
            z: Math.min(...zs),
            width:
              Math.max(...xs) - Math.min(...xs),
            depth:
              Math.max(...zs) - Math.min(...zs),
          },
          s.points[0]!.y,
          s.thickness,
          {
            id,
            style: "board",
            casts:
              s.casts !== false &&
              !!receiver(s.points[0]!),
            shadowReceiver:
              receiver(s.points[0]!) ?? "",
            receives: true,
          },
        ),
      );
    } else {
      styles.set(
        style,
        `--surface:${s.fill};--opacity:${s.opacity};--stroke:${s.tone}`,
      );
      for (const points of [
        s.points,
        ...(s.patches ?? []),
      ])
        sheets.push({
          id,
          style,
          points,
        });
    }
  }
  const prior = geometry.get(flow.edges);
  const reuse = <T extends Solid | Sheet>(
    items: T[],
    previous: T[] | undefined,
    points: (item: T) => readonly Point3[],
  ) => {
    if (!previous) return items;
    const next = items.map((s, i) => {
      const old = previous[i];
      return old &&
        old.id === s.id &&
        old.style === s.style &&
        old.casts === s.casts &&
        old.shadowReceiver === s.shadowReceiver &&
        samePoints(points(old), points(s))
        ? old
        : s;
    });
    return next.length === previous.length &&
      next.every((s, i) => s === previous[i])
      ? previous
      : next;
  };
  const shapes = {
    solids: reuse(
      solids,
      prior?.solids,
      (s) => s.vertices,
    ),
    sheets: reuse(
      sheets,
      prior?.sheets,
      (s) => s.points,
    ),
  };
  geometry.set(flow.edges, shapes);
  const drawing = render(
    { ...shapes, lines, marks, labels },
    camera,
    { direction: { x: 0.45, y: 1, z: -0.35 } },
    { deferLabelClear: true },
  );
  const children: Html<Change>[] = [];
  const shape = (
    style: string,
    kind: string,
    d: string,
    id?: string,
  ) =>
    el<Change>(
      "path",
      [
        attr(
          "class",
          style +
            " " +
            kind +
            (style === "arrow" &&
            id &&
            quietInk.has(id)
              ? " quiet"
              : ""),
        ),
        ...(id ? [attr("data-id", id)] : []),
        attr("style", styles.get(style) ?? ""),
        attr("d", d),
      ],
      [],
    );
  for (const f of drawing.fills)
    children.push(
      shape(
        f.style,
        f.tone,
        path(f.points) + "Z",
        f.id,
      ),
    );
  for (const s of drawing.shadows)
    children.push(
      shape(
        s.style,
        "shadow",
        path(s.points) + "Z",
      ),
    );
  const strokeIndex = children.length;
  for (const m of drawing.marks)
    if (!m.covered && m.kind !== "gap")
      children.push(
        el(
          "ellipse",
          [
            attr(
              "class",
              m.kind +
                (quietInk.has(m.id)
                  ? " quiet"
                  : ""),
            ),
            attr("data-id", m.id),
            attr(
              "transform",
              "matrix(" +
                m.matrix.join(" ") +
                ")",
            ),
            attr(
              "rx",
              m.style === "socket" ||
                m.kind === "hole"
                ? "3"
                : "2",
            ),
            attr(
              "ry",
              m.kind === "hole"
                ? "1.5"
                : m.style === "socket"
                  ? "3"
                  : "2",
            ),
          ],
          [],
        ),
      );
  const boxes = new Map<
    string,
    {
      left: number;
      top: number;
      right: number;
      bottom: number;
    }
  >();
  for (const f of drawing.fills) {
    if (!captions.has(f.id)) continue;
    const bounds = boxes.get(f.id) ?? {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    };
    for (const p of f.points) {
      bounds.left = Math.min(bounds.left, p.x);
      bounds.right = Math.max(bounds.right, p.x);
      bounds.top = Math.min(bounds.top, p.y);
      bounds.bottom = Math.max(
        bounds.bottom,
        p.y,
      );
    }
    boxes.set(f.id, bounds);
  }
  const centres = new Map<string, number>();
  if (flow.rooms)
    for (const block of roomBlocks(flow.rooms)) {
      const { min, max } = stageBounds(
        block.cells,
      );
      const centre = at({
        x: (min.x + max.x) / 2,
        y: (min.y + max.y) / 2,
        z: (min.z + max.z) / 2,
      });
      for (const id of block.ids)
        centres.set(id, centre.x);
    }
  const placed: DrawLabel[] = [];
  // every label in painting order, the placed ones where
  // they were set down
  const settled: DrawLabel[] = [];
  for (const l of [...drawing.labels].sort(
    (a, b) =>
      Number(a.style === "tag") -
        Number(b.style === "tag") ||
      b.point.z - a.point.z,
  )) {
    if (l.covered && flow.hidden === "none") {
      settled.push(l);
      continue;
    }
    const { box: b } = l,
      offset = offsets.get(l.id),
      node = captions.get(l.id);
    let x =
      (offset?.x ?? 0) +
      l.point.x -
      (b.left + b.right) / 2;
    let y =
      (offset?.y ?? 0) +
      l.point.y -
      (b.top + b.bottom) / 2;
    const centre = node && centres.get(node.id);
    const inward =
      l.covered && centre !== undefined;
    const own =
      boxes.get(l.id) ??
      (inward
        ? {
            left: l.point.x,
            right: l.point.x,
            top: l.point.y,
            bottom: l.point.y,
          }
        : undefined);
    if (l.style === "tag" && own) {
      const others = [...boxes.values()].filter(
        (o) => o !== own,
      );
      const overlap = (o: typeof own) =>
        o.left <= b.right + x + 2 &&
        o.right >= b.left + x - 2 &&
        o.top <= b.bottom + y + 2 &&
        o.bottom >= b.top + y - 2;
      const blocked = () =>
        others.some(overlap) ||
        placed.some((p) => overlap(p.box));
      y = own.top - 10 - b.bottom;
      const start = y;
      if (inward) {
        x =
          (own.left + own.right) / 2 < centre
            ? own.right + 6 - b.left
            : own.left - 6 - b.right;
        y =
          (own.top +
            own.bottom -
            b.top -
            b.bottom) /
          2;
        const middle = y;
        for (let step = 1; blocked(); step++)
          y =
            middle +
            (step % 2 ? -1 : 1) *
              Math.ceil(step / 2) *
              6;
      }
      while (blocked()) {
        y -= 6;
        if (
          start - y > 24 &&
          others.some(overlap)
        ) {
          y =
            (own.top +
              own.bottom -
              b.top -
              b.bottom) /
            2;
          for (let gap = 6; ; gap += 8) {
            x = own.right + gap - b.left;
            if (!blocked()) break;
            x = own.left - gap - b.right;
            if (!blocked()) break;
          }
          break;
        }
      }
      children.push(
        el(
          "line",
          [
            attr("class", "leader"),
            attr("x1", String(l.point.x)),
            attr("y1", String(own.top)),
            attr(
              "x2",
              String((b.left + b.right) / 2 + x),
            ),
            attr("y2", String(b.bottom + y)),
          ],
          [],
        ),
      );
    }
    const set: DrawLabel = {
      ...l,
      box: {
        left: l.box.left + x,
        right: l.box.right + x,
        top: l.box.top + y,
        bottom: l.box.bottom + y,
      },
      matrix: [
        l.matrix[0],
        l.matrix[1],
        l.matrix[2],
        l.matrix[3],
        l.matrix[4] + x,
        l.matrix[5] + y,
      ],
    };
    placed.push(set);
    settled.push(set);
    const attributes = [
      attr(
        "class",
        l.style +
          (l.covered ? " covered" : "") +
          (quietInk.has(l.id) ? " quiet" : ""),
      ),
      attr("style", styles.get(l.style) ?? ""),
    ];
    if (node) {
      children.push(
        el(
          "g",
          [
            ...attributes,
            attr("data-node-caption", l.style),
            attr("data-node", node.id),
            attr("tabindex", "0"),
            attr("aria-label", node.label),
            attr(
              "transform",
              l.style === "tag"
                ? `translate(${(set.box.left + set.box.right) / 2} ${(set.box.top + set.box.bottom) / 2})`
                : `matrix(${[...set.matrix.slice(0, 4), (set.box.left + set.box.right) / 2, (set.box.top + set.box.bottom) / 2].join(" ")})`,
            ),
          ],
          [caption(node)],
        ),
      );
    } else
      children.push(
        el(
          "text",
          [
            ...attributes,
            attr(
              "transform",
              "matrix(" +
                set.matrix.join(" ") +
                ")",
            ),
          ],
          [text(l.text)],
        ),
      );
  }
  const inked = {
    ...clearLabelStrokes(drawing, placed),
    labels: settled,
  };
  const strokes: Html<Change>[] = [];
  const batches = new Map<
    string,
    Map<string, string>
  >();
  const stroke = strokePath(inked);
  for (const [i, s] of inked.strokes.entries()) {
    if (
      s.style === "arrow" ||
      (s.kind === "hidden" &&
        (flow.hidden === "none" ||
          (s.style.startsWith("node") &&
            !s.outline) ||
          (!s.style.startsWith("node") &&
            !s.style.startsWith("wire"))))
    )
      continue;
    const key = s.style + "|" + s.kind;
    const d = stroke(i);
    const item =
      batches.get(s.id) ??
      new Map<string, string>();
    item.set(key, (item.get(key) ?? "") + d);
    batches.set(s.id, item);
  }
  for (const [id, item] of batches)
    for (const [key, d] of item) {
      const [style, kind] = key.split("|");
      const w = wireItems.get(id);
      const visible = shape(style!, kind!, d, id);
      strokes.push(
        w && kind === "line"
          ? el(
              "g",
              [
                attr(
                  "data-wire-control",
                  String(
                    edgeIndices.get(
                      originals.get(w.edge) ??
                        w.edge,
                    ) ?? -1,
                  ),
                ),
              ],
              [
                el(
                  "path",
                  [
                    attr("class", "edge-hit"),
                    attr("d", d),
                    attr("fill", "none"),
                    attr("stroke", "transparent"),
                    attr(
                      "stroke-width",
                      String(
                        w.edge.interactionWidth ??
                          16,
                      ),
                    ),
                    attr(
                      "pointer-events",
                      "stroke",
                    ),
                  ],
                  [],
                ),
                visible,
              ],
            )
          : visible,
      );
    }
  children.splice(strokeIndex, 0, ...strokes);
  const hit = (p: Point) =>
    targets.get(getOr("")(pick(inked, p)));
  return {
    html: el<Change>(
      "g",
      [attr("class", "engine-drawing")],
      children,
    ),
    placed,
    hit,
    drawing: inked,
  };
};
