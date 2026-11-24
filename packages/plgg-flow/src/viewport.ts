import { drawScenery } from "plgg-flow/scenery";
import {
  wireDepthRuns,
  type Occluder,
} from "plgg-flow/wireDepth";
import { move } from "plgg-flow/wireGeometry";
import { lazyLayer } from "plgg-flow/lazyLayer";
import {
  grid,
  labelWidth,
  nodeSize,
} from "plgg-flow/nodeSize";
import {
  type Side,
  wireGraph,
} from "plgg-flow/wiring";
import {
  projectSocket,
  portPosition,
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
  pickPlane,
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
  type Point3,
} from "plgg-board";
import {
  el,
  lazy,
  attr,
  key,
  text,
  onEvent,
  svgViewport,
  type Html,
} from "plgg-view";
import { sectionGraph } from "plgg-flow/spatial";
import { spatialGuides } from "plgg-flow/spatialView";
import {
  bridgePoints,
  polylineSampler,
} from "plgg-flow/polyline";
import {
  midpoint,
  distance,
  type Pinch,
} from "plgg-flow/gesture";
import {
  edgeIndex,
  portsFor,
  type Port,
} from "plgg-flow/connections";
import {
  encloseTrays,
  groupLoads,
  visibleScene,
} from "plgg-flow/hierarchy";
import {
  releasePointer,
  settleOrbit,
  beginStroke,
  movePointer,
  wheelZoom,
  orbitByDrag,
  selectNodes,
  selectArea,
  selectedEdges,
  chooseEdges,
  selectedNodes,
  zoom,
  moveConstrainedSelection,
  fitFlow,
  connect,
  disconnect,
  deleteSelected,
  frameOf,
  type Edge,
  type Flow,
  type Change,
  type FlowNode,
  type Drag,
} from "plgg-flow/model";
const local = (
  svg: SVGGraphicsElement,
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
const onGround = (
  camera: Camera,
  x: number,
  y: number,
) => project(camera)({ x, y, z: groundHeight });
const groundBounds = (flow: Flow) => {
  const corners = flow.frame
    ? [0, flow.frame.x].flatMap((x) =>
        [0, frameOf(flow).y].flatMap((y) => {
          const hit = pickPlane(
            flow.camera,
            { x, y },
            "z",
            groundHeight,
          );
          return isSome(hit) ? [hit.content] : [];
        }),
      )
    : [];
  return {
    left: Math.min(
      -640,
      ...corners.map((p) => p.x),
    ),
    right: Math.max(
      640,
      ...corners.map((p) => p.x),
    ),
    top: Math.min(
      -640,
      ...corners.map((p) => p.y),
    ),
    bottom: Math.max(
      640,
      ...corners.map((p) => p.y),
    ),
  };
};
const groundSurface = (
  flow: Flow,
): Html<Change> => {
  const { camera } = flow;
  const { left, right, top, bottom } =
    groundBounds(flow);
  const at = (x: number, y: number) =>
    onGround(camera, x, y);
  const side = groundSide(camera);
  const perimeter = [
    at(left, top),
    at(right, top),
    at(right, bottom),
    at(left, bottom),
  ]
    .map((p) => p.x + "," + p.y)
    .join(" ");
  return el(
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
        side === "below" ? "#b39884" : "#a6baa3",
      ),
      a("pointer-events", "none"),
    ],
    [],
  );
};
const worldGrid = (flow: Flow): Html<Change> => {
  const { camera } = flow;
  const { left, right, top, bottom } =
    groundBounds(flow);
  const at = (x: number, y: number) =>
    onGround(camera, x, y);
  const side = groundSide(camera);
  const line = (u: Point, v: Point) =>
    `M${u.x} ${u.y}L${v.x} ${v.y}`;
  const lines = (major: boolean) => {
    const ticks = (low: number, high: number) => {
      const span = high - low;
      if (
        !major &&
        Math.floor(high / grid) -
          Math.ceil(low / grid) +
          1 >
          160
      )
        return [];
      const unit = major ? 4 * grid : grid;
      const step =
        unit *
        Math.max(
          1,
          Math.ceil((span / unit + 1) / 160),
        );
      return Array.from(
        {
          length: Math.max(
            0,
            Math.floor(high / step) -
              Math.ceil(low / step) +
              1,
          ),
        },
        (_, i) =>
          (Math.ceil(low / step) + i) * step,
      ).filter(
        (n) => major || n % (4 * grid) !== 0,
      );
    };
    const d = [
      ...ticks(left, right).map((x) =>
        line(at(x, top), at(x, bottom)),
      ),
      ...ticks(top, bottom).map((y) =>
        line(at(left, y), at(right, y)),
      ),
    ].join("");
    return el<Change>(
      "path",
      [
        a("class", "world-grid"),
        a("d", d),
        a("fill", "none"),
        a(
          "stroke",
          side === "below"
            ? "#c3a48f"
            : "#b5c8b1",
        ),
        a("stroke-opacity", major ? 1 : 0.4),
      ],
      [],
    );
  };
  return el(
    "g",
    [a("pointer-events", "none")],
    [
      ...(grid * camera.scale >= 6
        ? [lines(false)]
        : []),
      lines(true),
    ],
  );
};
const surfaceLayer = lazyLayer();
const gridLayer = lazyLayer();
const footprintLayer = lazyLayer();
const waypointLayer = lazyLayer();
const footprint = (
  camera: Camera,
  n: FlowNode,
): Html<Change> => {
  const at = (x: number, y: number) =>
    onGround(camera, x, y);
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
};
const depthStems = (
  camera: Camera,
  nodes: Flow["nodes"],
  parents: ReadonlyMap<string, FlowNode>,
) => {
  const at = project(camera);
  const stems = nodes
    .map((n) => {
      const parent =
        n.parent === undefined
          ? undefined
          : parents.get(n.parent);
      const p = at({
          ...n.position,
          z: parent?.group
            ? parent.position.z
            : groundHeight,
        }),
        q = project(camera)(n.position);
      return `M${p.x} ${p.y}L${q.x} ${q.y}`;
    })
    .join("");
  return el(
    "path",
    [
      a("class", "depth-stems"),
      a(
        "opacity",
        camera.pitch || camera.yaw
          ? 1
          : Number(camera.perspective ?? 0),
      ),
      a("d", stems),
      a("stroke", "#83a9a0"),
      a("stroke-dasharray", "3 4"),
      a("pointer-events", "none"),
    ],
    [],
  );
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
const routedScene = (state: Flow) => {
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
  const wires = wireGraph(
    clipped,
    isSome(state.drag) &&
      state.drag.content.mode === "node" &&
      state.drag.content.node !== undefined
      ? { draggedNode: state.drag.content.node }
      : {},
  );
  return { scene, wires };
};
const sceneCache = new WeakMap<
  Flow["nodes"],
  {
    edges: Flow["edges"];
    branch: Flow["isolatedBranch"];
    overview: boolean;
    draggedNode: string | undefined;
    section: Parameters<typeof sectionGraph>[1];
    layout: ReturnType<typeof routedScene>;
  }
>();
// Visibility can synthesize edges; keep their identities across preview frames.
const viewportLayout = (state: Flow) => {
  const known = sceneCache.get(state.nodes);
  const section = state.spatial?.section,
    branch = state.isolatedBranch;
  const overview = Boolean(
    state.spatial?.overview &&
      state.camera.scale < 0.5,
  );
  const draggedNode =
    isSome(state.drag) &&
    state.drag.content.mode === "node"
      ? state.drag.content.node
      : undefined;
  if (
    known &&
    known.draggedNode === draggedNode &&
    known.edges === state.edges &&
    known.section === section &&
    known.branch === branch &&
    known.overview === overview
  )
    return known.layout;
  const layout = routedScene(state);
  sceneCache.set(state.nodes, {
    edges: state.edges,
    draggedNode,
    section,
    branch,
    overview,
    layout,
  });
  return layout;
};
type Layer = {
  depth: number;
  chosen?: boolean;
  arrow?: boolean;
  html: Html<Change>;
};
// Key the direct children so painter-order changes move their lazy subtrees.
const keyedLayer = (
  id: string,
  layer: Layer,
): Layer => ({
  ...layer,
  html: el("g", [key(id)], [layer.html]),
});
const deferred = (build: () => Html<Change>) =>
  build();
const layerMemo = <T>() =>
  new WeakMap<
    object,
    { inputs: unknown[]; value: T }
  >();
const bodies = new WeakMap<
  FlowNode,
  {
    camera: Camera;
    solid: ReturnType<typeof projectNodeBody>;
  }
>();
const polygonPoints = (
  points: readonly Point[],
) => points.map((p) => p.x + "," + p.y).join(" ");
const trayFrames = new WeakMap<
  Flow["nodes"],
  Flow["nodes"]
>();
const socketRadius = 3;
const nodeLayers = layerMemo<Layer>();
const wireLayers = layerMemo<Layer[]>();
const matches = (
  old: unknown[],
  next: unknown[],
) =>
  old.length === next.length &&
  old.every((v, i) => v === next[i]);
const defaultLabel = (
  node: FlowNode,
): Html<Change> =>
  el(
    "text",
    [a("text-anchor", "middle"), a("y", 5)],
    [text(node.label)],
  );
const scrollHint = (hint: number, frame: Point) =>
  el<Change>(
    "g",
    [
      key("hint" + hint),
      a("class", "scroll-hint"),
      a("pointer-events", "none"),
      a("opacity", 0),
    ],
    [
      el(
        "animate",
        [
          a("attributeName", "opacity"),
          a("values", "1;1;0"),
          a("keyTimes", "0;0.7;1"),
          a("dur", "1.6s"),
          a("fill", "freeze"),
        ],
        [],
      ),
      el(
        "rect",
        [
          a("width", frame.x),
          a("height", frame.y),
          a("fill", "#000"),
          a("fill-opacity", 0.45),
        ],
        [],
      ),
      el(
        "text",
        [
          a("x", frame.x / 2),
          a("y", frame.y / 2),
          a("text-anchor", "middle"),
          a("dominant-baseline", "middle"),
          a("font-size", 18),
          a("fill", "#fff"),
        ],
        [
          text(
            "Ctrl（⌘）＋ スクロールで拡大・縮小",
          ),
        ],
      ),
    ],
  );
const emptyPreview = () =>
  el<Change>(
    "g",
    [key("connection-preview")],
    [],
  );
export const drawFlow = (
  flow: Flow,
  renderLabel: (
    node: FlowNode,
  ) => Html<Change> = defaultLabel,
  registry: ViewRegistry = {},
): Html<Change> => {
  const framed =
    trayFrames.get(flow.nodes) ??
    encloseTrays(flow.nodes);
  trayFrames.set(flow.nodes, framed);
  const state =
    framed === flow.nodes
      ? flow
      : { ...flow, nodes: framed };
  const scenery = (state.scenery ?? []).map(
    (item) => drawScenery(item, state.camera),
  );
  const frame = frameOf(state);
  const { scene, wires } = viewportLayout(state);
  const drawing = {
    nodes: scene.nodes,
    ...(state.scenery && {
      scenery: state.scenery,
    }),
  };
  const ports = portsFor(state);
  const routes = new Map(
    wires.map((w) => [w.edge, w]),
  );
  type Socket = {
    point: Point3;
    handle: string | undefined;
    direction: Port["direction"];
  };
  const attachments = new Map<
    string,
    Partial<Record<Side, Socket[]>>
  >();
  for (const w of wires)
    for (const direction of [
      "source",
      "target",
    ] satisfies Port["direction"][]) {
      const side =
        direction === "source"
          ? w.sourceSide
          : w.targetSide;
      const id = w.edge[direction];
      const sockets = attachments.get(id) ?? {};
      const point = w[direction];
      const list = sockets[side] ?? [];
      const index = list.findIndex(
        (v) =>
          v.point.x === point.x &&
          v.point.y === point.y &&
          v.point.z === point.z,
      );
      if (
        index < 0 ||
        (direction === "source" &&
          list[index]?.direction === "target")
      ) {
        list[index < 0 ? list.length : index] = {
          point,
          direction,
          handle:
            direction === "source"
              ? w.edge.sourceHandle
              : w.edge.targetHandle,
        };
        sockets[side] = list;
        attachments.set(id, sockets);
      }
    }
  const chosen = new Set(selectedNodes(state));
  const projected = projectLayer(
    state.camera,
    (n: FlowNode) => n.position,
  )(scene.nodes).map(({ item, point }) => {
    const scale = projectedScale(
      state.camera,
      point.z,
    );
    return {
      ...item,
      item,
      p: point,
      scale,
    };
  });
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
            (nodeSize(n).width * n.scale) / 2 +
            48,
          h =
            (nodeSize(n).height * n.scale) / 2 +
            48;
        return (
          n.p.x + w >= 0 &&
          n.p.x - w <= frame.x &&
          n.p.y + h >= 0 &&
          n.p.y - h <= frame.y
        );
      });
  const parents = new Map(
    state.nodes.map((n) => [n.id, n]),
  );
  const counts = new Map(
    drawNodes.some((n) => n.collapsed)
      ? groupLoads(state).map((g) => [
          g.id,
          g.cards,
        ])
      : [],
  );
  const active =
    state.activeEdge &&
    state.edges[
      edgeIndex(state.edges, state.activeEdge)
    ];
  const picked = new Set(
    selectedEdges(state).map(
      (e) =>
        state.edges[edgeIndex(state.edges, e)],
    ),
  );
  const tags: {
    depth: number;
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    html: Html<Change>;
    id: string;
  }[] = [];
  const paintLayers = () => {
    const silhouettes = new Map<
      string,
      Point[][]
    >();
    const turned = new Map<
      string,
      Record<Side, boolean>
    >();
    const layers: Layer[] = drawNodes.map((n) => {
      // The projected geometry is shared by drawing and hit targets.
      const cached = bodies.get(n.item);
      const solid =
        cached?.camera === state.camera
          ? cached.solid
          : projectNodeBody(
              n,
              state.camera,
              cached?.solid.tagged,
            );
      if (cached?.solid !== solid)
        bodies.set(n.item, {
          camera: state.camera,
          solid,
        });
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
      // A socket sits on its flank. When the camera sees
      // the opposite flank, this one faces away: its dots
      // are drawn before the faces, so the solid hides
      // them. Face-on, both flanks are silhouette edges.
      const shows = (side: string) =>
        solid.visible.some(
          (f) => f.side === side,
        );
      const away = {
        right: shows("left"),
        bottom: shows("top"),
        top: shows("bottom"),
        left: shows("right"),
      };
      turned.set(n.id, away);
      if (picked.size)
        silhouettes.set(
          n.id,
          solid.visible.map((face) =>
            face.points.map((p) => ({
              x: n.p.x + p.x * n.scale,
              y: n.p.y + p.y * n.scale,
            })),
          ),
        );
      const drag = isSome(state.drag)
        ? state.drag.content
        : undefined;
      const original = drag?.originalFrames?.get(
        n.id,
      );
      const extent =
        (drag?.mode === "frame" &&
          drag.node === n.id) ||
        (drag?.mode === "node" &&
          original &&
          (original.width !== n.width ||
            original.height !== n.height));
      const quiet =
        n.quiet &&
        state.hoveredNode !== n.id &&
        !chosen.has(n.id);
      if (solid.tagged && solid.caption) {
        tags.push({
          id: n.id,
          depth: n.p.z,
          x: n.p.x + n.scale * solid.caption[4]!,
          y: n.p.y + n.scale * solid.caption[5]!,
          scale: n.scale,
          width:
            Math.min(
              nodeSize(n).width,
              labelWidth(n.label),
            ) *
              n.scale +
            4,
          height: 16 * n.scale + 4,
          html: el(
            "g",
            [
              a(
                "class",
                quiet ? "quiet-node" : "",
              ),
              a(
                "fill",
                quiet
                  ? "var(--pencil,gray)"
                  : "currentColor",
              ),
              a(
                "style",
                "stroke:var(--paper,white)",
              ),
              a("stroke-width", 2 / n.scale),
              a("paint-order", "stroke fill"),
            ],
            [render(n, state)],
          ),
        });
      }
      const inputs = [
        extent,
        state.camera,
        quiet,
        chosen.has(n.id),
        state.spatial?.depthColor,
        isSome(state.source),
        isSome(state.source) &&
          state.source.content === n.id,
        counts.get(n.id),
        render,
        registry.nodes?.has(n.type ?? "")
          ? state
          : undefined,
        ports
          .get(n.id)
          ?.find((p) => p.direction === "source")
          ?.id,
        ports
          .get(n.id)
          ?.find((p) => p.direction === "target")
          ?.id,
        ...(
          [
            "right",
            "left",
            "top",
            "bottom",
          ] satisfies Side[]
        ).flatMap((side) => {
          return (
            attachments.get(n.id)?.[side] ?? []
          ).flatMap((used) => [
            side,
            used.direction,
            used.handle,
            used.point.x,
            used.point.y,
            used.point.z,
          ]);
        }),
      ];
      const old = nodeLayers.get(n.item);
      if (old && matches(old.inputs, inputs))
        return old.value;
      // A socket earns its dot by carrying a wire; a bare
      // one shows only while it can take a new connection.
      const sockets = (behind: boolean) =>
        (
          [
            "right",
            "left",
            "top",
            "bottom",
          ] satisfies Side[]
        ).flatMap((side) => {
          if (behind !== away[side]) return [];
          const usedSockets = attachments.get(
            n.id,
          )?.[side] ?? [undefined];
          return usedSockets.flatMap(
            (used, index) => {
              const connecting = isSome(
                  state.source,
                ),
                canConnect =
                  n.connectable !== false &&
                  (chosen.has(n.id) ||
                    connecting);
              if (!used && !canConnect) return [];
              // where arrows arrive, the arrowhead is the mark:
              // no dot under it
              if (
                !canConnect &&
                used?.direction === "target"
              )
                return [];
              const direction = canConnect
                ? connecting
                  ? "target"
                  : "source"
                : (used?.direction ?? "source");
              const handle =
                used?.direction === direction
                  ? used.handle
                  : ports
                      .get(n.id)
                      ?.find(
                        (p) =>
                          p.direction ===
                          direction,
                      )?.id;
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
              const offset = 0;
              const socket =
                used && n.group && !n.collapsed
                  ? project(state.camera)(
                      used.point,
                    )
                  : projectSocket(
                      n,
                      state.camera,
                      side,
                      offset,
                    );
              const x =
                  (socket.x - n.p.x) / n.scale,
                y = (socket.y - n.p.y) / n.scale;
              // A socket is a ball on the box's flank: it
              // looks round from every side, so wires
              // never lose their ends when the view turns.
              const control = el<Change>(
                "circle",
                [
                  a("data-port", n.id),
                  a("data-side", side),
                  ...(n.group && used
                    ? [
                        a(
                          "data-socket-index",
                          index,
                        ),
                      ]
                    : []),
                  a("data-offset", offset),
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
                  a("r", socketRadius),
                  a(
                    "fill",
                    isSome(state.source) &&
                      state.source.content ===
                        n.id
                      ? "#ed623a"
                      : direction === "source"
                        ? "#167b70"
                        : "#e6f4ef",
                  ),
                ],
                [el("title", [], [text(title)])],
              );
              return [control];
            },
          );
        });
      const value = {
        depth: solid.depth,
        html: lazy(deferred, () =>
          el<Change>(
            "g",
            [
              a("data-node", n.id),
              onEvent<Change>(
                "pointerenter",
                () =>
                  some((s) => ({
                    ...s,
                    hoveredNode: n.id,
                  })),
              ),
              onEvent<Change>(
                "pointerleave",
                () =>
                  some((s) =>
                    s.hoveredNode === n.id
                      ? {
                          ...s,
                          hoveredNode: undefined,
                        }
                      : s,
                  ),
              ),
              ...(quiet
                ? [
                    a("class", "quiet-node"),
                    a(
                      "fill",
                      "var(--pencil,gray)",
                    ),
                  ]
                : []),
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
              ...(solid.tray
                ? [
                    el<Change>(
                      "polygon",
                      [
                        a("data-group", n.id),
                        a(
                          "points",
                          polygonPoints(
                            solid.tray,
                          ),
                        ),
                        a(
                          "fill",
                          state.camera.pitch ||
                            state.camera.yaw
                            ? "var(--wash)"
                            : "none",
                        ),
                        a("fill-opacity", 0.4),
                        a("stroke", "var(--ink)"),
                        a(
                          "vector-effect",
                          "non-scaling-stroke",
                        ),
                        a(
                          "pointer-events",
                          "stroke",
                        ),
                        ...(extent
                          ? [
                              a(
                                "stroke-dasharray",
                                "6 4",
                              ),
                            ]
                          : []),
                      ],
                      [],
                    ),
                    el<Change>(
                      "text",
                      [
                        a("class", "tray-label"),
                        a(
                          "transform",
                          `matrix(${solid.label.join(" ")})`,
                        ),
                        a("x", 4),
                        a("y", 14),
                      ],
                      [text(n.label)],
                    ),
                    el<Change>(
                      "polygon",
                      [
                        a(
                          "data-group-handle",
                          n.id,
                        ),
                        a(
                          "points",
                          polygonPoints(
                            solid.handle,
                          ),
                        ),
                        a("fill", "var(--paper)"),
                        a("stroke", "var(--ink)"),
                      ],
                      [],
                    ),
                  ]
                : []),
              ...sockets(true),
              ...solid.visible.map((face) =>
                el<Change>(
                  "polygon",
                  [
                    a(
                      "data-node-face",
                      face.side,
                    ),
                    a(
                      "points",
                      face.points
                        .map(
                          (p) => p.x + "," + p.y,
                        )
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
                    a(
                      "stroke",
                      chosen.has(n.id)
                        ? "#ed623a"
                        : quiet
                          ? "var(--pencil,gray)"
                          : "#718e89",
                    ),
                    a("stroke-linejoin", "round"),
                  ],
                  [],
                ),
              ),
              solid.caption && !solid.tagged
                ? el(
                    "g",
                    [
                      a(
                        "data-node-caption",
                        solid.tagged ? "tag" : "",
                      ),
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
                            -nodeSize(n).width /
                              2,
                          ),
                          a(
                            "y",
                            -nodeSize(n).height /
                              2,
                          ),
                          a(
                            "width",
                            nodeSize(n).width,
                          ),
                          a(
                            "height",
                            nodeSize(n).height,
                          ),
                          a(
                            "viewBox",
                            `${-nodeSize(n).width / 2} ${-nodeSize(n).height / 2} ${nodeSize(n).width} ${nodeSize(n).height}`,
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
                        a(
                          "text-anchor",
                          "middle",
                        ),
                        a(
                          "y",
                          nodeSize(n).height / 2 +
                            13,
                        ),
                        a("font-size", 11),
                        a(
                          "pointer-events",
                          "none",
                        ),
                      ],
                      [
                        text(
                          (counts.get(n.id) ??
                            0) + " 枚",
                        ),
                      ],
                    ),
                  ]
                : []),
              ...sockets(false),
            ],
          ),
        ),
      };
      const layer = keyedLayer(
        "node-" + n.id,
        value,
      );
      nodeLayers.set(n.item, {
        inputs,
        value: layer,
      });
      return layer;
    });
    // Sort projected segments with the billboards so a crossing changes
    // order when the camera moves around the diagram.
    const solidDepth = new Map(
      drawNodes.map((n, i) => [
        n.id,
        layers[i]?.depth ?? n.p.z,
      ]),
    );
    // The stretch of wire next to a socket paints over
    // its box — unless that flank faces away, where the
    // solid hides the wire end.
    const above = (
      id: string,
      direction: Side,
      depth: number,
    ) => {
      const solid = solidDepth.get(id) ?? depth;
      return turned.get(id)?.[direction]
        ? Math.min(depth, solid - 0.02)
        : Math.max(depth, solid + 0.02);
    };
    const flat =
      state.camera.yaw === 0 &&
      state.camera.pitch === 0;
    const boxes: Occluder[] = flat
      ? []
      : drawNodes.map((n) => {
          const solid = bodies.get(n.item)!.solid;
          const outline = solid.visible.flatMap(
            (face) => face.points,
          );
          const xs = outline.map(
              (p) => n.p.x + p.x * n.scale,
            ),
            ys = outline.map(
              (p) => n.p.y + p.y * n.scale,
            );
          return {
            left: Math.min(...xs),
            right: Math.max(...xs),
            top: Math.min(...ys),
            bottom: Math.max(...ys),
            depth: solidDepth.get(n.id) ?? n.p.z,
          };
        });
    const originalIndices = new Map(
      state.edges.map((e, i) => [e, i]),
    );
    for (const [
      index,
      { edge, original },
    ] of scene.edges.entries()) {
      const from = lookup.get(edge.source),
        to = lookup.get(edge.target);
      if (!from || !to) continue;
      const wire = routes.get(edge);
      if (!wire) continue;
      const chosenWire = picked.has(original);
      const sharedArrival = attachments
        .get(to.id)
        ?.[
          wire.targetSide
        ]?.some((s) => s.direction === "source" && s.point.x === wire.target.x && s.point.y === wire.target.y && s.point.z === wire.target.z);
      const originalIndex =
        originalIndices.get(original);
      const tone =
        original.quiet &&
        state.hoveredEdge !== original &&
        !chosenWire &&
        !chosen.has(from.id) &&
        !chosen.has(to.id) &&
        state.hoveredNode !== from.id &&
        state.hoveredNode !== to.id
          ? " quiet-wire"
          : "";
      const inputs = [
        tone,
        index,
        original,
        state.camera,
        chosenWire,
        sharedArrival,
        originalIndex,
        flat ? undefined : state.nodes,
        frame,
        state.ink,
        cull,
        from.item,
        to.item,
        turned.has(from.id),
        turned.has(to.id),
        registry.edgeLabels?.get(edge.type ?? ""),
        registry.edgeLabels?.has(edge.type ?? "")
          ? state
          : undefined,
      ];
      const old = wireLayers.get(wire);
      if (old && matches(old.inputs, inputs)) {
        for (const layer of old.value)
          layers.push(layer);
        continue;
      }
      const items: Layer[] = [];
      const paintDepth = (
        id: string,
        side: Side,
        depth: number,
      ) =>
        chosenWire && !turned.get(id)?.[side]
          ? Infinity
          : above(id, side, depth);
      const knots = bridgePoints(
        wire.points,
        wire.lift,
        flat,
      );
      const poly = polylineSampler(knots);
      const sample = (t: number) => {
        const p = project(state.camera)(poly(t));
        return {
          ...p,
          scale: projectedScale(
            state.camera,
            p.z,
          ),
        };
      };
      const points = knots.map((k) => {
        const p = project(state.camera)(k);
        return {
          ...p,
          scale: projectedScale(
            state.camera,
            p.z,
          ),
        };
      });
      if (
        cull &&
        (points.every((p) => p.x < -64) ||
          points.every(
            (p) => p.x > frame.x + 64,
          ) ||
          points.every((p) => p.y < -64) ||
          points.every((p) => p.y > frame.y + 64))
      )
        continue;
      // A face-on camera shows the whole stroke without depth seams.
      const controls = wire.controls;
      const line =
        flat &&
        controls &&
        (wire.source.z === wire.target.z ||
          !state.camera.perspective)
          ? [
              wire.source,
              ...controls,
              wire.target,
            ]
              .map((k, i) => {
                const p = project(state.camera)(
                  k,
                );
                return (
                  (i === 0
                    ? "M"
                    : i === 1
                      ? "C"
                      : " ") +
                  p.x +
                  " " +
                  p.y
                );
              })
              .join("")
          : flat
            ? points
                .map(
                  (p, i) =>
                    (i ? "L" : "M") +
                    p.x +
                    " " +
                    p.y,
                )
                .join("")
            : "";
      const events = () => [
        ...(original.quiet
          ? [
              onEvent<Change>(
                "pointerenter",
                () =>
                  some((s) => ({
                    ...s,
                    hoveredEdge: original,
                  })),
              ),
              onEvent<Change>(
                "pointerleave",
                () =>
                  some((s) =>
                    s.hoveredEdge === original
                      ? {
                          ...s,
                          hoveredEdge: undefined,
                        }
                      : s,
                  ),
              ),
            ]
          : []),

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
              SVGGraphicsElement &&
            e.currentTarget.ownerSVGElement
          ) {
            const pointer = local(
              e.currentTarget,
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
                    : wire.source.z,
                p = unproject(state.camera, q, z),
                prev = original.waypoints ?? [],
                at = Math.min(
                  prev.length,
                  Math.max(0, nearest - 2),
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
                chosenEdges: [
                  ...selectedEdges(s).filter(
                    (e) => e !== original,
                  ),
                  next,
                ],
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
                  ...selectNodes([])(s),
                  chosenEdges: [original],
                  activeEdge: original,
                  source: none(),
                  drag: some<Drag>({
                    pointer: e.pointerId,
                    mode: "pan",
                    node: "",
                    last: point.content,
                  }),
                }));
              }
            }
          }
          return some((s) => {
            const prev = selectedEdges(s);
            const next = e.shiftKey
              ? prev.includes(original)
                ? prev.filter(
                    (v) => v !== original,
                  )
                : [...prev, original]
              : [original];
            return chooseEdges(next)(
              e.shiftKey ? s : selectNodes([])(s),
            );
          });
        }),
        onEvent<Change>("dblclick", () =>
          some(disconnect(original)),
        ),
      ];
      const paint = (
        path: string,
        visible: Html<Change>,
      ) => {
        const attributes = events();
        // a wire is a hairline; what takes the click is
        // a band around it wide enough for a finger
        const hitWidth =
          edge.interactionWidth ?? 16;
        return hitWidth > 0
          ? el("g", attributes, [
              el(
                "path",
                [
                  a("class", "edge-hit"),
                  a("d", path),
                  a("fill", "none"),
                  a("stroke", "#000"),
                  // unseen whatever a stylesheet does
                  // to stroke colours
                  a("stroke-opacity", 0),
                  a("stroke-width", hitWidth),
                  a("pointer-events", "stroke"),
                ],
                [],
              ),
              visible,
            ])
          : el("g", attributes, [visible]);
      };
      let length = 0;
      const runs = wireDepthRuns(points, boxes);
      for (const [
        indexInWire,
        run,
      ] of runs.entries()) {
        const a0 = run[0]!,
          b = run[run.length - 1]!;
        const offset = length;
        length += run.reduce(
          (sum, p, j) =>
            j
              ? sum +
                Math.hypot(
                  p.x - run[j - 1]!.x,
                  p.y - run[j - 1]!.y,
                )
              : sum,
          0,
        );
        const depth = flat
          ? (a0.z + run[1]!.z) / 2
          : Math.max(...run.map((p) => p.z));
        const fade = Math.min(
          1,
          Math.max(0, (depth + 300) / 600),
        );
        const color = tone
          ? "var(--pencil,gray)"
          : edge.highlighted
            ? "#e36731"
            : `hsl(174 28% ${60 - fade * 38}%)`;
        const path =
          line ||
          run
            .map(
              (p, j) =>
                (j ? "L" : "M") + p.x + " " + p.y,
            )
            .join("");
        const behindFace = (
          id: string,
          side: Side,
        ) =>
          chosenWire &&
          turned.get(id)?.[side] &&
          silhouettes
            .get(id)
            ?.some(
              (face) =>
                insideLasso(a0, face) ||
                insideLasso(b, face),
            );
        // Only the vertical risers meet the sockets. The raised deck
        // participates in depth sorting at its own projected height.
        const deckSegment =
          knots !== wire.points &&
          indexInWire > 0 &&
          indexInWire < runs.length - 1;
        const visible = lazy(deferred, () => {
          return el<Change>(
            "path",
            [
              a(
                "class",
                (edge.animated
                  ? "edge animated"
                  : "edge") + tone,
              ),
              a("d", path),
              a(
                "data-edge-index",
                String(originalIndex),
              ),
              a(
                "data-edge",
                JSON.stringify([
                  edge.source,
                  edge.target,
                ]),
              ),
              ...(original.id === undefined
                ? []
                : [
                    a(
                      "data-edge-id",
                      original.id,
                    ),
                  ]),
              a("style", `--arc:${-offset}px`),
              a("fill", "none"),
              a("stroke", color),
              ...(chosenWire
                ? [a("data-chosen", "true")]
                : []),
              a(
                "stroke-width",
                (flat ? run[1]!.scale : b.scale) *
                  (chosenWire ? 2.4 : 1),
              ),
              a("stroke-linecap", "round"),
            ],
            [],
          );
        });
        items.push({
          chosen: chosenWire,
          depth:
            !chosenWire && !flat
              ? depth -
                (runs.length > 1 ? 1e-8 : 0)
              : deckSegment
                ? depth
                : indexInWire === 0 ||
                    behindFace(
                      edge.source,
                      wire.sourceSide,
                    )
                  ? paintDepth(
                      edge.source,
                      wire.sourceSide,
                      depth - 0.01,
                    )
                  : indexInWire ===
                        runs.length - 1 ||
                      behindFace(
                        edge.target,
                        wire.targetSide,
                      )
                    ? paintDepth(
                        edge.target,
                        wire.targetSide,
                        depth - 0.01,
                      )
                    : chosenWire
                      ? Infinity
                      : depth - 0.01,
          html: lazy(deferred, () =>
            paint(path, visible),
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
        const bridge = knots !== wire.points;
        const deck = knots[1]?.z ?? wire.target.z;
        const at = project(state.camera)(
          sharedArrival
            ? wire.target
            : wire.arrow.at,
        );
        const tip = atStart
          ? sample(0)
          : {
              ...at,
              scale: projectedScale(
                state.camera,
                at.z,
              ),
            };
        const sourceRiser =
          wire.points[1]?.z !== wire.source.z &&
          wire.points[1]?.x === wire.source.x &&
          wire.points[1]?.y === wire.source.y;
        const near = bridge
          ? atStart
            ? (points[1] ?? tip)
            : project(state.camera)({
                ...wire.target,
                z: 2 * wire.target.z - deck,
              })
          : atStart
            ? (!edge.route ||
                edge.route === "curve") &&
              edge.source !== edge.target &&
              !sourceRiser
              ? project(state.camera)({
                  ...move(
                    wire.source,
                    wire.sourceSide,
                    1,
                  ),
                  z: wire.source.z,
                })
              : (points[1] ?? tip)
            : sharedArrival
              ? (points
                  .slice(0, -1)
                  .reverse()
                  .find(
                    (p) =>
                      p.x !== tip.x ||
                      p.y !== tip.y,
                  ) ?? tip)
              : project(state.camera)(
                  wire.arrow.toward,
                );
        const towardTip =
          atStart || (sharedArrival && !bridge);
        const radians = Math.atan2(
          towardTip
            ? tip.y - near.y
            : near.y - tip.y,
          towardTip
            ? tip.x - near.x
            : near.x - tip.x,
        );
        const angle = (radians * 180) / Math.PI;
        const gap = Math.hypot(
          wire.source.x - wire.target.x,
          wire.source.y - wire.target.y,
        );
        const arrowScale =
          tip.scale *
          (edge.source === edge.target
            ? 1
            : Math.min(1, gap / 60));
        const sending = atStart || sharedArrival;
        const node = atStart ? from : to;
        const radius = sending
          ? socketRadius * node.scale
          : 0;
        const x =
          tip.x - radius * Math.cos(radians);
        const y =
          tip.y - radius * Math.sin(radians);
        items.push({
          chosen: chosenWire,
          arrow: true,
          depth: sending
            ? (solidDepth.get(node.id) ?? tip.z) -
              0.01
            : paintDepth(
                atStart
                  ? edge.source
                  : edge.target,
                atStart
                  ? wire.sourceSide
                  : wire.targetSide,
                tip.z - 0.01,
              ),
          html: lazy(deferred, () =>
            el(
              "polygon",
              [
                a("data-arrow", side),
                ...(tone
                  ? [a("class", tone.trim())]
                  : []),
                a(
                  "transform",
                  `translate(${x} ${y}) rotate(${angle}) scale(${arrowScale})`,
                ),
                a("points", "0,0 -9,-4 -9,4"),
                a(
                  "fill",
                  tone
                    ? "var(--pencil,gray)"
                    : "#426f71",
                ),
                a("pointer-events", "none"),
              ],
              [],
            ),
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
        items.push({
          depth: middle.z,
          html: lazy(deferred, () =>
            el(
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
                        a(
                          "text-anchor",
                          "middle",
                        ),
                        a("y", -8),
                        a(
                          "paint-order",
                          "stroke",
                        ),
                        a("stroke", "#f7faf7"),
                        a("stroke-width", 3),
                        a(
                          "stroke-linejoin",
                          "round",
                        ),
                        a(
                          "pointer-events",
                          "none",
                        ),
                      ],
                      [text(edge.label ?? "")],
                    ),
                  ],
            ),
          ),
        });
      }
      const group = items.map((layer, i) =>
        keyedLayer(
          "wire-" + index + "-" + i,
          layer,
        ),
      );
      wireLayers.set(wire, {
        inputs,
        value: group,
      });
      for (const layer of group)
        layers.push(layer);
    }
    layers.push(
      ...scenery.filter(
        (s) => s.layer === "sorted",
      ),
    );
    const sorted = layers.sort(
      (a, b) =>
        a.depth - b.depth ||
        Number(!!a.chosen) - Number(!!b.chosen) ||
        Number(!!a.arrow) - Number(!!b.arrow),
    );
    return el(
      "g",
      [key("depth-layers")],
      sorted.map((layer) => layer.html),
    );
  };
  const selectRegion = (
    inside: (p: Point) => boolean,
  ) => {
    const projectPoint = project(state.camera);
    const edges = scene.edges.flatMap(
      ({ edge, original }) => {
        const wire = routes.get(edge);
        return wire &&
          inside(projectPoint(wire.source)) &&
          inside(projectPoint(wire.target))
          ? [original]
          : [];
      },
    );
    return selectArea(
      projected
        .filter((n) => inside(n.p))
        .map((n) => n.id),
      edges,
    );
  };
  const easeScale =
    (state.orbitEase?.from.scale ??
      state.camera.scale) / state.camera.scale;
  const easeDrawing = (
    children: Html<Change>[],
  ) =>
    state.orbitEase?.to === state.camera
      ? [
          el(
            "g",
            [
              a(
                "style",
                `--fit-scale:${easeScale};--fit-x:${state.orbitEase.from.origin.x - state.camera.origin.x * easeScale}px;--fit-y:${state.orbitEase.from.origin.y - state.camera.origin.y * easeScale}px;animation:flow-fit 200ms ease-out`,
              ),
            ],
            [
              el(
                "style",
                [],
                [
                  text(
                    "@keyframes flow-fit {from {transform:translate(var(--fit-x),var(--fit-y)) scale(var(--fit-scale))} to {transform:none}}",
                  ),
                ],
              ),
              ...children,
            ],
          ),
        ]
      : children;
  return svgViewport<Change>(
    frame.x,
    frame.y,
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
          const dot = e.target.closest(
              "[data-port]",
            ),
            side = dot?.getAttribute("data-side"),
            node = lookup.get(port);
          const socket =
            node &&
            (side === "left" ||
              side === "right" ||
              side === "top" ||
              side === "bottom")
              ? (attachments.get(port)?.[side]?.[
                  Number(
                    dot?.getAttribute(
                      "data-socket-index",
                    ) ?? -1,
                  )
                ]?.point ??
                portPosition(
                  node,
                  side,
                  Number(
                    dot?.getAttribute(
                      "data-offset",
                    ),
                  ),
                ))
              : undefined;
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
                    ...(socket ? { socket } : {}),
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
        const group = lookup.get(node);
        if (
          group &&
          e.target.closest("[data-group-handle]")
        ) {
          const hit = pickPlane(
            state.camera,
            point.content,
            "z",
            group.position.z,
          );
          if (!isSome(hit) || group.locked)
            return none();
          svg.setPointerCapture(e.pointerId);
          const size = nodeSize(group);
          return some((s) => ({
            ...s,
            nodes: encloseTrays(s.nodes),
            drag: some<Drag>({
              mode: "frame",
              node,
              last: point.content,
              pointer: e.pointerId,
              frameOffset: {
                x:
                  group.position.x +
                  size.width / 2 -
                  hit.content.x,
                y:
                  group.position.y +
                  size.height / 2 -
                  hit.content.y,
              },
            }),
          }));
        }
        if (node && e.shiftKey) {
          const ids = selectedNodes(state);
          return some(
            selectNodes(
              ids.includes(node)
                ? ids.filter((id) => id !== node)
                : [...ids, node],
              true,
            ),
          );
        }
        svg.setPointerCapture(e.pointerId);
        if (e.pointerType !== "touch")
          svg.focus({ preventScroll: true });
        return some((s) => ({
          ...(node &&
          !selectedNodes(s).includes(node)
            ? selectNodes([node])(s)
            : s),
          ...(node
            ? { nodes: encloseTrays(s.nodes) }
            : {}),
          source: none(),
          drag: some<Drag>({
            pointer: e.pointerId,
            last: point.content,
            first: point.content,
            pressed: point.content,
            ...(node
              ? {
                  originalFrames: new Map(
                    framed
                      .filter((n) => n.group)
                      .map((n) => [n.id, n]),
                  ),
                }
              : {}),
            ...(!node && s.lasso
              ? { outline: [point.content] }
              : {}),
            node,
            mode: node
              ? "node"
              : s.lasso
                ? "lasso"
                : e.shiftKey
                  ? "box"
                  : e.button === 0 &&
                      e.pointerType !== "touch" &&
                      (e.metaKey || e.ctrlKey)
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
              drawing,
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
              manualZoom:
                rotated.manualZoom ||
                Math.abs(span - nextSpan) > 0.1,
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
                drawing,
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
                ...settleOrbit(rest, drawing),
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
                ? selectRegion((p) =>
                    insideLasso(p, outline),
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
              return name === "pointerup"
                ? selectRegion(
                    (p) =>
                      p.x >=
                        Math.min(
                          first.x,
                          last.x,
                        ) &&
                      p.x <=
                        Math.max(
                          first.x,
                          last.x,
                        ) &&
                      p.y >=
                        Math.min(
                          first.y,
                          last.y,
                        ) &&
                      p.y <=
                        Math.max(first.y, last.y),
                  )({ ...s, drag: none() })
                : { ...s, drag: none() };
            }
            const released = releasePointer(
              s,
              drawing,
            );
            if (
              name === "pointerup" &&
              isSome(s.drag)
            ) {
              const d = s.drag.content;
              if (
                d.pressed &&
                Math.hypot(
                  d.last.x - d.pressed.x,
                  d.last.y - d.pressed.y,
                ) < 4
              ) {
                if (d.mode === "node")
                  return selectNodes([d.node])(
                    released,
                  );
                if (
                  d.mode === "pan" ||
                  d.mode === "orbit"
                )
                  return selectNodes([])(
                    released,
                  );
              }
            }
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
        // Like an embedded map: a plain wheel scrolls the
        // page; Ctrl/⌘ (and a trackpad pinch, which the
        // browser reports with Ctrl) zooms the board.
        if (!e.ctrlKey && !e.metaKey) {
          const at = e.timeStamp;
          return some((s) =>
            s.scrollHint !== undefined &&
            at - s.scrollHint < 400
              ? s
              : { ...s, scrollHint: at },
          );
        }
        e.preventDefault();
        const p = local(e.currentTarget, e);
        return isSome(p)
          ? some(wheelZoom(p.content, e.deltaY))
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
    easeDrawing([
      ...(state.scenery
        ? scenery
            .filter((s) => s.layer === "behind")
            .sort((a, b) => a.depth - b.depth)
            .map((s) => s.html)
        : [
            surfaceLayer(
              state.camera,
              [state.frame],
              () => groundSurface(state),
            ),
            ...drawNodes
              .filter(
                (n) =>
                  !(n.group && !n.collapsed) &&
                  !parents.get(n.parent ?? "")
                    ?.group,
              )
              .map((n) =>
                footprintLayer(
                  n.item,
                  [state.camera],
                  () =>
                    footprint(
                      state.camera,
                      n.item,
                    ),
                ),
              ),
            gridLayer(
              state.camera,
              [state.frame],
              () => worldGrid(state),
            ),
            depthStems(
              state.camera,
              drawNodes,
              parents,
            ),
          ]),
      // Keep the preview in its own SVG layer across pointer updates.
      isSome(state.drag) &&
      state.drag.content.mode === "connect"
        ? el(
            "g",
            [key("connection-preview")],
            (() => {
              const drag = state.drag.content,
                start = lookup.get(drag.node);
              const socket = drag.socket
                ? project(state.camera)(
                    drag.socket,
                  )
                : start &&
                  projectSocket(
                    start,
                    state.camera,
                    "source",
                    0,
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
                        a(
                          "pointer-events",
                          "none",
                        ),
                      ],
                      [],
                    ),
                  ]
                : [];
            })(),
          )
        : lazy(emptyPreview, undefined),
      paintLayers(),
      ...scenery
        .filter((s) => s.layer === "front")
        .map((s) => s.html),
      ...(() => {
        const placed: {
          x: number;
          y: number;
          width: number;
          height: number;
        }[] = [];
        return tags
          .sort((a, b) => b.depth - a.depth)
          .map((tag) => {
            let y = tag.y;
            while (
              placed.some(
                (p) =>
                  Math.abs(p.x - tag.x) * 2 <=
                    p.width + tag.width &&
                  Math.abs(p.y - y) * 2 <=
                    p.height + tag.height,
              )
            )
              y -= 4;
            placed.push({ ...tag, y });
            return el(
              "g",
              [
                key("tag-" + tag.id),
                a("pointer-events", "none"),
                a("data-node-caption", "tag"),
              ],
              [
                ...(tag.y - y > 6
                  ? [
                      el(
                        "line",
                        [
                          a("x1", tag.x),
                          a("x2", tag.x),
                          a("y1", y),
                          a(
                            "y2",
                            tag.y +
                              10 * tag.scale,
                          ),
                          a(
                            "stroke",
                            "var(--pencil,gray)",
                          ),
                        ],
                        [],
                      ),
                    ]
                  : []),
                el(
                  "g",
                  [
                    a(
                      "transform",
                      `translate(${tag.x} ${y}) scale(${tag.scale})`,
                    ),
                  ],
                  [tag.html],
                ),
              ],
            );
          });
      })(),
      ...(active &&
      scene.edges.some(
        (e) => e.original === active,
      )
        ? (active.waypoints ?? []).map(
            (point, index) => {
              return waypointLayer(
                point,
                [active, index, state.camera],
                () => {
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
                              pointer:
                                e.pointerId,
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
                              active.waypoints ??
                              []
                            ).filter(
                              (_, i) =>
                                i !== index,
                            ),
                          };
                          return some((s) => ({
                            ...s,
                            chosenEdges:
                              selectedEdges(
                                s,
                              ).map((e) =>
                                e === active
                                  ? next
                                  : e,
                              ),
                            activeEdge: next,
                            edges: s.edges.map(
                              (v) =>
                                v === active
                                  ? next
                                  : v,
                            ),
                          }));
                        },
                      ),
                    ],
                    [],
                  );
                },
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
                a("class", "marquee"),
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
                  a("class", "marquee"),
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
      ...(state.scrollHint === undefined
        ? []
        : [scrollHint(state.scrollHint, frame)]),
    ]),
  );
};

export const flowView = drawFlow;
