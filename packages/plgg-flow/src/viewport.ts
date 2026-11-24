import {
  roomFor,
  type RoomLayout,
} from "plgg-flow/autoLayout";
import {
  faceAxes,
  movingRooms,
  roomFilter,
  turnRooms,
} from "plgg-flow/roomCamera";
import { roomView } from "plgg-flow/roomView";
import { move } from "plgg-flow/wireGeometry";
import { lazyLayer } from "plgg-flow/lazyLayer";
import {
  grid,
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
import {
  groupVolumes,
  spatialGuides,
} from "plgg-flow/spatialView";
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
  groupLoads,
  visibleScene,
  subtree,
} from "plgg-flow/hierarchy";
import {
  viewAt,
  releasePointer,
  beginStroke,
  movePointer,
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
    const step = major ? 4 * grid : grid;
    const ticks = (low: number, high: number) =>
      Array.from(
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
const frameLayer = lazyLayer();
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
  rooms?: RoomLayout,
) => {
  const at = project(camera);
  const stems = nodes
    .map((n) => {
      const p = at({
          ...n.position,
          z: rooms
            ? (roomFor(rooms, n)?.min.z ??
              n.position.z)
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
        Number(camera.perspective ?? 0),
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
const routedScene = (
  state: Flow,
  rooms: Flow["rooms"],
) => {
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
    {
      ...clipped,
      ...(rooms && { rooms }),
    },
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
    rooms: Flow["rooms"];
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
  const rooms =
    state.rooms && !faceAxes(state.camera)
      ? state.rooms
      : undefined;
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
    known.rooms === rooms &&
    known.edges === state.edges &&
    known.section === section &&
    known.branch === branch &&
    known.overview === overview
  )
    return known.layout;
  const layout = routedScene(state, rooms);
  sceneCache.set(state.nodes, {
    rooms,
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
export const flowView = (
  flow: Flow,
  renderLabel: (
    node: FlowNode,
  ) => Html<Change> = defaultLabel,
  registry: ViewRegistry = {},
): Html<Change> => {
  const state = movingRooms(flow);
  const filter = roomFilter(flow);
  const muted = (n: FlowNode) =>
    !!flow.rooms &&
    Object.entries(filter).some(
      ([key, value]) =>
        (n.data?.[key] ?? "—") !== value,
    );
  const frame = frameOf(state);
  const { scene, wires } = viewportLayout(state);
  const ports = portsFor(state);
  const routes = new Map(
    wires.map((w) => [w.edge, w]),
  );
  type Socket = {
    handle: string | undefined;

    direction: Port["direction"];
  };
  const attachments = new Map<
    string,
    Partial<Record<Side, Socket>>
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
      // a side that sends any wire is a source side; one
      // that only receives is marked by arrowheads alone
      if (
        !sockets[side] ||
        (direction === "source" &&
          sockets[side]?.direction === "target")
      ) {
        sockets[side] = {
          direction,
          handle:
            direction === "source"
              ? w.edge.sourceHandle
              : w.edge.targetHandle,
        };
        attachments.set(id, sockets);
      }
    }
  const chosen = new Set(selectedNodes(state));
  const projected = projectLayer(
    state.camera,
    (n: FlowNode) => n.position,
  )(scene.nodes).map(({ item, point }) => ({
    ...item,
    item,
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
  const silhouettes = new Map<
    string,
    Point[][]
  >();
  const turned = new Map<
    string,
    Record<Side, boolean>
  >();
  const layers: Layer[] = drawNodes.map((n) => {
    // One solid for every camera: the flat view is this
    // same box seen face-on, never a second drawing.
    const cached = bodies.get(n.item);
    const solid =
      cached?.camera === state.camera
        ? cached.solid
        : projectNodeBody(n, state.camera);
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
      solid.visible.some((f) => f.side === side);
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

    const inputs = [
      state.camera,
      muted(n),
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
        const used = attachments.get(n.id)?.[
          side
        ];
        return [used?.direction, used?.handle];
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
        const used = attachments.get(n.id)?.[
          side
        ];
        const connecting = isSome(state.source),
          canConnect =
            n.connectable !== false &&
            (chosen.has(n.id) || connecting);
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
                    p.direction === direction,
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
        const socket = projectSocket(
          n,
          state.camera,
          side,
          offset,
        );
        const x = (socket.x - n.p.x) / n.scale,
          y = (socket.y - n.p.y) / n.scale;
        // A socket is a ball on the box's flank: it
        // looks round from every side, so wires
        // never lose their ends when the view turns.
        const control = el<Change>(
          "circle",
          [
            a("data-port", n.id),
            a("data-side", side),
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
            a("r", 3),
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
        return [control];
      });
    const value = {
      depth: solid.depth,
      html: lazy(deferred, () =>
        el<Change>(
          "g",
          [
            a("data-node", n.id),
            ...(muted(n)
              ? [a("class", "room-muted")]
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
                          -nodeSize(n).width / 2,
                        ),
                        a(
                          "y",
                          -nodeSize(n).height / 2,
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
                      a("text-anchor", "middle"),
                      a(
                        "y",
                        nodeSize(n).height / 2 +
                          13,
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
    const inputs = [
      index,
      original,
      state.camera,
      chosenWire,
      muted(from) || muted(to),
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
    const flat =
      state.camera.pitch === 0 &&
      state.camera.yaw === 0;
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
        scale: projectedScale(state.camera, p.z),
      };
    };
    const points = knots.map((k) => {
      const p = project(state.camera)(k);
      return {
        ...p,
        scale: projectedScale(state.camera, p.z),
      };
    });
    if (
      cull &&
      (points.every((p) => p.x < -64) ||
        points.every((p) => p.x > frame.x + 64) ||
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
        ? [wire.source, ...controls, wire.target]
            .map((k, i) => {
              const p = project(state.camera)(k);
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
      const color = edge.highlighted
        ? "#e36731"
        : `hsl(174 28% ${60 - fade * 38}%)`;
      const next = points[i + 1];
      const extension = next
        ? Math.min(
            0.5,
            1 /
              (Math.hypot(
                next.x - b.x,
                next.y - b.y,
              ) || 1),
          )
        : 0;
      const overlap = next
        ? "L" +
          (b.x + (next.x - b.x) * extension) +
          " " +
          (b.y + (next.y - b.y) * extension)
        : "";
      const path =
        line ||
        `M${a0.x} ${a0.y}L${b.x} ${b.y}` +
          overlap;
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
        i > 1 &&
        i < points.length - 1;
      items.push({
        chosen: chosenWire,
        depth: deckSegment
          ? depth
          : i <= 2 ||
              behindFace(
                edge.source,
                wire.sourceSide,
              )
            ? paintDepth(
                edge.source,
                wire.sourceSide,
                depth - 0.01,
              )
            : i >= points.length - 3 ||
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
        html: lazy(deferred, () => {
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
            ...(chosenWire
              ? [a("data-chosen", "true")]
              : []),
            a(
              "stroke-width",
              b.scale * (chosenWire ? 2.4 : 1),
            ),
            a("stroke-linecap", "round"),
          ];
          const events = [
            onEvent<Change>(
              "pointerdown",
              (e) => {
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
                    e.currentTarget
                      .ownerSVGElement,
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
                              (dx * dx +
                                dy * dy || 1),
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
                          ? a.z +
                            fraction * (b.z - a.z)
                          : depth,
                      p = unproject(
                        state.camera,
                        q,
                        z,
                      ),
                      prev =
                        original.waypoints ?? [],
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
                        ...selectedEdges(
                          s,
                        ).filter(
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
                  e.currentTarget instanceof
                    SVGElement
                ) {
                  const svg =
                    e.currentTarget
                      .ownerSVGElement;
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
                    e.shiftKey
                      ? s
                      : selectNodes([])(s),
                  );
                });
              },
            ),
            onEvent<Change>("dblclick", () =>
              some(disconnect(original)),
            ),
          ];
          // a wire is a hairline; what takes the click is
          // a band around it wide enough for a finger
          const hitWidth =
            edge.interactionWidth ?? 16;
          return hitWidth > 0
            ? el("g", events, [
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
              );
        }),
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
      const inset =
        wire.arrow.at.x !== wire.target.x ||
        wire.arrow.at.y !== wire.target.y;
      const at = project(state.camera)(
        bridge && inset
          ? { ...wire.arrow.at, z: deck }
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
      const near = bridge
        ? atStart
          ? (points[1] ?? tip)
          : inset
            ? project(state.camera)({
                ...wire.arrow.toward,
                z: deck,
              })
            : project(state.camera)({
                ...wire.target,
                z: 2 * wire.target.z - deck,
              })
        : atStart
          ? (!edge.route ||
              edge.route === "curve") &&
            edge.source !== edge.target
            ? project(state.camera)({
                ...move(
                  wire.source,
                  wire.sourceSide,
                  1,
                ),
                z: wire.source.z,
              })
            : (points[1] ?? tip)
          : project(state.camera)(
              wire.arrow.toward,
            );
      const angle =
        (Math.atan2(
          (tip.y - near.y) * (atStart ? 1 : -1),
          (tip.x - near.x) * (atStart ? 1 : -1),
        ) *
          180) /
        Math.PI;
      const gap = Math.hypot(
        wire.source.x - wire.target.x,
        wire.source.y - wire.target.y,
      );
      const arrowScale =
        tip.scale *
        (edge.source === edge.target
          ? 1
          : Math.min(1, gap / 60));
      items.push({
        chosen: chosenWire,
        arrow: true,
        depth: paintDepth(
          atStart ? edge.source : edge.target,
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
              a(
                "transform",
                `translate(${tip.x} ${tip.y}) rotate(${angle}) scale(${arrowScale})`,
              ),
              a("points", "0,0 -9,-4 -9,4"),
              a("fill", "#426f71"),
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
                      a("text-anchor", "middle"),
                      a("y", -8),
                      a("paint-order", "stroke"),
                      a("stroke", "#f7faf7"),
                      a("stroke-width", 3),
                      a(
                        "stroke-linejoin",
                        "round",
                      ),
                      a("pointer-events", "none"),
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
        muted(from) || muted(to)
          ? {
              ...layer,
              html: el(
                "g",
                [a("class", "room-muted-wire")],
                [layer.html],
              ),
            }
          : layer,
      ),
    );
    wireLayers.set(wire, {
      inputs,
      value: group,
    });
    for (const layer of group) layers.push(layer);
  }
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
              ? portPosition(
                  node,
                  side,
                  Number(
                    dot?.getAttribute(
                      "data-offset",
                    ),
                  ),
                )
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
          source: none(),
          drag: some<Drag>({
            pointer: e.pointerId,
            last: point.content,
            first: point.content,
            pressed: point.content,
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
            const released = releasePointer(s);
            if (
              name === "pointerup" &&
              isSome(s.drag)
            ) {
              const d = s.drag.content;
              if (s.rooms && d.mode === "orbit") {
                const { yaw, pitch } = s.camera;
                for (const [y, p] of [
                  [0, 0],
                  [0, -Math.PI / 2],
                  [0, Math.PI / 2],
                  [-Math.PI / 2, 0],
                  [Math.PI, 0],
                  [Math.PI / 2, 0],
                ] satisfies [number, number][]) {
                  const delta = (a: number) =>
                    Math.atan2(
                      Math.sin(a),
                      Math.cos(a),
                    );
                  if (
                    Math.hypot(
                      delta(yaw - y),
                      delta(pitch - p),
                    ) <=
                    Math.PI / 15
                  )
                    return turnRooms(
                      released,
                      viewAt(y, p)(released),
                      350,
                    );
                }
              }
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
      ...(state.rooms
        ? [
            roomView(
              state.rooms,
              state.camera,
              state,
            ),
            depthStems(
              state.camera,
              drawNodes,
              state.rooms,
            ),
          ]
        : [
            surfaceLayer(
              state.camera,
              [state.frame],
              () => groundSurface(state),
            ),
            ...drawNodes.map((n) =>
              footprintLayer(
                n.item,
                [state.camera],
                () =>
                  footprint(state.camera, n.item),
              ),
            ),
            gridLayer(
              state.camera,
              [state.frame],
              () => worldGrid(state),
            ),
            depthStems(state.camera, drawNodes),
          ]),
      ...projected
        .filter((n) => n.group && !n.collapsed)
        .map((group) => {
          const members = subtree(scene.nodes, [
              group.id,
            ]),
            children = projected.filter((n) =>
              members.has(n.id),
            );
          return frameLayer(
            group.item,
            [
              state.camera,
              ...children.map((n) => n.item),
            ],
            () => {
              const box = children.reduce(
                (b, n) => ({
                  left: Math.min(
                    b.left,
                    n.p.x -
                      (nodeSize(n).width *
                        n.scale) /
                        2,
                  ),
                  right: Math.max(
                    b.right,
                    n.p.x +
                      (nodeSize(n).width *
                        n.scale) /
                        2,
                  ),
                  top: Math.min(
                    b.top,
                    n.p.y -
                      (nodeSize(n).height / 2) *
                        n.scale,
                  ),
                  bottom: Math.max(
                    b.bottom,
                    n.p.y +
                      (nodeSize(n).height / 2) *
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
              const origin = project(
                state.camera,
              )({
                x: 0,
                y: 0,
                z: group.position.z,
              });
              const step = grid * group.scale;
              const left =
                origin.x +
                Math.floor(
                  (box.left -
                    origin.x -
                    12 * group.scale) /
                    step,
                ) *
                  step;
              const top =
                origin.y +
                Math.floor(
                  (box.top -
                    origin.y -
                    12 * group.scale) /
                    step,
                ) *
                  step;
              const right =
                origin.x +
                Math.ceil(
                  (box.right -
                    origin.x +
                    12 * group.scale) /
                    step,
                ) *
                  step +
                (group.grow?.x ?? 0) *
                  group.scale;
              const bottom =
                origin.y +
                Math.ceil(
                  (box.bottom -
                    origin.y +
                    12 * group.scale) /
                    step,
                ) *
                  step +
                (group.grow?.y ?? 0) *
                  group.scale;
              // The corner handle drags the frame's size.
              const handle = el<Change>(
                "rect",
                [
                  a(
                    "data-group-handle",
                    group.id,
                  ),
                  a("x", right - 6),
                  a("y", bottom - 6),
                  a("width", 12),
                  a("height", 12),
                  a("fill", "#fff"),
                  a("stroke", "#8bb8aa"),
                  a(
                    "style",
                    "cursor:nwse-resize",
                  ),
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
                          mode: "frame",
                          node: group.id,
                        }),
                      }));
                    },
                  ),
                ],
                [],
              );
              const frame = el(
                "rect",
                [
                  a("data-group", group.id),
                  a("pointer-events", "none"),
                  a("x", left),
                  a("y", top),
                  a("width", right - left),
                  a("height", bottom - top),
                  a("rx", 12),
                  a("fill", "#167b7009"),
                  a("stroke", "#8bb8aa"),
                  a("stroke-dasharray", "6 4"),
                ],
                [],
              );
              return el("g", [], [frame, handle]);
            },
          );
        }),
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
      ...groupVolumes(
        scene.nodes,
        state.camera,
        chosen,
      ),
      el(
        "g",
        [key("depth-layers")],
        layers
          .sort(
            (a, b) =>
              a.depth - b.depth ||
              Number(!!a.chosen) -
                Number(!!b.chosen) ||
              Number(!!a.arrow) -
                Number(!!b.arrow),
          )
          .map((layer) => layer.html),
      ),
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
    ],
  );
};
