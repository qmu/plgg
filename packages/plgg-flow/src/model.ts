import { roomFor } from "plgg-flow/autoLayout";
import type {
  RoomLayout,
  LayerOptions,
} from "./autoLayout";
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
  moveExpandingParents,
} from "plgg-flow/hierarchy";
import {
  connectionIssue,
  edgeIndex,
  type Port,
} from "plgg-flow/connections";
import type { SpatialView } from "plgg-flow/spatial";
import type { Pinch } from "plgg-flow/gesture";
import type { JsonObject } from "./metadata";
export type FlowNode = Readonly<{
  id: string;
  label: string;
  width?: number;
  height?: number;
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
  outline?: readonly Point[];
  waypoint?: number;
  first?: Point;
  pressed?: Point;
  node: string;
}>;
export type Flow = Graph &
  Readonly<{
    frame?: Point;
    /** Logical width at the right of the frame that a
     * panel laid over the board hides; fitting keeps
     * the diagram clear of it. */
    cover?: number;
    rooms?: RoomLayout;
    layered?: Readonly<{
      options: LayerOptions;
      computed: ReadonlyMap<string, Point3>;
    }>;
    camera: Camera;
    orbitCenter?: Point3;
    selected: Option<string>;
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
  const nodes = moveExpandingParents(
    flow.nodes,
    roots,
    delta,
  );
  if (
    !(delta.x || delta.y || delta.z) ||
    !flow.edges.some(
      (e) => e.waypoints?.length || e.via?.length,
    )
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
  let activeEdge = flow.activeEdge,
    changed = false;
  const edges = flow.edges.map(
    (original): Edge => {
      const { via, ...rest } = original;
      const e =
        via &&
        (relocated.has(original.source) ||
          relocated.has(original.target))
          ? rest
          : original;
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
  fitGeometry(state, state.nodes, []);
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
    edge.waypoints ?? [],
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
      perspective: tilt * tilt * (3 - 2 * tilt),
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
export const orbitByDrag =
  (dx: number, dy: number): Change =>
  (state) => {
    const radiansPerUnit =
      Math.PI / frameOf(state).x;
    return viewAt(
      state.camera.yaw - dx * radiansPerUnit,
      state.camera.pitch - dy * radiansPerUnit,
    )(state);
  };
export const front: Change = viewAt(0, 0);
export const rotateView: Change = (state) =>
  viewAt(
    state.camera.yaw - 0.48,
    state.camera.pitch + 0.64,
  )(state);
export const zoom =
  (factor: number): Change =>
  (state) => ({
    ...state,
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
      if (!moved.has(n.id)) return n;
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
export const releasePointer: Change = (flow) => {
  const idle = { ...flow, drag: none() };
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
  return settleRooms({ ...idle, ...geometry });
};
export const movePointer =
  (point: Point, pointer: number): Change =>
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
      const delta = worldDelta(
        state.camera,
        {
          x: point.x - (d.first ?? d.last).x,
          y: point.y - (d.first ?? d.last).y,
        },
        project(state.camera)(group.position).z,
      );
      const grow = {
        x: Math.max(
          0,
          (group.grow?.x ?? 0) +
            grid * Math.round(delta.x / grid),
        ),
        y: Math.max(
          0,
          (group.grow?.y ?? 0) +
            grid * Math.round(delta.y / grid),
        ),
      };
      const origin = project(state.camera)(
          group.position,
        ),
        moved = project(state.camera)({
          ...group.position,
          x:
            group.position.x +
            grow.x -
            (group.grow?.x ?? 0),
          y:
            group.position.y +
            grow.y -
            (group.grow?.y ?? 0),
        });
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === group.id ? { ...n, grow } : n,
        ),
        drag: some({
          ...d,
          first: {
            x:
              (d.first ?? d.last).x +
              moved.x -
              origin.x,
            y:
              (d.first ?? d.last).y +
              moved.y -
              origin.y,
          },
          last: point,
        }),
      };
    }
    const moving = state.nodes.find(
      (n) => n.id === d.node,
    );
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
      const rotated = orbitByDrag(dx, dy)(state);
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

export const settleRooms: Change = (flow) => {
  const layout = flow.rooms;
  if (!layout) return flow;
  return {
    ...flow,
    nodes: flow.nodes.map((n) => {
      const room = roomFor(layout, n);
      if (!room) return n;
      const size = nodeSize(n);
      const clamp = (
        at: number,
        extent: number,
        min: number,
        max: number,
      ) =>
        Math.max(
          min + extent / 2,
          Math.min(
            Math.floor((max - extent) / grid) *
              grid +
              extent / 2,
            at,
          ),
        );
      if (
        n.position.x - size.width / 2 >=
          room.min.x &&
        n.position.x + size.width / 2 <=
          room.max.x &&
        n.position.y - size.height / 2 >=
          room.min.y &&
        n.position.y + size.height / 2 <=
          room.max.y &&
        n.position.z === room.min.z
      )
        return n;
      return {
        ...n,
        position: {
          x: clamp(
            n.position.x,
            size.width,
            room.min.x,
            room.max.x,
          ),
          y: clamp(
            n.position.y,
            size.height,
            room.min.y,
            room.max.y,
          ),
          z: room.min.z,
        },
      };
    }),
  };
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
