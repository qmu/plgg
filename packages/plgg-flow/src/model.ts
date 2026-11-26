import {
  chartExtent,
  type Chart,
} from "plgg-flow/chart";
import { splitEdge } from "plgg-flow/graph";
import { routeSpace } from "plgg-flow/space";
import { movePath } from "plgg-flow/path3";
import { bodyDepth } from "plgg-flow/nodeBody";
import type {
  RoomLayout,
  LayerOptions,
} from "plgg-flow/autoLayout";
import {
  freePosition,
  grid,
  alignBox,
  nodeSize,
} from "plgg-flow/nodeSize";
import {
  constrainedDelta,
  type Movement,
} from "plgg-flow/constraints";
import {
  markId,
  type Mark,
} from "plgg-flow/annotations";
import {
  some,
  none,
  isSome,
  type Option,
} from "plgg";
import {
  frontCamera,
  pickPlane,
  unproject,
  fit,
  worldDelta,
  orbitAround,
  pan,
  project,
  zoomAt,
  type Camera,
  type Point,
  type Point3,
} from "plgg-board";
import {
  subtree,
  dissolve,
  encloseTrays,
  moveExpandingParents,
} from "plgg-flow/hierarchy";
import {
  reconnect,
  connectionIssue,
  edgeIndex,
  type Port,
} from "plgg-flow/connections";
import type { SpatialView } from "plgg-flow/spatial";
import type { Pinch } from "plgg-flow/gesture";
import type { JsonObject } from "./metadata";
export type FlowNode = Readonly<{
  /** Allowed center positions in sheet coordinates, inclusive. */
  within?: { min: Point3; max: Point3 };
  quiet?: boolean;
  id: string;
  label: string;
  width?: number;
  height?: number;
  /** The box is exactly as sized, however long the
   * label: a mark or a bar, named beside it. */
  bare?: boolean;
  /** How far each face stands off the centre plane,
   * when the height is not to decide it. */
  depth?: number;
  type?: string;
  data?: JsonObject;
  origin?: readonly [number, number];
  parent?: string;
  extent?: "parent";
  expandParent?: boolean;
  connectable?: boolean;
  boundary?: "inbound" | "outbound" | "closed";
  ports?: readonly Port[];
  group?: boolean;
  /** How far a group's frame reaches past its members,
   * in world units — the size a reader dragged it to. */
  grow?: Readonly<{ x: number; y: number }>;
  collapsed?: boolean;
  locked?: boolean;
  hidden?: boolean;
  value?: number;
  position: Point3;
}>;
export type Edge = Readonly<{
  quiet?: boolean;
  arrows?:
    | "forward"
    | "backward"
    | "both"
    | "none";
  interactionWidth?: number;
  id?: string;
  type?: string;
  data?: JsonObject;
  sourceHandle?: string;
  targetHandle?: string;
  /** Complete world-space centreline, including both sockets. */
  path?: readonly Point3[];
  via?: readonly Point[];
  lift?: number;
  waypoints?: readonly Point3[];
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  route?: "straight" | "step" | "curve";
  highlighted?: boolean;
  hidden?: boolean;
}>;
/** Sheet-coordinate decorations. Behind and front bracket the graph;
 * sorted primitives share its painter order at their mean depth.
 * Tones are CSS colors. Label offsets and type sizes are screen pixels. */
const quietEdges = new WeakMap<Edge, Edge>();
export const quietEdge = (edge: Edge) => {
  const old = quietEdges.get(edge);
  if (old) return old;
  const quiet = { ...edge, quiet: true };
  quietEdges.set(edge, quiet);
  return quiet;
};
export type Scenery = {
  layer: "behind" | "sorted" | "front";
  tone: string;
  width?: number;
  /** Horizontal partition and paint order relative to its surface. */
  surface?: number;
  order?: number;
} & (
  | {
      kind: "plane";
      points: readonly Point3[];
      thickness?: number;
      casts?: boolean;
      patches?: readonly (readonly Point3[])[];
      fill: string;
      opacity: number;
    }
  | {
      kind: "line";
      points: readonly Point3[];
      /** Additional disconnected strokes with the same style. */ strokes?: readonly (readonly Point3[])[];
      dotted?: boolean;
    }
  | {
      kind: "label";
      anchor: Point3;
      onSurface?: boolean;
      offset: Point;
      text: string;
      size: number;
      weight: number;
      press?: Change;
      enter?: Change;
      leave?: Change;
    }
);
export type CameraBookmark = Readonly<{
  name: string;
  camera: Camera;
}>;
export type SelectionSet = Readonly<{
  name: string;
  members: readonly string[];
}>;
export type Graph = Readonly<{
  nodes: readonly FlowNode[];
  edges: readonly Edge[];
}>;
export type Drag = Readonly<{
  pointer: number;
  last: Point;
  mode:
    | "node"
    | "pan"
    | "orbit"
    | "connect"
    | "box"
    | "waypoint"
    | "ink"
    | "lasso"
    | "frame";
  socket?: Point3;
  endpoint?: {
    edge: Edge;
    end: Port["direction"];
  };
  outline?: readonly Point[];
  waypoint?: number;
  frameOffset?: Point;
  originalFrames?: ReadonlyMap<string, FlowNode>;
  first?: Point;
  pressed?: Point;
  node: string;
}>;
export type Flow = Graph &
  Readonly<{
    focus?: ReadonlySet<string> | undefined;
    mark?: readonly string[] | undefined;
    markCleared?: boolean;
    suggestions?: ReturnType<
      typeof import("./bestViews").bestViews
    >;
    suggestionIndex?: number;
    declaredAxes?: RoomLayout["axes"];
    explicitView?: boolean;
    fixedRoles?: boolean;
    writtenCamera?: {
      yaw: number;
      pitch: number;
    };
    hidden?: "lines" | "none";
    scenery?: readonly Scenery[];
    showWorldGrid?: boolean;
    frame?: Point;
    /** Logical width at the right of the frame that a
     * panel laid over the board hides; fitting keeps
     * the diagram clear of it. */
    cover?: number;
    sheetInsets?: Readonly<{
      phoneWidth?: number;
      left: number;
      top: number;
      bottom: number;
    }>;
    rooms?: RoomLayout;
    /** A layout in which where a node stands says
     * something about it. */
    chart?: Chart;
    roomPins?: Readonly<Record<string, string>>;
    hoveredEdge?: Edge | undefined;
    hoveredNode?: string | undefined;
    roomHover?:
      | readonly [string, string]
      | undefined;
    roomMotion?:
      | undefined
      | {
          from: Flow;
          to: Flow;
          duration: number;
          opening?: boolean;
          progress: number;
        };
    layered?: Readonly<{
      options: LayerOptions;
      computed: ReadonlyMap<string, Point3>;
    }>;
    camera: Camera;
    manualZoom?: boolean;
    orbitEase?: { from: Camera; to: Camera };
    orbitCenter?: Point3;
    selected: Option<string>;
    selectedDslRow?:
      | Readonly<{ index: number; text: string }>
      | undefined;
    activeEdge?: Edge;
    chosenEdges?: readonly Edge[];
    movement?: Movement;
    lasso?: boolean;
    bookmarks?: readonly CameraBookmark[];
    sets?: readonly SelectionSet[];
    marks?: readonly Mark[];
    ink?: "pen" | "erase" | "off";
    /** When a plain wheel last passed over the board: the
     * page keeps it, and the board shows how to zoom. */
    scrollHint?: number;
    activeMark?: string;
    showResolved?: boolean;
    selection?: readonly string[];
    spatial?: SpatialView;
    isolatedBranch?: string;
    source: Option<string>;
    pendingHandle?: string;
    wiringMessage?: string;
    drag: Option<Drag>;
    pinch?: Pinch;
    pinchStart?: Readonly<{
      contacts: Pinch;
      camera: Camera;
      orbitCenter?: Point3;
    }>;

    snap?: number;
    allowConnection?: (
      edge: Edge,
      graph: Graph,
    ) => boolean;
  }>;
export type Change = (state: Flow) => Flow;
export const viewport = { x: 900, y: 580 };
export const frameOf = (flow: Flow): Point =>
  flow.frame ?? viewport;
const frameCenter = (flow: Flow): Point => ({
  x: frameOf(flow).x / 2,
  y: frameOf(flow).y / 2,
});
export const createFlow = (
  graph: Graph,
): Flow => ({
  ...graph,
  nodes: encloseTrays(graph.nodes),
  snap: grid,
  camera: frontCamera({ x: 450, y: 290 }),
  selected: none(),
  source: none(),
  drag: none(),
});
/** Translate complete branches and carry the bends of internal wires. */
export const moveSelectionGeometry = (
  flow: Flow,
  roots: readonly string[],
  delta: Point3,
) => {
  if (flow.nodes.some((n) => n.within)) {
    const moved = subtree(flow.nodes, roots);
    for (const k of [
      "x",
      "y",
      "z",
    ] satisfies (keyof Point3)[]) {
      let min = -Infinity,
        max = Infinity;
      for (const n of flow.nodes)
        if (n.within && moved.has(n.id)) {
          min = Math.max(
            min,
            n.within.min[k] - n.position[k],
          );
          max = Math.min(
            max,
            n.within.max[k] - n.position[k],
          );
        }
      delta = {
        ...delta,
        [k]: Math.max(
          min,
          Math.min(max, delta[k]),
        ),
      };
    }
  }
  const nodes = encloseTrays(
    moveExpandingParents(
      flow.nodes,
      roots,
      delta,
    ),
  );
  if (
    !(delta.x || delta.y || delta.z) ||
    (!flow.rooms &&
      !flow.layered?.options.layerAxis &&
      !flow.edges.some(
        (e) =>
          e.path?.length ||
          e.waypoints?.length ||
          e.via?.length,
      ))
  )
    return { nodes, edges: flow.edges };
  const moved = subtree(flow.nodes, roots);
  const relocated = new Set(
    nodes.flatMap((n, i) => {
      const p = flow.nodes[i]!.position;
      return p.x !== n.position.x ||
        p.y !== n.position.y ||
        p.z !== n.position.z
        ? [n.id]
        : [];
    }),
  );
  const graph = { nodes, edges: flow.edges };
  const roomPaths =
    flow.rooms &&
    routeSpace(
      graph,
      flow.rooms.rooms,
      nodeSize,
      relocated,
    );
  let activeEdge = flow.activeEdge,
    changed = false;
  const edges = flow.edges.map(
    (original, i): Edge => {
      const { via, path, ...rest } = original;
      const touched =
        relocated.has(original.source) ||
        relocated.has(original.target);
      let e = original;
      if (touched) {
        const next = roomPaths
          ? roomPaths.get(original.id ?? i)
          : path &&
            movePath(
              path,
              relocated.has(original.source),
              relocated.has(original.target),
              delta,
            );
        if (next) e = { ...rest, path: next };
        else if (path || via) e = rest;
      }
      if (e !== original) {
        changed = true;
        if (activeEdge === original)
          activeEdge = e;
      }
      if (
        !e.waypoints?.length ||
        !moved.has(e.source) ||
        !moved.has(e.target)
      )
        return e;
      const next = {
        ...e,
        waypoints: e.waypoints.map((p) => ({
          x: p.x + delta.x,
          y: p.y + delta.y,
          z: p.z + delta.z,
        })),
      };
      if (activeEdge === e) activeEdge = next;
      changed = true;
      return next;
    },
  );
  return {
    nodes,
    edges: changed ? edges : flow.edges,
    ...(flow.chosenEdges
      ? {
          chosenEdges: flow.chosenEdges.flatMap(
            (e) =>
              edges[edgeIndex(flow.edges, e)] ??
              [],
          ),
        }
      : {}),
    ...(activeEdge ? { activeEdge } : {}),
  };
};
export const moveConstrainedSelection = (
  flow: Flow,
  roots: readonly string[],
  delta: Point3,
) =>
  moveSelectionGeometry(
    flow,
    roots,
    constrainedDelta(
      flow,
      subtree(flow.nodes, roots),
      roots[0] ?? "",
      delta,
      flow.movement ?? {},
    ),
  );
const fitGeometry = (
  state: Flow,
  nodes: readonly FlowNode[],
  extra: readonly Point3[],
): Flow => {
  const fitted = fit(
    [
      ...extra,
      ...nodes.flatMap((node) =>
        [-1, 1].map((sign) => {
          const offset = worldDelta(
            { ...state.camera, scale: 1 },
            {
              x:
                (nodeSize(node).width / 2 + 5) *
                sign,
              y:
                (nodeSize(node).height / 2) *
                sign,
            },
          );
          return {
            x: node.position.x + offset.x,
            y: node.position.y + offset.y,
            z: node.position.z + offset.z,
          };
        }),
      ),
    ],
    frameOf(state),
    80,
  )(state.camera);
  return isSome(fitted)
    ? { ...state, camera: fitted.content }
    : state;
};
export const fitFlow: Change = (state) =>
  fitGeometry(
    state,
    state.nodes.filter(
      (n) =>
        !state.focus || state.focus.has(n.id),
    ),
    state.chart
      ? chartExtent(state.chart, state)
      : [],
  );
export const fitWire: Change = (state) => {
  const index = state.activeEdge
    ? edgeIndex(state.edges, state.activeEdge)
    : -1;
  const edge = state.edges[index];
  if (!edge) return state;
  const nodes = state.nodes.filter(
    (n) =>
      n.id === edge.source ||
      n.id === edge.target,
  );
  return fitGeometry(
    state,
    nodes,
    edge.path ?? edge.waypoints ?? [],
  );
};
export const selectedNodes = (
  state: Flow,
): readonly string[] => {
  if (!isSome(state.selected)) return [];
  return state.selection?.includes(
    state.selected.content,
  )
    ? state.selection
    : [state.selected.content];
};
export const selectNodes =
  (
    ids: readonly string[],
    keepEdges = false,
  ): Change =>
  (state) => {
    const valid = new Set(
        state.nodes.map((n) => n.id),
      ),
      selection = [...new Set(ids)].filter((id) =>
        valid.has(id),
      );
    const last = selection[selection.length - 1];
    const { activeEdge, chosenEdges, ...rest } =
      state;
    return {
      ...(keepEdges ? state : rest),
      selectedDslRow: undefined,
      selection,
      selected:
        last === undefined ? none() : some(last),
    };
  };
export const selectedEdges = (state: Flow) =>
  state.chosenEdges ??
  (state.activeEdge ? [state.activeEdge] : []);
export const chooseEdges =
  (edges: readonly Edge[]): Change =>
  (state) => {
    const { activeEdge, ...rest } = state;
    const last = edges[edges.length - 1];
    return {
      ...rest,
      selectedDslRow: undefined,
      chosenEdges: edges,
      ...(last ? { activeEdge: last } : {}),
    };
  };
export const selectArea =
  (
    ids: readonly string[],
    wires?: readonly Edge[],
  ): Change =>
  (state) => {
    const nodes = new Set(ids);
    return chooseEdges(
      wires ??
        state.edges.filter(
          (e) =>
            nodes.has(e.source) &&
            nodes.has(e.target),
        ),
    )(selectNodes(ids)(state));
  };
export const addNode =
  (node: FlowNode): Change =>
  (state) =>
    state.nodes.some((n) => n.id === node.id)
      ? state
      : {
          ...state,
          nodes: [
            ...state.nodes,
            {
              ...node,
              position: freePosition(
                node,
                state.nodes,
              ),
            },
          ],
          selected: some(node.id),
        };
export const disconnect =
  (edge: Edge): Change =>
  (state) => {
    const index = edgeIndex(state.edges, edge);
    if (index < 0) return state;
    const kept = selectedEdges(state).filter(
      (e) => edgeIndex(state.edges, e) !== index,
    );
    return {
      ...chooseEdges(kept)(state),
      edges: state.edges.filter(
        (_, i) => i !== index,
      ),
    };
  };
export const deleteSelected: Change = (state) => {
  const edges = new Set(
    selectedEdges(state).map((e) =>
      edgeIndex(state.edges, e),
    ),
  );
  if (!edges.size && !isSome(state.selected))
    return state;
  const rest = chooseEdges([])(state);
  const graph = selectedNodes(
    state,
  ).reduce<Graph>((g, id) => dissolve(g, id), {
    nodes: state.nodes,
    edges: state.edges.filter(
      (_, i) => !edges.has(i),
    ),
  });
  return {
    ...rest,
    ...graph,
    selection: [],
    selected: none(),
    source: none(),
    drag: none(),
  };
};
export const renameLabel =
  (id: string, label: string): Change =>
  (s) => ({
    ...s,
    nodes: s.nodes.map((n) =>
      n.id === id && !n.locked
        ? { ...n, label }
        : n,
    ),
  });
export const replaceEndpoint =
  (
    edge: Edge,
    end: Port["direction"],
    node: string,
    handle?: string,
  ): Change =>
  (s) => {
    const {
      path,
      sourceHandle,
      targetHandle,
      ...rest
    } = edge;
    const source =
        end === "source" ? handle : sourceHandle,
      target =
        end === "target" ? handle : targetHandle;
    const graph = reconnect(
      s,
      edge,
      {
        ...rest,
        [end]: node,
        ...(source !== undefined && {
          sourceHandle: source,
        }),
        ...(target !== undefined && {
          targetHandle: target,
        }),
      },
      s.allowConnection,
    );
    const updated =
      graph.edges[edgeIndex(s.edges, edge)];
    const idle = {
      ...s,
      ...graph,
      source: none(),
      drag: none(),
    };
    return updated
      ? chooseEdges([updated])(idle)
      : idle;
  };
export const connect =
  (
    id: string,
    handle?: string,
    direction?: Port["direction"],
  ): Change =>
  (state) => {
    const node = state.nodes.find(
      (n) => n.id === id,
    );
    if (!node) return state;
    const { pendingHandle, ...rest } = state;
    if (!isSome(state.source)) {
      if (node.connectable === false)
        return {
          ...rest,
          wiringMessage:
            "このノードへの新規接続は禁止されています",
        };
      if (
        handle !== undefined &&
        direction === "target"
      )
        return state;
      return {
        ...rest,
        source: some(id),
        wiringMessage: "",
        ...(handle === undefined
          ? {}
          : { pendingHandle: handle }),
      };
    }
    const source = state.source.content,
      edge: Edge = {
        source,
        target: id,
        ...(pendingHandle === undefined
          ? {}
          : { sourceHandle: pendingHandle }),
        ...(handle === undefined
          ? {}
          : { targetHandle: handle }),
      };
    const rejected =
      handle !== undefined &&
      direction === "source"
        ? "入力ポートを選択してください"
        : connectionIssue(
            state,
            edge,
            state.allowConnection,
          );
    return {
      ...rest,
      source: none(),
      wiringMessage: rejected,
      edges: rejected
        ? state.edges
        : [...state.edges, edge],
    };
  };
/** Looking straight down the diagram plane is the zero-angle endpoint. */
export const viewAt =
  (yaw: number, pitch: number): Change =>
  (state) => {
    const tilt = Math.min(
      1,
      2 *
        Math.hypot(
          Math.sin(yaw / 2),
          Math.sin(pitch / 2),
        ),
    );
    const camera = {
      ...state.camera,
      yaw,
      pitch,
      perspective:
        state.camera.perspective === false
          ? false
          : tilt * tilt * (3 - 2 * tilt),
    };
    const pivot = state.spatial?.pivot
      ? state.nodes.find(
          (n) => n.id === state.spatial?.pivot,
        )
      : undefined;
    const screen = frameCenter(state);
    const previous =
      state.orbitCenter &&
      project(state.camera)(state.orbitCenter);
    // Pan and off-center zoom move the subject under the screen center.
    // Keep its depth when choosing the next pivot.
    const center =
      pivot?.position ??
      (previous &&
      Math.hypot(
        previous.x - screen.x,
        previous.y - screen.y,
      ) < 1e-8
        ? state.orbitCenter!
        : unproject(
            state.camera,
            screen,
            previous?.z ?? 0,
          ));
    return {
      ...state,
      orbitCenter: center,
      camera: orbitAround(
        center,
        state.camera,
        camera,
      ),
    };
  };
type Drawing = Pick<Flow, "nodes" | "scenery">;
const drawingPoints = ({
  nodes,
  scenery,
}: Drawing) => [
  ...nodes
    .filter((n) => !n.hidden)
    .flatMap((n) => {
      const size = nodeSize(n);
      return [-1, 1].flatMap((x) =>
        [-1, 1].flatMap((y) =>
          [-1, 1].map((z) => ({
            x:
              n.position.x + (x * size.width) / 2,
            y:
              n.position.y +
              (y * size.height) / 2,
            z: n.position.z + z * bodyDepth(n),
          })),
        ),
      );
    }),
  ...(scenery ?? []).flatMap((s) =>
    s.kind === "label"
      ? [s.anchor]
      : s.kind === "line"
        ? [
            ...s.points,
            ...(s.strokes ?? []).flat(),
          ]
        : s.points,
  ),
];
const centerOrbit = (
  state: Flow,
  camera: Camera,
  center: Point3,
) => {
  const p = project(camera)(center),
    frame = frameOf(state);
  return pan(
    (frame.x - (state.cover ?? 0)) / 2 - p.x,
    frame.y / 2 - p.y,
  )(camera);
};
export const settleOrbit = (
  state: Flow,
  drawing: Drawing = state,
): Flow => {
  const center = state.orbitCenter;
  if (!center) return state;
  const frame = frameOf(state),
    open = frame.x - (state.cover ?? 0);
  let camera = centerOrbit(
    state,
    state.camera,
    center,
  );
  const p = project(camera)(center);
  let factor = 1;
  for (const q of drawingPoints(drawing).map(
    project(camera),
  )) {
    factor = Math.min(
      factor,
      Math.max(1, open / 2 - 24) /
        (Math.abs(q.x - p.x) || 1),
      Math.max(1, frame.y / 2 - 24) /
        (Math.abs(q.y - p.y) || 1),
    );
  }
  if (
    (factor >= 1 || state.manualZoom) &&
    Math.abs(
      camera.origin.x - state.camera.origin.x,
    ) < 1e-8 &&
    Math.abs(
      camera.origin.y - state.camera.origin.y,
    ) < 1e-8
  )
    return state;
  if (factor < 1 && !state.manualZoom)
    camera = centerOrbit(
      state,
      { ...camera, scale: camera.scale * factor },
      center,
    );
  return {
    ...state,
    camera,
    orbitEase: { from: state.camera, to: camera },
  };
};
export const orbitByDrag =
  (
    dx: number,
    dy: number,
    drawing?: Drawing,
  ): Change =>
  (state) => {
    const radiansPerUnit =
      Math.PI / frameOf(state).x;
    const rotated = viewAt(
      state.camera.yaw - dx * radiansPerUnit,
      Math.max(
        -Math.PI / 2,
        Math.min(
          Math.PI / 2,
          state.camera.pitch -
            dy * radiansPerUnit,
        ),
      ),
    )(state);
    const points = drawingPoints(
      drawing ?? state,
    );
    if (!points.length) return rotated;
    const middle = (axis: keyof Point3) => {
      let min = Infinity,
        max = -Infinity;
      for (const p of points) {
        min = Math.min(min, p[axis]);
        max = Math.max(max, p[axis]);
      }
      return (min + max) / 2;
    };
    const center = {
      x: middle("x"),
      y: middle("y"),
      z: middle("z"),
    };
    return {
      ...rotated,
      orbitCenter: center,
      camera: centerOrbit(
        state,
        rotated.camera,
        center,
      ),
    };
  };
export const front: Change = viewAt(0, 0);
export const rotateView: Change = (state) =>
  viewAt(
    state.camera.yaw - 0.48,
    state.camera.pitch + 0.64,
  )(state);
export const wheelZoom =
  (anchor: Point, deltaY: number): Change =>
  (state) => ({
    ...state,
    manualZoom: true,
    camera: zoomAt(
      anchor,
      Math.exp(-deltaY * 0.002),
    )(state.camera),
  });
export const zoom =
  (factor: number): Change =>
  (state) => ({
    ...state,
    manualZoom: true,
    camera: zoomAt(
      frameCenter(state),
      factor,
    )(state.camera),
  });
export const beginStroke =
  (point: Point, pointer: number): Change =>
  (state) => {
    const id = markId(
      state.marks ?? [],
      "stroke-",
    );
    return {
      ...state,
      marks: [
        ...(state.marks ?? []),
        {
          kind: "stroke",
          id,
          points: [
            unproject(state.camera, point, 0),
          ],
        },
      ],
      drag: some<Drag>({
        node: id,
        mode: "ink",
        pointer,
        last: point,
      }),
    };
  };
const boxDelta = (
  node: FlowNode,
  travel: Point,
  step: number,
) => {
  const { width, height } = nodeSize(node),
    p = node.position;
  return {
    x:
      alignBox(p.x + travel.x, width, step) - p.x,
    y:
      alignBox(p.y + travel.y, height, step) -
      p.y,
    z: 0,
  };
};
// An authored selection may start off-grid. After the anchor moves,
// bring each moved box onto the same grid, then subsequent steps are rigid.
const moveOnGrid = (
  flow: Flow,
  roots: readonly string[],
  delta: Point3,
  step: number,
) => {
  const geometry = moveConstrainedSelection(
    flow,
    roots,
    delta,
  );
  if (
    flow.movement ||
    flow.nodes.some((n) => n.extent === "parent")
  )
    return geometry;
  const moved = subtree(flow.nodes, roots);
  return {
    ...geometry,
    nodes: geometry.nodes.map((n) => {
      if (!moved.has(n.id) || n.within) return n;
      const offset = boxDelta(
        n,
        { x: 0, y: 0 },
        step,
      );
      if (!offset.x && !offset.y) return n;
      return {
        ...n,
        position: {
          ...n.position,
          x: n.position.x + offset.x,
          y: n.position.y + offset.y,
        },
      };
    }),
  };
};
export const releasePointer = (
  flow: Flow,
  drawing?: Drawing,
): Flow => {
  const idle = { ...flow, drag: none() };
  if (
    isSome(flow.drag) &&
    flow.drag.content.mode === "orbit"
  )
    return settleOrbit(idle, drawing);
  if (
    !isSome(flow.drag) ||
    flow.drag.content.mode !== "node"
  )
    return idle;
  const { node } = flow.drag.content,
    anchor = flow.nodes.find(
      (n) => n.id === node,
    );
  if (!anchor || anchor.locked) return idle;
  const roots = selectedNodes(flow).filter(
    (id) =>
      !flow.nodes.find((n) => n.id === id)
        ?.locked,
  );
  const geometry = flow.snap
    ? moveOnGrid(
        flow,
        roots,
        boxDelta(
          anchor,
          { x: 0, y: 0 },
          flow.snap,
        ),
        flow.snap,
      )
    : {};
  return { ...idle, ...geometry };
};
export const movePointer =
  (
    point: Point,
    pointer: number,
    drawing?: Drawing,
  ): Change =>
  (state) => {
    if (
      !isSome(state.drag) ||
      state.drag.content.pointer !== pointer
    )
      return state;
    const d = state.drag.content,
      dx = point.x - d.last.x,
      dy = point.y - d.last.y;
    if (d.mode === "lasso")
      return Math.hypot(dx, dy) < 3
        ? state
        : {
            ...state,
            drag: some({
              ...d,
              last: point,
              outline: [
                ...(d.outline ?? []),
                point,
              ],
            }),
          };
    if (d.mode === "ink") {
      if (Math.hypot(dx, dy) < 2) return state;
      return {
        ...state,
        drag: some({ ...d, last: point }),
        marks: (state.marks ?? []).map((m) =>
          m.kind === "stroke" &&
          m.id === d.node &&
          m.points.length < 16000
            ? {
                ...m,
                points: [
                  ...m.points,
                  unproject(
                    state.camera,
                    point,
                    0,
                  ),
                ],
              }
            : m,
        ),
      };
    }
    if (
      d.mode === "waypoint" &&
      d.waypoint !== undefined &&
      state.activeEdge
    ) {
      const index = edgeIndex(
          state.edges,
          state.activeEdge,
        ),
        edge = state.edges[index],
        p = edge?.waypoints?.[d.waypoint];
      if (!edge || !p) return state;
      const delta = worldDelta(
        state.camera,
        { x: dx, y: dy },
        project(state.camera)(p).z,
      );
      const next = {
        ...edge,
        waypoints:
          edge.waypoints?.map((v, i) =>
            i === d.waypoint
              ? {
                  x: v.x + delta.x,
                  y: v.y + delta.y,
                  z: v.z + delta.z,
                }
              : v,
          ) ?? [],
      };
      return {
        ...state,
        chosenEdges: selectedEdges(state).map(
          (e) => (e === edge ? next : e),
        ),
        activeEdge: next,
        edges: state.edges.map((v, i) =>
          i === index ? next : v,
        ),
        drag: some({ ...d, last: point }),
      };
    }
    if (d.mode === "frame") {
      const group = state.nodes.find(
        (n) => n.id === d.node,
      );
      if (!group) return state;
      const hit = pickPlane(
        state.camera,
        point,
        "z",
        group.position.z,
      );
      if (!isSome(hit)) return state;
      const size = nodeSize(group);
      const resized = resizeNode(
        group,
        hit.content.x -
          group.position.x +
          size.width / 2 +
          (d.frameOffset?.x ?? 0),
        hit.content.y -
          group.position.y +
          size.height / 2 +
          (d.frameOffset?.y ?? 0),
      );
      return {
        ...state,
        nodes: encloseTrays(
          state.nodes.map((n) =>
            n === group ? resized : n,
          ),
        ),
        drag: some({ ...d, last: point }),
      };
    }
    const moving = state.nodes.find(
      (n) => n.id === d.node,
    );
    const bound = moving?.within;
    const flat =
      bound &&
      (
        ["x", "y", "z"] satisfies (keyof Point3)[]
      ).find(
        (k) => bound.min[k] === bound.max[k],
      );
    if (
      d.mode === "node" &&
      bound &&
      flat &&
      moving
    ) {
      const previous = d.first ?? d.last;
      const hit = (p: Point) =>
        pickPlane(
          state.camera,
          p,
          flat,
          bound.min[flat],
        );
      const a = hit(previous),
        b = hit(point);
      if (isSome(a) && isSome(b)) {
        const travel = (k: keyof Point3) => {
          const v = b.content[k] - a.content[k];
          return state.snap
            ? Math.round(v / state.snap) *
                state.snap
            : v;
        };
        const delta = {
          x: travel("x"),
          y: travel("y"),
          z: travel("z"),
        };
        if (!delta.x && !delta.y && !delta.z)
          return {
            ...state,
            drag: some({
              ...d,
              last: point,
              first: previous,
            }),
          };
        const first = project(state.camera)({
          x: a.content.x + delta.x,
          y: a.content.y + delta.y,
          z: a.content.z + delta.z,
        });
        return {
          ...state,
          ...moveConstrainedSelection(
            state,
            selectedNodes(state).filter(
              (id) =>
                !state.nodes.find(
                  (n) => n.id === id,
                )?.locked,
            ),
            delta,
          ),
          drag: some({
            ...d,
            last: point,
            first,
          }),
        };
      }
    }
    const depth = moving
      ? project(state.camera)(moving.position).z
      : 0;
    const delta = worldDelta(
      state.camera,
      {
        x: dx,
        y: dy,
      },
      depth,
    );
    // Snap while moving: the node stays put until the
    // pointer has travelled past the next grid line, then
    // jumps a whole cell. The unapplied travel is kept in
    // `first`, so a slow drag still arrives.
    if (
      d.mode === "node" &&
      state.snap &&
      moving
    ) {
      const snap = state.snap,
        previous = d.first ?? d.last,
        roots = selectedNodes(state).filter(
          (id) =>
            !state.nodes.find((n) => n.id === id)
              ?.locked,
        ),
        travel = worldDelta(
          state.camera,
          {
            x: point.x - previous.x,
            y: point.y - previous.y,
          },
          depth,
        ),
        adjusted = boxDelta(moving, travel, snap);
      if (!adjusted.x && !adjusted.y)
        return {
          ...state,
          drag: some({
            ...d,
            last: point,
            first: previous,
          }),
        };
      const from = project(state.camera)(
          moving.position,
        ),
        to = project(state.camera)({
          x: moving.position.x + adjusted.x,
          y: moving.position.y + adjusted.y,
          z: moving.position.z,
        });
      return {
        ...state,
        ...moveOnGrid(
          state,
          roots,
          adjusted,
          snap,
        ),
        drag: some({
          ...d,
          last: point,
          first: {
            x: previous.x + to.x - from.x,
            y: previous.y + to.y - from.y,
          },
        }),
      };
    }
    if (
      d.mode === "node" &&
      (state.movement ||
        state.nodes.some(
          (n) => n.extent === "parent",
        ))
    ) {
      const roots = selectedNodes(state).filter(
          (id) =>
            !state.nodes.find((n) => n.id === id)
              ?.locked,
        ),
        members = subtree(state.nodes, roots);
      const previous = d.first ?? d.last,
        desired = worldDelta(
          state.camera,
          {
            x: point.x - previous.x,
            y: point.y - previous.y,
          },
          depth,
        );
      const adjusted = constrainedDelta(
        state,
        members,
        d.node,
        desired,
        state.movement ?? {},
      );
      // Retain unapplied pointer movement so a magnet releases once pulled clear.
      const p = moving
        ? project(state.camera)(moving.position)
        : point;
      const shifted = moving
        ? project(state.camera)({
            x: moving.position.x + adjusted.x,
            y: moving.position.y + adjusted.y,
            z: moving.position.z + adjusted.z,
          })
        : point;
      return {
        ...state,
        ...moveSelectionGeometry(
          state,
          roots,
          adjusted,
        ),
        drag: some({
          ...d,
          last: point,
          first: {
            x: previous.x + shifted.x - p.x,
            y: previous.y + shifted.y - p.y,
          },
        }),
      };
    }
    if (d.mode === "orbit") {
      const rotated = orbitByDrag(
        dx,
        dy,
        drawing,
      )(state);
      return {
        ...rotated,
        drag: some({ ...d, last: point }),
      };
    }
    return {
      ...state,
      drag: some({ ...d, last: point }),
      camera:
        d.mode === "pan"
          ? pan(dx, dy)(state.camera)
          : state.camera,
      ...(d.mode !== "node"
        ? {}
        : moveSelectionGeometry(
            state,
            selectedNodes(state).filter(
              (id) =>
                !state.nodes.find(
                  (n) => n.id === id,
                )?.locked,
            ),
            delta,
          )),
    };
  };

/** Place a branch at an exact center-to-center world distance from a fixed
 * anchor. Reject the edit when movement constraints would change the result. */
export const setBranchDistance = (
  flow: Flow,
  anchorId: string,
  branchId: string,
  distance: number,
): Flow => {
  const anchor = flow.nodes.find(
      (n) => n.id === anchorId,
    ),
    branch = flow.nodes.find(
      (n) => n.id === branchId,
    );
  if (
    !anchor ||
    !branch ||
    !Number.isFinite(distance) ||
    distance < 0
  )
    return flow;
  const members = subtree(flow.nodes, [branchId]);
  if (
    members.has(anchorId) ||
    flow.nodes.some(
      (n) => members.has(n.id) && n.locked,
    )
  )
    return flow;
  const a = anchor.position,
    b = branch.position;
  const dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z;
  const length = Math.hypot(dx, dy, dz);
  if (!length || length === distance) return flow;
  const factor = (distance - length) / length;
  const delta = {
    x: dx * factor,
    y: dy * factor,
    z: dz * factor,
  };
  const constrained = constrainedDelta(
    flow,
    members,
    branchId,
    delta,
    flow.movement ?? {},
  );
  if (
    constrained.x !== delta.x ||
    constrained.y !== delta.y ||
    constrained.z !== delta.z ||
    !Object.values(delta).every(Number.isFinite)
  )
    return flow;
  const geometry = moveSelectionGeometry(
    flow,
    [branchId],
    delta,
  );
  const fixed = geometry.nodes.find(
    (n) => n.id === anchorId,
  )?.position;
  if (
    !fixed ||
    fixed.x !== a.x ||
    fixed.y !== a.y ||
    fixed.z !== a.z
  )
    return flow;
  return { ...flow, ...geometry };
};

/** Peel unused group leaves bottom-up while retaining referenced branches. */
export const pruneEmptyGroups: Change = (
  flow,
) => {
  const keep = new Set<string>();
  for (const e of flow.edges) {
    keep.add(e.source);
    keep.add(e.target);
  }
  for (const m of flow.marks ?? [])
    if (m.kind === "review" && m.node)
      keep.add(m.node);
  for (const s of flow.sets ?? [])
    for (const id of s.members) keep.add(id);
  for (const d of flow.spatial?.dimensions ?? [])
    for (const id of d.nodes) keep.add(id);
  if (flow.spatial?.pivot)
    keep.add(flow.spatial.pivot);
  if (flow.isolatedBranch)
    keep.add(flow.isolatedBranch);
  if (isSome(flow.source))
    keep.add(flow.source.content);
  if (isSome(flow.drag))
    keep.add(flow.drag.content.node);
  const byId = new Map(
      flow.nodes.map((n) => [n.id, n]),
    ),
    children = new Map<string, number>();
  for (const n of flow.nodes)
    if (n.parent !== undefined)
      children.set(
        n.parent,
        (children.get(n.parent) ?? 0) + 1,
      );
  const queue = flow.nodes.filter(
    (n) => !children.has(n.id),
  );
  const removed = new Set<string>();
  for (const n of queue) {
    if (
      !n.group ||
      n.locked ||
      n.data ||
      n.boundary ||
      n.ports?.length ||
      keep.has(n.id)
    )
      continue;
    removed.add(n.id);
    if (n.parent === undefined) continue;
    const left = children.get(n.parent)! - 1;
    children.set(n.parent, left);
    const parent = byId.get(n.parent);
    if (!left && parent) queue.push(parent);
  }
  if (!removed.size) return flow;
  return selectNodes(
    selectedNodes(flow).filter(
      (id) => !removed.has(id),
    ),
  )({
    ...flow,
    nodes: flow.nodes.filter(
      (n) => !removed.has(n.id),
    ),
  });
};

export const resizeNode = (
  n: FlowNode,
  width: number,
  height = nodeSize(n).height,
): FlowNode => {
  const w = Math.max(
      grid,
      Math.round(width / grid) * grid,
    ),
    h = Math.max(
      grid,
      Math.round(height / grid) * grid,
    ),
    before = nodeSize(n);
  return {
    ...n,
    width: w,
    height: h,
    position: {
      ...n.position,
      x: alignBox(
        n.position.x - before.width / 2 + w / 2,
        w,
      ),
      y: alignBox(
        n.position.y - before.height / 2 + h / 2,
        h,
      ),
    },
  };
};

export const insertOnEdge: Change = (f) => {
  const e = f.activeEdge
      ? f.edges[edgeIndex(f.edges, f.activeEdge)]
      : f.edges[0],
    a = f.nodes.find((n) => n.id === e?.source),
    b = f.nodes.find((n) => n.id === e?.target);
  if (!e || !a || !b) return f;
  const id =
    Array.from(
      { length: f.nodes.length + 1 },
      (_, i) => "Step " + (i + 1),
    ).find(
      (id) => !f.nodes.some((n) => n.id === id),
    ) ?? "Step";
  const graph = splitEdge(
    f,
    e,
    {
      id,
      label: id,
      position: {
        x: (a.position.x + b.position.x) / 2,
        y: (a.position.y + b.position.y) / 2 + 65,
        z: (a.position.z + b.position.z) / 2,
      },
    },
    f.allowConnection
      ? { allow: f.allowConnection }
      : {},
  );
  return graph === f
    ? f
    : selectNodes([id])({ ...f, ...graph });
};

export const quietMarked = (
  flow: Flow,
  thing: string | Edge,
) => {
  const { focus, mark } = flow;
  if (typeof thing === "string") {
    if (focus && !focus.has(thing)) return true;
    if (
      !mark?.length ||
      flow.markCleared ||
      mark.includes(thing)
    )
      return false;
    return !flow.edges.some(
      (e) =>
        (e.source === thing ||
          e.target === thing) &&
        mark.includes(
          e.source + " -> " + e.target,
        ),
    );
  }
  if (
    focus &&
    (!focus.has(thing.source) ||
      !focus.has(thing.target))
  )
    return true;
  return (
    !!mark?.length &&
    !flow.markCleared &&
    !mark.includes(
      thing.source + " -> " + thing.target,
    ) &&
    !(
      mark.includes(thing.source) &&
      mark.includes(thing.target)
    )
  );
};
