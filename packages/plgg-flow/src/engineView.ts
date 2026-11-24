import {
  box,
  slab,
  render,
  strokePath,
  project,
  projectedScale,
  pick,
  facingXYPlane,
  type Solid,
  type Sheet,
  type Line,
  type Mark,
  type Label,
  type Point,
  type Point3,
} from "plgg-board";
import {
  el,
  attr,
  text,
  type Html,
} from "plgg-view";
import { isSome } from "plgg";
import {
  type Flow,
  type FlowNode,
  type Edge,
  type Change,
  type Scenery,
  selectedNodes,
  selectedEdges,
} from "plgg-flow/model";
import {
  bodyDepth,
  portPosition,
} from "plgg-flow/nodeBody";
import {
  nodeSize,
  labelWidth,
} from "plgg-flow/nodeSize";
import {
  type Wire,
  type Side,
} from "plgg-flow/wiring";
import {
  portsFor,
  type Port,
} from "plgg-flow/connections";

const off = (p: Point3) => p.z !== 0;
export const spatialDrawing = (
  flow: Flow,
  wires: readonly Wire[],
) =>
  Boolean(
    flow.camera.yaw ||
      flow.camera.pitch ||
      flow.nodes.some((n) => off(n.position)) ||
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
type Target = {
  node?: string;
  resize?: boolean;
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
const tagged = new WeakMap<FlowNode, boolean>();
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
  const captions = new Map<string, FlowNode>();
  const targets = new Map<string, Target>(),
    offsets = new Map<string, Point>(),
    styles = new Map<string, string>();
  const { camera } = flow,
    selected = new Set(selectedNodes(flow)),
    chosen = new Set(selectedEdges(flow));
  const ports = portsFor(flow),
    occupied = new Set<string>();
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
    occupied.add(JSON.stringify([node, side]));
    targets.set(id, {
      port: { node, point, direction, handle },
    });
    marks.push({ id, style: "socket", point });
  };
  const originals = new Map(
    edges.map((e) => [e.edge, e.original]),
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
          : edge.quiet
            ? " quiet"
            : "");
    targets.set(id, { edge });
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
      const base = {
        x: tip.x - (8 * dx) / length,
        y: tip.y - (8 * dy) / length,
        z: tip.z - (8 * dz) / length,
      };
      const span = Math.hypot(dx, dy) || 1;
      sheets.push({
        id,
        style: "arrow",
        points: [
          tip,
          {
            ...base,
            x:
              base.x +
              3 *
                (dz && !dx && !dy
                  ? 1
                  : -dy / span),
            y: base.y + (3 * dx) / span,
          },
          {
            ...base,
            x:
              base.x -
              3 *
                (dz && !dx && !dy
                  ? 1
                  : -dy / span),
            y: base.y - (3 * dx) / span,
          },
        ],
      });
    };
    if (
      edge.arrows !== "none" &&
      edge.arrows !== "backward"
    )
      arrow(w.arrow.at, w.arrow.toward);
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
  for (const n of nodes) {
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
    const style =
      "node" +
      (selected.has(n.id) ||
      flow.hoveredNode === n.id
        ? " active"
        : n.quiet
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
      sheets.push({ id, style: "tray", points });
      marks.push({
        id: "handle:" + id,
        style: "handle",
        point: points[2]!,
      });
      targets.set("handle:" + id, {
        node: n.id,
        resize: true,
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
            casts: !!receiver(p),
            shadowReceiver: receiver(p) ?? "",
          },
        ),
      );
    const sign =
        facingXYPlane(camera, p.z) >= 0 ? 1 : -1,
      width = labelWidth(n.label);
    const at = project(camera),
      face = {
        ...p,
        z: tray ? p.z : p.z + sign * d,
      },
      center = at(face),
      scale = projectedScale(camera, at(p).z);
    const across = at({ ...face, x: face.x + 1 }),
      down = at({ ...face, y: face.y + 1 });
    const tag =
      Math.min(
        Math.abs(across.x - center.x),
        Math.abs(down.y - center.y),
      ) /
        scale <
      (tagged.get(n) ? 0.75 : 0.7);
    tagged.set(n, tag);
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
    if (
      n.connectable !== false &&
      (selected.has(n.id) || isSome(flow.source))
    )
      for (const side of [
        "right",
        "left",
        "top",
        "bottom",
      ] satisfies Side[]) {
        if (
          occupied.has(
            JSON.stringify([n.id, side]),
          )
        )
          continue;
        const direction = isSome(flow.source)
          ? "target"
          : "source";
        socket(
          n.id,
          side,
          portPosition(n, side, 0),
          direction,
          ports
            .get(n.id)
            ?.find(
              (v) => v.direction === direction,
            )?.id,
        );
      }
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
            casts: !!receiver(s.points[0]!),
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
        sheets.push({ id, style, points });
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
        attr("class", style + " " + kind),
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
  const batches = new Map<
    string,
    Map<string, string>
  >();
  const stroke = strokePath(drawing);
  for (const [
    i,
    s,
  ] of drawing.strokes.entries()) {
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
      children.push(shape(style!, kind!, d, id));
    }
  for (const m of drawing.marks)
    if (!m.covered && m.kind !== "gap")
      children.push(
        el(
          "ellipse",
          [
            attr("class", m.kind),
            attr("data-id", m.id),
            attr(
              "transform",
              "matrix(" +
                m.matrix.join(" ") +
                ")",
            ),
            attr(
              "rx",
              m.kind === "hole" ? "3" : "2",
            ),
            attr(
              "ry",
              m.kind === "hole" ? "1.5" : "2",
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
  const placed: typeof drawing.labels = [];
  drawing.labels.sort(
    (a, b) =>
      Number(a.style === "tag") -
        Number(b.style === "tag") ||
      b.point.z - a.point.z,
  );
  for (const l of drawing.labels) {
    if (l.covered && flow.hidden === "none")
      continue;
    const { box: b, matrix: m } = l,
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
    const own = boxes.get(l.id);
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
    b.left += x;
    b.right += x;
    b.top += y;
    b.bottom += y;
    m[4] += x;
    m[5] += y;
    placed.push(l);
    const attributes = [
      attr(
        "class",
        l.style + (l.covered ? " covered" : ""),
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
                ? `translate(${(b.left + b.right) / 2} ${(b.top + b.bottom) / 2})`
                : `matrix(${[...m.slice(0, 4), (b.left + b.right) / 2, (b.top + b.bottom) / 2].join(" ")})`,
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
              "matrix(" + m.join(" ") + ")",
            ),
          ],
          [text(l.text)],
        ),
      );
  }
  const hit = (p: Point) =>
    targets.get(pick(drawing, p) ?? "");
  return {
    html: el<Change>(
      "g",
      [attr("class", "engine-drawing")],
      children,
    ),
    hit,
    region: (inside: (p: Point) => boolean) => {
      const selectedNodes = new Set<string>(),
        selectedEdges = new Set<Edge>();
      const consider = (p: Point) => {
        if (!inside(p)) return;
        const target = hit(p);
        const node =
          target?.node ?? target?.port?.node;
        if (node) selectedNodes.add(node);
        if (target?.edge)
          selectedEdges.add(target.edge);
      };
      for (const f of drawing.fills)
        consider({
          x:
            f.points.reduce(
              (v, p) => v + p.x,
              0,
            ) / f.points.length,
          y:
            f.points.reduce(
              (v, p) => v + p.y,
              0,
            ) / f.points.length,
        });
      for (const s of drawing.strokes)
        if (s.kind === "line") {
          const [a, b] = s.points;
          consider({
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
          });
        }
      for (const l of drawing.labels)
        if (!l.covered)
          consider({
            x: (l.box.left + l.box.right) / 2,
            y: (l.box.top + l.box.bottom) / 2,
          });
      return {
        nodes: [...selectedNodes],
        edges: [...selectedEdges],
      };
    },
  };
};
