import {
  portPosition,
  projectSocket,
  projectNodeBody,
} from "plgg-flow/nodeBody";
import { insideLasso } from "plgg-flow/constraints";
import { annotationView } from "plgg-flow/annotationView";
import {
  some,
  none,
  isSome,
  type Option,
} from "plgg";
import {
  unproject,
  facingXYPlane,
  projectLayer,
  project,
  projectedScale,
  worldDelta,
  pan,
  zoomAt,
  type Camera,
  type Point,
} from "plgg-board";
import {
  el,
  attr,
  key,
  text,
  onEvent,
  svgViewport,
  type Html,
} from "plgg-view";
import { sectionGraph } from "plgg-flow/spatial";
import {
  groupVolumes,
  spatialGuides,
} from "plgg-flow/spatialView";
import { polylineSampler } from "plgg-flow/polyline";
import {
  midpoint,
  distance,
  type Pinch,
} from "plgg-flow/gesture";
import {
  edgeIndex,
  portsFor,
  portOffset,
  type Port,
} from "plgg-flow/connections";
import {
  groupLoads,
  visibleScene,
  subtree,
} from "plgg-flow/hierarchy";
import {
  beginStroke,
  movePointer,
  orbitByDrag,
  selectNodes,
  selectedNodes,
  zoom,
  moveConstrainedSelection,
  fitFlow,
  connect,
  disconnect,
  deleteSelected,
  viewport,
  type Edge,
  type Flow,
  type Change,
  type FlowNode,
  type Drag,
} from "plgg-flow/model";
const local = (
  svg: SVGSVGElement,
  event: MouseEvent,
): Option<Point> => {
  const matrix = svg.getScreenCTM();
  return matrix
    ? some(
        new DOMPoint(
          event.clientX,
          event.clientY,
        ).matrixTransform(matrix.inverse()),
      )
    : none();
};
const a = (
  name: string,
  value: string | number,
) => attr(name, String(value));
// The lattice lives on the back plane of the diagram. Depth stems connect
// each billboard to its footprint, preserving the same camera on all layers.
const groundHeight = -190;
export const groundSide = (
  camera: Camera,
): "above" | "below" | "level" => {
  const facing = facingXYPlane(
    camera,
    groundHeight,
  );
  return Math.abs(facing) < 0.035
    ? "level"
    : facing > 0
      ? "above"
      : "below";
};
const groundPlane = (
  state: Flow,
): Html<Change>[] => {
  const camera = state.camera,
    z = groundHeight;
  const side = groundSide(camera);
  const at = (x: number, y: number) =>
    project(camera)({ x, y, z });
  const line = (u: Point, v: Point) =>
    `M${u.x} ${u.y}L${v.x} ${v.y}`;
  const ticks = Array.from(
    { length: 41 },
    (_, i) => (i - 20) * 32,
  );
  const path = ticks
    .map(
      (t) =>
        line(at(t, -640), at(t, 640)) +
        line(at(-640, t), at(640, t)),
    )
    .join("");
  const stems = state.nodes
    .map((n) =>
      line(
        at(n.position.x, n.position.y),
        project(camera)(n.position),
      ),
    )
    .join("");
  const perimeter = [
    at(-640, -640),
    at(640, -640),
    at(640, 640),
    at(-640, 640),
  ]
    .map((p) => p.x + "," + p.y)
    .join(" ");
  return [
    el(
      "polygon",
      [
        a("class", "ground-surface"),
        a("points", perimeter),
        a(
          "fill",
          side === "above"
            ? "#dde7d4"
            : side === "below"
              ? "#e4cbba"
              : "#dad8c5",
        ),
        a(
          "stroke",
          side === "below"
            ? "#b39884"
            : "#a6baa3",
        ),
        a("pointer-events", "none"),
      ],
      [],
    ),
    ...state.nodes.map((n) => {
      const p = at(n.position.x, n.position.y);
      const footprint = [
        [-24, -8],
        [24, -8],
        [24, 8],
        [-24, 8],
      ]
        .map(([x = 0, y = 0]) =>
          at(n.position.x + x, n.position.y + y),
        )
        .map((v) => v.x + "," + v.y)
        .join(" ");
      return el(
        "g",
        [
          a("pointer-events", "none"),
          a(
            "opacity",
            Number(camera.perspective ?? 0),
          ),
        ],
        [
          el(
            "polygon",
            [
              a("points", footprint),
              a("fill", "#8eada4"),
              a("opacity", 0.28),
            ],
            [],
          ),
          el(
            "circle",
            [
              a("cx", p.x),
              a("cy", p.y),
              a("r", 2.8),
              a("fill", "#71958a"),
            ],
            [],
          ),
        ],
      );
    }),
    el(
      "path",
      [
        a("class", "world-grid"),
        a("d", path),
        a("fill", "none"),
        a(
          "stroke",
          side === "below"
            ? "#c3a48f"
            : "#b5c8b1",
        ),
        a("pointer-events", "none"),
      ],
      [],
    ),
    el(
      "path",
      [
        a("class", "depth-stems"),
        a(
          "opacity",
          Number(camera.perspective ?? 0),
        ),
        a("d", stems),
        a("stroke", "#83a9a0"),
        a("stroke-dasharray", "3 4"),
        a("pointer-events", "none"),
      ],
      [],
    ),
  ];
};
export type ViewRegistry = Readonly<{
  cull?: boolean;
  nodes?: ReadonlyMap<
    string,
    (node: FlowNode, state: Flow) => Html<Change>
  >;
  edgeLabels?: ReadonlyMap<
    string,
    (edge: Edge, state: Flow) => Html<Change>
  >;
}>;
export const flowView = (
  state: Flow,
  renderLabel: (
    node: FlowNode,
  ) => Html<Change> = (node) =>
    el(
      "text",
      [a("text-anchor", "middle"), a("y", 5)],
      [text(node.label)],
    ),
  registry: ViewRegistry = {},
): Html<Change> => {
  const whole = visibleScene(
    state,
    state.isolatedBranch,
  );
  const clipped = sectionGraph(
    {
      nodes: whole.nodes,
      edges: whole.edges.map((e) => e.edge),
    },
    state.spatial?.section,
  );
  const visibleEdges = new Set(clipped.edges);
  const scene = {
    nodes: clipped.nodes,
    edges: whole.edges.filter((e) =>
      visibleEdges.has(e.edge),
    ),
  };
  const ports = portsFor(state);
  const chosen = new Set(selectedNodes(state));
  const projected = projectLayer(
    state.camera,
    (n: FlowNode) => n.position,
  )(scene.nodes).map(({ item, point }) => ({
    ...item,
    p: point,
    scale: projectedScale(state.camera, point.z),
  }));
  const lookup = new Map(
    projected.map((n) => [n.id, n]),
  );
  const cull =
    registry.cull ??
    projected.length + scene.edges.length > 500;
  const drawNodes = !cull
    ? projected
    : projected.filter((n) => {
        const w =
            ((n.width ?? 104) * n.scale) / 2 + 48,
          h =
            ((n.height ?? 36) * n.scale) / 2 + 48;
        return (
          n.p.x + w >= 0 &&
          n.p.x - w <= viewport.x &&
          n.p.y + h >= 0 &&
          n.p.y - h <= viewport.y
        );
      });
  const counts = new Map(
    drawNodes.some((n) => n.collapsed)
      ? groupLoads(state).map((g) => [
          g.id,
          g.cards,
        ])
      : [],
  );
  const layers: {
    depth: number;
    html: Html<Change>;
  }[] = drawNodes.map((n) => {
    // One solid for every camera: the flat view is this
    // same box seen face-on, never a second drawing.
    const solid = projectNodeBody(
      n,
      state.camera,
    );
    const hue = state.spatial?.depthColor
      ? 210 -
        Math.max(
          -1,
          Math.min(1, n.position.z / 250),
        ) *
          100
      : 175;
    const render =
      registry.nodes?.get(n.type ?? "") ??
      renderLabel;
    // A socket on the far flank sits behind the box: it
    // is drawn before the faces, so the solid hides it.
    // Face-on, neither flank shows and both read in front.
    const flank = (side: string) =>
      solid.visible.some((f) => f.side === side);
    const behind = (
      direction: Port["direction"],
    ) =>
      flank(
        direction === "source" ? "left" : "right",
      );
    const sockets = (back: boolean) =>
      (
        [
          "source",
          "target",
        ] satisfies Port["direction"][]
      )
        .filter(
          (direction) =>
            behind(direction) === back,
        )
        .flatMap((direction) => {
          if (n.connectable === false) return [];
          const available = ports.get(n.id) ?? [];
          return [
            undefined,
            ...available
              .filter(
                (p) => p.direction === direction,
              )
              .map((p) => p.id),
          ].map((handle) => {
            const description = n.ports?.find(
              (p) =>
                p.direction === direction &&
                p.id === handle,
            )?.description;
            const title =
              (handle ?? direction) +
              (description
                ? " — " + description
                : "");
            const offset = portOffset(
              available,
              direction,
              handle,
            );
            const socket = projectSocket(
              n,
              state.camera,
              direction,
              offset,
            );
            const x =
                (socket.x - n.p.x) / n.scale,
              y = (socket.y - n.p.y) / n.scale;
            // A socket is a ball on the box's flank: it
            // reads as a dot from every side, so wires
            // never lose their ends when the view turns.
            const control = el<Change>(
              "circle",
              [
                a("data-port", n.id),
                a("data-direction", direction),
                ...(handle === undefined
                  ? []
                  : [a("data-handle", handle)]),
                a("cy", y),
                a("tabindex", 0),
                a("role", "button"),
                a(
                  "aria-label",
                  n.label + " " + title,
                ),
                a("cx", x),
                a("stroke", "#215f57"),
                a(
                  "r",
                  available.length ? 3.5 : 5,
                ),
                a(
                  "fill",
                  isSome(state.source) &&
                    state.source.content === n.id
                    ? "#ed623a"
                    : direction === "source"
                      ? "#167b70"
                      : "#e6f4ef",
                ),
              ],
              [el("title", [], [text(title)])],
            );
            return control;
          });
        });
    return {
      depth: solid.depth,
      html: el<Change>(
        "g",
        [
          key(n.id),
          a("data-node", n.id),
          a("tabindex", 0),
          a("role", "button"),
          a(
            "aria-label",
            n.collapsed
              ? n.label +
                  "（" +
                  (counts.get(n.id) ?? 0) +
                  " 枚）"
              : n.label,
          ),
          a(
            "aria-pressed",
            String(chosen.has(n.id)),
          ),
          a(
            "transform",
            `translate(${n.p.x} ${n.p.y}) scale(${n.scale})`,
          ),
        ],
        [
          ...sockets(true),
          ...solid.visible.map((face) =>
            el<Change>(
              "polygon",
              [
                a("data-node-face", face.side),
                a(
                  "points",
                  face.points
                    .map((p) => p.x + "," + p.y)
                    .join(" "),
                ),
                a(
                  "fill",
                  "hsl(" +
                    hue +
                    " " +
                    (state.spatial?.depthColor
                      ? 50
                      : 16) +
                    "% " +
                    face.light +
                    "%)",
                ),
                ...(n.group &&
                !n.collapsed &&
                n.width &&
                n.height
                  ? [a("fill-opacity", 0.15)]
                  : []),
                a(
                  "stroke",
                  chosen.has(n.id)
                    ? "#ed623a"
                    : "#718e89",
                ),
                a("stroke-linejoin", "round"),
              ],
              [],
            ),
          ),
          solid.caption
            ? el(
                "g",
                [
                  a("data-node-caption", ""),
                  a(
                    "transform",
                    `matrix(${solid.caption.join(" ")})`,
                  ),
                ],
                [
                  el(
                    "svg",
                    [
                      a(
                        "x",
                        -(n.width ?? 104) / 2,
                      ),
                      a(
                        "y",
                        -(n.height ?? 36) / 2,
                      ),
                      a("width", n.width ?? 104),
                      a("height", n.height ?? 36),
                      a(
                        "viewBox",
                        `${-(n.width ?? 104) / 2} ${-(n.height ?? 36) / 2} ${n.width ?? 104} ${n.height ?? 36}`,
                      ),
                      a("overflow", "hidden"),
                    ],
                    [render(n, state)],
                  ),
                ],
              )
            : el("g", [], []),
          ...(n.collapsed
            ? [
                el(
                  "text",
                  [
                    a("text-anchor", "middle"),
                    a(
                      "y",
                      (n.height ?? 36) / 2 + 13,
                    ),
                    a("font-size", 11),
                    a("pointer-events", "none"),
                  ],
                  [
                    text(
                      (counts.get(n.id) ?? 0) +
                        " 枚",
                    ),
                  ],
                ),
              ]
            : []),
          ...sockets(false),
        ],
      ),
    };
  });
  // Sort projected segments with the billboards so a crossing changes
  // order as the same camera moves around the diagram.
  const families = new Map<string, Edge[]>();
  for (const { edge, original } of scene.edges) {
    const k = JSON.stringify([
      edge.source,
      edge.target,
    ]);
    const g = families.get(k);
    if (g) g.push(original);
    else families.set(k, [original]);
  }
  const lanes = new Map<Edge, number>();
  for (const g of families.values())
    g.forEach((e, i) =>
      lanes.set(e, (i - (g.length - 1) / 2) * 30),
    );
  const active = state.activeEdge
    ? state.edges[
        edgeIndex(state.edges, state.activeEdge)
      ]
    : undefined;
  for (const { edge, original } of scene.edges) {
    const from = lookup.get(edge.source),
      to = lookup.get(edge.target);
    if (!from || !to) continue;
    const start = from.position,
      endPoint = to.position;
    const w1 = (from.width ?? 104) / 2,
      w2 = (to.width ?? 104) / 2;
    const x1 = start.x + w1,
      x2 = endPoint.x - w2,
      mid = (x1 + x2) / 2;
    const bend = Math.max(
      45,
      Math.abs(x2 - x1) * 0.45,
    );
    const dy1 = portOffset(
        ports.get(from.id) ?? [],
        "source",
        edge.sourceHandle,
      ),
      dy2 = portOffset(
        ports.get(to.id) ?? [],
        "target",
        edge.targetHandle,
      );
    const knots = [
      portPosition(from, "source", dy1),
      ...(edge.waypoints ?? []),
      portPosition(to, "target", dy2),
    ];
    const poly = edge.waypoints?.length
      ? polylineSampler(knots)
      : undefined;
    const sample = (t: number) => {
      const u = 1 - t,
        blend = t * t * (3 - 2 * t);
      const lerp = (
        a: number,
        b: number,
        f: number,
      ) => a + (b - a) * f;
      const step = edge.route === "step",
        straight = edge.route === "straight";
      const f = straight
        ? t
        : step
          ? Math.min(1, Math.max(0, 3 * t - 1))
          : blend;
      const x = straight
        ? lerp(x1, x2, t)
        : step
          ? t < 1 / 3
            ? lerp(x1, mid, 3 * t)
            : t > 2 / 3
              ? lerp(mid, x2, 3 * t - 2)
              : mid
          : u * u * u * x1 +
            3 * u * u * t * (x1 + bend) +
            3 * u * t * t * (x2 - bend) +
            t * t * t * x2;
      const y =
        lerp(start.y + dy1, endPoint.y + dy2, f) +
        (lanes.get(original) ?? 0) *
          4 *
          t *
          (1 - t) -
        (x2 < x1 && !straight && !step
          ? 64 * Math.sin(Math.PI * t) ** 2
          : 0);
      const p = project(state.camera)(
        poly
          ? poly(t)
          : {
              x,
              y,
              z: lerp(start.z, endPoint.z, f),
            },
      );
      return {
        ...p,
        scale: projectedScale(state.camera, p.z),
      };
    };
    const lengths = [0];
    if (poly)
      knots.forEach((p, i) => {
        const q = knots[i - 1];
        if (q)
          lengths.push(
            (lengths[i - 1] ?? 0) +
              Math.hypot(
                p.x - q.x,
                p.y - q.y,
                p.z - q.z,
              ),
          );
      });
    const total =
      lengths[lengths.length - 1] ?? 0;
    const points =
      poly && total > 0
        ? lengths.map((l) => sample(l / total))
        : Array.from({ length: 25 }, (_, i) =>
            sample(i / 24),
          );
    if (
      cull &&
      (points.every((p) => p.x < -64) ||
        points.every(
          (p) => p.x > viewport.x + 64,
        ) ||
        points.every((p) => p.y < -64) ||
        points.every(
          (p) => p.y > viewport.y + 64,
        ))
    )
      continue;
    // Coplanar samples have one painter depth; one path is sufficient.
    const flat = points.every(
      (p) => p.z === from.p.z,
    );
    const line = flat
      ? points
          .map(
            (p, i) =>
              (i ? "L" : "M") + p.x + " " + p.y,
          )
          .join("")
      : "";
    let length = 0;
    for (const [i, b] of points.entries()) {
      const a0 = points[i - 1];
      if (!a0 || (flat && i > 1)) continue;
      const offset = length;
      length += Math.hypot(
        b.x - a0.x,
        b.y - a0.y,
      );
      const depth = (a0.z + b.z) / 2;
      const fade = Math.min(
        1,
        Math.max(0, (depth + 300) / 600),
      );
      const color =
        active === original || edge.highlighted
          ? "#e36731"
          : `hsl(174 28% ${60 - fade * 38}%)`;
      const path =
        line || `M${a0.x} ${a0.y}L${b.x} ${b.y}`;
      const visible = [
        a(
          "class",
          edge.animated
            ? "edge animated"
            : "edge",
        ),
        a("d", path),
        a(
          "data-edge",
          JSON.stringify([
            edge.source,
            edge.target,
          ]),
        ),
        ...(original.id === undefined
          ? []
          : [a("data-edge-id", original.id)]),
        a("style", `--arc:${-offset}px`),
        a("fill", "none"),
        a("stroke", color),
        a("stroke-width", 2.6 * b.scale),
        a("stroke-linecap", "round"),
      ];
      const events = [
        onEvent<Change>("pointerdown", (e) => {
          if (
            !(e instanceof PointerEvent) ||
            !e.isPrimary ||
            e.button !== 0
          )
            return none();
          if (
            state.ink === "pen" ||
            (e.pointerType === "touch" &&
              !e.isPrimary)
          )
            return none();
          e.stopPropagation();
          if (
            e.altKey &&
            e.currentTarget instanceof
              SVGElement &&
            e.currentTarget.ownerSVGElement
          ) {
            const pointer = local(
              e.currentTarget.ownerSVGElement,
              e,
            );
            if (isSome(pointer)) {
              const q = pointer.content;
              let nearest = 1,
                best = Infinity,
                fraction = 0;
              for (
                let k = 1;
                k < points.length;
                k++
              ) {
                const a = points[k - 1],
                  b = points[k];
                if (!a || !b) continue;
                const dx = b.x - a.x,
                  dy = b.y - a.y,
                  t = Math.max(
                    0,
                    Math.min(
                      1,
                      ((q.x - a.x) * dx +
                        (q.y - a.y) * dy) /
                        (dx * dx + dy * dy || 1),
                    ),
                  );
                const dist = Math.hypot(
                  q.x - a.x - t * dx,
                  q.y - a.y - t * dy,
                );
                if (dist < best) {
                  nearest = k;
                  fraction = t;
                  best = dist;
                }
              }
              const a = points[nearest - 1],
                b = points[nearest],
                z =
                  a && b
                    ? a.z + fraction * (b.z - a.z)
                    : depth,
                p = unproject(state.camera, q, z),
                prev = original.waypoints ?? [],
                at = Math.min(
                  prev.length,
                  nearest - 1,
                );
              const next = {
                ...original,
                waypoints: [
                  ...prev.slice(0, at),
                  p,
                  ...prev.slice(at),
                ],
              };
              return some((s) => ({
                ...s,
                activeEdge: next,
                edges: s.edges.map((v) =>
                  v === original ? next : v,
                ),
              }));
            }
          }
          if (
            e.pointerType === "touch" &&
            e.currentTarget instanceof SVGElement
          ) {
            const svg =
              e.currentTarget.ownerSVGElement;
            if (svg) {
              const point = local(svg, e);
              if (isSome(point)) {
                e.preventDefault();
                svg.setPointerCapture(
                  e.pointerId,
                );
                return some((s) => ({
                  ...s,
                  activeEdge: original,
                  source: none(),
                  drag: some<Drag>({
                    pointer: e.pointerId,
                    mode: "pan",
                    node: "",
                    last: point.content,
                    first: point.content,
                  }),
                }));
              }
            }
          }
          return some((s) => ({
            ...s,
            activeEdge: original,
          }));
        }),
        onEvent<Change>("dblclick", () =>
          some(disconnect(original)),
        ),
      ];
      const hitWidth = edge.interactionWidth ?? 0;
      layers.push({
        depth: depth - 0.01,
        html:
          hitWidth > 0
            ? el("g", events, [
                el(
                  "path",
                  [
                    a("class", "edge-hit"),
                    a("d", path),
                    a("fill", "none"),
                    a("stroke", "transparent"),
                    a("stroke-width", hitWidth),
                    a("stroke-linecap", "round"),
                    a("pointer-events", "stroke"),
                  ],
                  [],
                ),
                el("path", visible, []),
              ])
            : el(
                "path",
                [...visible, ...events],
                [],
              ),
      });
    }
    const middle = sample(0.5),
      arrows = edge.arrows ?? "forward";
    for (const side of ["start", "end"]) {
      const atStart = side === "start";
      if (
        arrows !== "both" &&
        arrows !==
          (atStart ? "backward" : "forward")
      )
        continue;
      const tip = sample(atStart ? 0 : 1),
        near = sample(atStart ? 1 / 24 : 23 / 24);
      const angle =
        (Math.atan2(
          tip.y - near.y,
          tip.x - near.x,
        ) *
          180) /
        Math.PI;
      layers.push({
        depth: tip.z - 0.01,
        html: el(
          "polygon",
          [
            a("data-arrow", side),
            a(
              "transform",
              `translate(${tip.x} ${tip.y}) rotate(${angle}) scale(${tip.scale})`,
            ),
            a("points", "-5,0 -14,-4 -14,4"),
            a("fill", "#426f71"),
            a("pointer-events", "none"),
          ],
          [],
        ),
      });
    }
    const customEdgeLabel =
      registry.edgeLabels?.get(edge.type ?? "");
    if (customEdgeLabel || edge.label) {
      const spatial =
        state.camera.pitch !== 0 ||
        state.camera.yaw !== 0;
      const before = sample(0.49),
        after = sample(0.51);
      const tangent =
        (Math.atan2(
          after.y - before.y,
          after.x - before.x,
        ) *
          180) /
        Math.PI;
      const angle =
        tangent > 90
          ? tangent - 180
          : tangent < -90
            ? tangent + 180
            : tangent;
      layers.push({
        depth: middle.z,
        html: el(
          "g",
          [
            a(
              "transform",
              `translate(${middle.x} ${middle.y})` +
                (spatial
                  ? ` rotate(${angle}) scale(${middle.scale})`
                  : ""),
            ),
          ],
          customEdgeLabel
            ? [customEdgeLabel(edge, state)]
            : [
                el(
                  "text",
                  [
                    a("class", "edge-label"),
                    a("text-anchor", "middle"),
                    a("y", -8),
                    a("paint-order", "stroke"),
                    a("stroke", "#f7faf7"),
                    a("stroke-width", 3),
                    a("stroke-linejoin", "round"),
                    a("pointer-events", "none"),
                  ],
                  [text(edge.label ?? "")],
                ),
              ],
        ),
      });
    }
  }
  return svgViewport<Change>(
    viewport.x,
    viewport.y,
    [
      a("class", "flow-board"),
      a(
        "data-ground-side",
        groundSide(state.camera),
      ),
      a(
        "style",
        "background-color:#e1ecf2;touch-action:none",
      ),
      a("aria-label", "Diagram editor"),
      a("tabindex", 0),
      onEvent<Change>("pointerdown", (e) => {
        if (
          !(e instanceof PointerEvent) ||
          !(
            e.currentTarget instanceof
            SVGSVGElement
          ) ||
          !(e.target instanceof Element) ||
          (!e.isPrimary &&
            e.pointerType !== "touch") ||
          (e.button !== 0 && e.button !== 1)
        )
          return none();
        const svg = e.currentTarget,
          point = local(svg, e);
        if (!isSome(point)) return none();
        if (e.pointerType === "touch")
          e.preventDefault();
        if (
          e.pointerType === "touch" &&
          !e.isPrimary
        ) {
          if (!isSome(state.drag) || state.pinch)
            return none();
          const first = state.drag.content;
          svg.setPointerCapture(e.pointerId);
          const contacts: Pinch = [
            {
              id: first.pointer,
              point: first.last,
            },
            {
              id: e.pointerId,
              point: point.content,
            },
          ];
          return some((s) => ({
            ...s,
            drag: none(),
            source: none(),
            pinch: contacts,
            pinchStart: {
              contacts,
              camera: s.camera,
              ...(s.orbitCenter
                ? { orbitCenter: s.orbitCenter }
                : {}),
            },
          }));
        }
        if (state.ink === "pen") {
          svg.setPointerCapture(e.pointerId);
          return some(
            beginStroke(
              point.content,
              e.pointerId,
            ),
          );
        }
        const port = e.target
          .closest("[data-port]")
          ?.getAttribute("data-port");
        const handle =
          e.target
            .closest("[data-port]")
            ?.getAttribute("data-handle") ??
          undefined;
        const direction =
          e.target
            .closest("[data-port]")
            ?.getAttribute("data-direction") ===
          "target"
            ? "target"
            : "source";
        if (port) {
          svg.setPointerCapture(e.pointerId);
          return some((s) => {
            const next = connect(
              port,
              handle,
              direction,
            )(s);
            return isSome(next.source)
              ? {
                  ...next,
                  drag: some<Drag>({
                    mode: "connect",
                    node: port,
                    last: point.content,
                    pointer: e.pointerId,
                  }),
                }
              : next;
          });
        }
        const node =
          e.target
            .closest("[data-node]")
            ?.getAttribute("data-node") ?? "";
        if (node && e.shiftKey) {
          const ids = selectedNodes(state);
          return some(
            selectNodes(
              ids.includes(node)
                ? ids.filter((id) => id !== node)
                : [...ids, node],
            ),
          );
        }
        svg.setPointerCapture(e.pointerId);
        if (e.pointerType !== "touch")
          svg.focus({ preventScroll: true });
        return some((s) => ({
          ...s,
          source: none(),
          ...(node &&
          !selectedNodes(s).includes(node)
            ? selectNodes([node])(s)
            : {}),
          drag: some<Drag>({
            pointer: e.pointerId,
            last: point.content,
            first: point.content,
            ...(!node && s.lasso
              ? { outline: [point.content] }
              : {}),
            node,
            mode: node
              ? "node"
              : s.lasso
                ? "lasso"
                : e.altKey
                  ? "box"
                  : e.button === 0 &&
                      e.pointerType !== "touch" &&
                      e.shiftKey
                    ? "orbit"
                    : "pan",
          }),
        }));
      }),
      onEvent<Change>("pointermove", (e) => {
        if (
          !(e instanceof PointerEvent) ||
          !(
            e.currentTarget instanceof
            SVGSVGElement
          ) ||
          (!isSome(state.drag) && !state.pinch)
        )
          return none();
        const point = local(e.currentTarget, e);
        if (state.pinch && isSome(point)) {
          const [a, b] = state.pinch;
          if (
            e.pointerId !== a.id &&
            e.pointerId !== b.id
          )
            return none();
          const next: Pinch =
            e.pointerId === a.id
              ? [
                  { ...a, point: point.content },
                  b,
                ]
              : [
                  a,
                  { ...b, point: point.content },
                ];
          return some((s) => {
            const start = s.pinchStart;
            if (!start) return s;
            const a = midpoint(start.contacts),
              b = midpoint(next),
              span = distance(start.contacts),
              nextSpan = distance(next);
            const { orbitCenter, ...rest } = s;
            const rotated = orbitByDrag(
              b.x - a.x,
              b.y - a.y,
            )({
              ...rest,
              camera: start.camera,
              ...(start.orbitCenter
                ? {
                    orbitCenter:
                      start.orbitCenter,
                  }
                : {}),
            });
            return {
              ...rotated,
              camera: zoomAt(
                a,
                span && nextSpan
                  ? nextSpan / span
                  : 1,
              )(rotated.camera),
              pinch: next,
            };
          });
        }
        return isSome(point)
          ? some(
              movePointer(
                point.content,
                e.pointerId,
              ),
            )
          : none();
      }),
      ...[
        "pointerup",
        "pointercancel",
        "lostpointercapture",
      ].map((name) =>
        onEvent<Change>(name, (e) => {
          if (
            e instanceof PointerEvent &&
            state.pinch
          ) {
            const contacts = state.pinch;
            if (
              !contacts.some(
                (p) => p.id === e.pointerId,
              )
            )
              return none();
            const remaining =
              contacts[0].id === e.pointerId
                ? contacts[1]
                : contacts[0];
            return some((s) => {
              const {
                pinch,
                pinchStart,
                ...rest
              } = s;
              return {
                ...rest,
                drag:
                  name === "pointercancel"
                    ? none()
                    : some<Drag>({
                        mode: "pan",
                        last: remaining.point,
                        node: "",
                        pointer: remaining.id,
                      }),
              };
            });
          }
          if (
            !(e instanceof PointerEvent) ||
            !(
              e.currentTarget instanceof
              SVGSVGElement
            ) ||
            !isSome(state.drag) ||
            state.drag.content.pointer !==
              e.pointerId
          )
            return none();
          const svg = e.currentTarget;
          const hit =
            svg.ownerDocument.elementFromPoint(
              e.clientX,
              e.clientY,
            );
          const target = svg.contains(hit)
            ? hit
                ?.closest("[data-port]")
                ?.getAttribute("data-port")
            : null;
          return some((s) => {
            if (
              isSome(s.drag) &&
              s.drag.content.mode === "lasso"
            ) {
              const outline =
                s.drag.content.outline ?? [];
              return name === "pointerup"
                ? selectNodes(
                    projected
                      .filter((n) =>
                        insideLasso(n.p, outline),
                      )
                      .map((n) => n.id),
                  )({ ...s, drag: none() })
                : { ...s, drag: none() };
            }
            if (
              isSome(s.drag) &&
              s.drag.content.mode === "box"
            ) {
              const box = s.drag.content,
                first = box.first ?? box.last,
                last = box.last;
              const inside = projected.filter(
                (n) =>
                  n.p.x >=
                    Math.min(first.x, last.x) &&
                  n.p.x <=
                    Math.max(first.x, last.x) &&
                  n.p.y >=
                    Math.min(first.y, last.y) &&
                  n.p.y <=
                    Math.max(first.y, last.y),
              );
              return name === "pointerup"
                ? selectNodes(
                    inside.map((n) => n.id),
                  )({ ...s, drag: none() })
                : { ...s, drag: none() };
            }
            const snap = s.snap,
              drag = state.drag;
            const anchor =
              isSome(drag) &&
              drag.content.mode === "node"
                ? s.nodes.find(
                    (n) =>
                      n.id === drag.content.node,
                  )
                : undefined;
            const geometry =
              snap && anchor
                ? moveConstrainedSelection(
                    s,
                    selectedNodes(s).filter(
                      (id) =>
                        !s.nodes.find(
                          (n) => n.id === id,
                        )?.locked,
                    ),
                    {
                      x:
                        Math.round(
                          anchor.position.x /
                            snap,
                        ) *
                          snap -
                        anchor.position.x,
                      y:
                        Math.round(
                          anchor.position.y /
                            snap,
                        ) *
                          snap -
                        anchor.position.y,
                      z: 0,
                    },
                  )
                : {};
            const released = {
              ...s,
              ...geometry,
              drag: none(),
            };
            if (
              !isSome(s.drag) ||
              s.drag.content.mode !== "connect"
            )
              return released;
            if (name !== "pointerup")
              return {
                ...released,
                source: none(),
              };
            return target &&
              target !== s.drag.content.node
              ? connect(
                  target,
                  hit
                    ?.closest("[data-port]")
                    ?.getAttribute(
                      "data-handle",
                    ) ?? undefined,
                  hit
                    ?.closest("[data-port]")
                    ?.getAttribute(
                      "data-direction",
                    ) === "source"
                    ? "source"
                    : "target",
                )(released)
              : released;
          });
        }),
      ),
      onEvent<Change>("wheel", (e) => {
        if (
          !(e instanceof WheelEvent) ||
          !(
            e.currentTarget instanceof
            SVGSVGElement
          )
        )
          return none();
        e.preventDefault();
        const p = local(e.currentTarget, e);
        return isSome(p)
          ? some((s) => ({
              ...s,
              camera: zoomAt(
                p.content,
                Math.exp(-e.deltaY * 0.002),
              )(s.camera),
            }))
          : none();
      }),
      onEvent<Change>("keydown", (e) => {
        if (
          !(e instanceof KeyboardEvent) ||
          !(e.target instanceof Element)
        )
          return none();
        const custom = e.target.closest(
          "input,textarea,select,[contenteditable=true]",
        );
        if (custom) return none();
        const id = e.target
          .closest("[data-node]")
          ?.getAttribute("data-node");
        const port = e.target
          .closest("[data-port]")
          ?.getAttribute("data-port");
        let command: Change;
        if (e.key === "Enter" || e.key === " ") {
          if (port)
            command = connect(
              port,
              e.target.getAttribute(
                "data-handle",
              ) ?? undefined,
              e.target.getAttribute(
                "data-direction",
              ) === "target"
                ? "target"
                : "source",
            );
          else if (id)
            command = selectNodes(
              e.shiftKey
                ? [...selectedNodes(state), id]
                : [id],
            );
          else return none();
        } else if (
          (e.ctrlKey || e.metaKey) &&
          e.key.toLowerCase() === "a"
        )
          command = selectNodes(
            scene.nodes.map((n) => n.id),
          );
        else if (e.ctrlKey || e.metaKey)
          return none();
        else if (e.key === "Escape")
          command = (s) =>
            selectNodes([])({
              ...s,
              source: none(),
              drag: none(),
            });
        else if (e.key === "Home")
          command = fitFlow;
        else if (
          e.key === "+" ||
          e.key === "=" ||
          e.key === "-"
        )
          command = zoom(
            e.key === "-" ? 0.8 : 1.25,
          );
        else if (
          e.key === "Delete" ||
          e.key === "Backspace"
        )
          command = deleteSelected;
        else if (
          [
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
          ].includes(e.key)
        ) {
          const unit = e.shiftKey ? 10 : 1,
            dx =
              e.key === "ArrowLeft"
                ? -unit
                : e.key === "ArrowRight"
                  ? unit
                  : 0,
            dy =
              e.key === "ArrowUp"
                ? -unit
                : e.key === "ArrowDown"
                  ? unit
                  : 0;
          command = (s) => {
            const ids =
              id && !selectedNodes(s).includes(id)
                ? [id]
                : selectedNodes(s);
            if (!ids.length)
              return {
                ...s,
                camera: pan(
                  -dx * 8,
                  -dy * 8,
                )(s.camera),
              };
            const anchor = s.nodes.find(
                (n) => n.id === ids[0],
              ),
              depth = anchor
                ? project(s.camera)(
                    anchor.position,
                  ).z
                : 0;
            const delta = e.altKey
              ? { x: 0, y: 0, z: -dy }
              : worldDelta(
                  s.camera,
                  { x: dx, y: dy },
                  depth,
                );
            return {
              ...selectNodes(ids)(s),
              ...moveConstrainedSelection(
                s,
                ids.filter(
                  (key) =>
                    !s.nodes.find(
                      (n) => n.id === key,
                    )?.locked,
                ),
                delta,
              ),
            };
          };
        } else return none();
        e.preventDefault();
        return some(command);
      }),
    ],
    [
      ...groundPlane({
        ...state,
        nodes: drawNodes,
      }),
      ...projected
        .filter((n) => n.group && !n.collapsed)
        .map((group) => {
          const members = subtree(scene.nodes, [
              group.id,
            ]),
            children = projected.filter((n) =>
              members.has(n.id),
            );
          const box = children.reduce(
            (b, n) => ({
              left: Math.min(
                b.left,
                n.p.x -
                  ((n.width ?? 104) * n.scale) /
                    2,
              ),
              right: Math.max(
                b.right,
                n.p.x +
                  ((n.width ?? 104) * n.scale) /
                    2,
              ),
              top: Math.min(
                b.top,
                n.p.y -
                  ((n.height ?? 36) / 2) *
                    n.scale,
              ),
              bottom: Math.max(
                b.bottom,
                n.p.y +
                  ((n.height ?? 36) / 2) *
                    n.scale,
              ),
            }),
            {
              left: Infinity,
              right: -Infinity,
              top: Infinity,
              bottom: -Infinity,
            },
          );
          return el(
            "rect",
            [
              a("data-group", group.id),
              a("pointer-events", "none"),
              a("x", box.left - 12),
              a("y", box.top - 12),
              a(
                "width",
                box.right - box.left + 24,
              ),
              a(
                "height",
                box.bottom - box.top + 24,
              ),
              a("rx", 12),
              a("fill", "#167b7009"),
              a("stroke", "#8bb8aa"),
              a("stroke-dasharray", "6 4"),
            ],
            [],
          );
        }),
      ...(isSome(state.drag) &&
      state.drag.content.mode === "connect"
        ? (() => {
            const drag = state.drag.content,
              start = lookup.get(drag.node);
            const portY = portOffset(
              ports.get(drag.node) ?? [],
              "source",
              state.pendingHandle,
            );
            const socket =
              start &&
              projectSocket(
                start,
                state.camera,
                "source",
                portY,
              );
            return socket
              ? [
                  el(
                    "line",
                    [
                      a("x1", socket.x),
                      a("y1", socket.y),
                      a("x2", drag.last.x),
                      a("y2", drag.last.y),
                      a("stroke", "#167b70"),
                      a(
                        "stroke-dasharray",
                        "4 4",
                      ),
                      a("pointer-events", "none"),
                    ],
                    [],
                  ),
                ]
              : [];
          })()
        : []),
      ...groupVolumes(
        scene.nodes,
        state.camera,
        chosen,
      ),
      ...layers
        .sort((a, b) => a.depth - b.depth)
        .map((layer) => layer.html),
      ...(active &&
      scene.edges.some(
        (e) => e.original === active,
      )
        ? (active.waypoints ?? []).map(
            (point, index) => {
              const p = project(state.camera)(
                point,
              );
              return el(
                "rect",
                [
                  a("data-waypoint", index),
                  a("x", p.x - 4),
                  a("y", p.y - 4),
                  a("width", 8),
                  a("height", 8),
                  a("fill", "#fff"),
                  a("stroke", "#d95f34"),
                  onEvent<Change>(
                    "pointerdown",
                    (e) => {
                      if (
                        !(
                          e instanceof
                          PointerEvent
                        ) ||
                        !(
                          e.currentTarget instanceof
                          SVGElement
                        ) ||
                        !e.currentTarget
                          .ownerSVGElement
                      )
                        return none();
                      const svg =
                          e.currentTarget
                            .ownerSVGElement,
                        here = local(svg, e);
                      if (!isSome(here))
                        return none();
                      e.stopPropagation();
                      svg.setPointerCapture(
                        e.pointerId,
                      );
                      return some((s) => ({
                        ...s,
                        drag: some<Drag>({
                          pointer: e.pointerId,
                          last: here.content,
                          mode: "waypoint",
                          node: "",
                          waypoint: index,
                        }),
                      }));
                    },
                  ),
                  onEvent<Change>(
                    "dblclick",
                    (e) => {
                      e.stopPropagation();
                      const next = {
                        ...active,
                        waypoints: (
                          active.waypoints ?? []
                        ).filter(
                          (_, i) => i !== index,
                        ),
                      };
                      return some((s) => ({
                        ...s,
                        activeEdge: next,
                        edges: s.edges.map((v) =>
                          v === active ? next : v,
                        ),
                      }));
                    },
                  ),
                ],
                [],
              );
            },
          )
        : []),
      ...annotationView({
        ...state,
        nodes: scene.nodes,
      }),
      ...(isSome(state.drag) &&
      state.drag.content.mode === "lasso"
        ? [
            el(
              "polygon",
              [
                a("pointer-events", "none"),
                a(
                  "points",
                  (
                    state.drag.content.outline ??
                    []
                  )
                    .map((p) => p.x + "," + p.y)
                    .join(" "),
                ),
                a("fill", "#167b7025"),
                a("stroke", "#167b70"),
              ],
              [],
            ),
          ]
        : []),
      ...spatialGuides({
        ...state,
        nodes: scene.nodes,
      }),
      ...(isSome(state.drag) &&
      state.drag.content.mode === "box"
        ? (() => {
            const d = state.drag.content,
              p = d.first ?? d.last;
            return [
              el(
                "rect",
                [
                  a("pointer-events", "none"),
                  a("x", Math.min(p.x, d.last.x)),
                  a("y", Math.min(p.y, d.last.y)),
                  a(
                    "width",
                    Math.abs(p.x - d.last.x),
                  ),
                  a(
                    "height",
                    Math.abs(p.y - d.last.y),
                  ),
                  a("stroke", "#167b70"),
                  a("fill", "#167b7020"),
                ],
                [],
              ),
            ];
          })()
        : []),
    ],
  );
};
