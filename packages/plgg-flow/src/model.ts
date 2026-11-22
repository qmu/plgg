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
    | "lasso";
  outline?: readonly Point[];
  waypoint?: number;
  first?: Point;
  node: string;
}>;
export type Flow = Graph &
  Readonly<{
    camera: Camera;
    orbitCenter?: Point3;
    selected: Option<string>;
    activeEdge?: Edge;
    movement?: Movement;
    lasso?: boolean;
    bookmarks?: readonly CameraBookmark[];
    sets?: readonly SelectionSet[];
    marks?: readonly Mark[];
    ink?: "pen" | "erase" | "off";
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
export const createFlow = (
  graph: Graph,
): Flow => ({
  ...graph,
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
    !flow.edges.some((e) => e.waypoints?.length)
  )
    return { nodes, edges: flow.edges };
  const moved = subtree(flow.nodes, roots);
  let activeEdge = flow.activeEdge,
    changed = false;
  const edges = flow.edges.map((e) => {
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
  });
  return {
    nodes,
    edges: changed ? edges : flow.edges,
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
      ...nodes.flatMap(
        ({ position, width, height }) =>
          [-1, 1].map((sign) => {
            const offset = worldDelta(
              { ...state.camera, scale: 1 },
              {
                x:
                  ((width ?? 104) / 2 + 5) * sign,
                y: ((height ?? 36) / 2) * sign,
              },
            );
            return {
              x: position.x + offset.x,
              y: position.y + offset.y,
              z: position.z + offset.z,
            };
          }),
      ),
    ],
    viewport,
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
  (ids: readonly string[]): Change =>
  (state) => {
    const valid = new Set(
        state.nodes.map((n) => n.id),
      ),
      selection = [...new Set(ids)].filter((id) =>
        valid.has(id),
      );
    const last = selection[selection.length - 1];
    return {
      ...state,
      selection,
      selected:
        last === undefined ? none() : some(last),
    };
  };
export const addNode =
  (node: FlowNode): Change =>
  (state) =>
    state.nodes.some((n) => n.id === node.id)
      ? state
      : {
          ...state,
          nodes: [...state.nodes, node],
          selected: some(node.id),
        };
export const disconnect =
  (edge: Edge): Change =>
  (state) => {
    const index = edgeIndex(state.edges, edge);
    return index < 0
      ? state
      : {
          ...state,
          edges: state.edges.filter(
            (_, i) => i !== index,
          ),
        };
  };
export const deleteSelected: Change = (state) => {
  if (!isSome(state.selected)) return state;
  const graph = selectedNodes(
    state,
  ).reduce<Graph>(
    (g, id) => dissolve(g, id),
    state,
  );
  return {
    ...state,
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
    const screen = {
      x: viewport.x / 2,
      y: viewport.y / 2,
    };
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
    const radiansPerUnit = Math.PI / viewport.x;
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
      { x: 450, y: 290 },
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
        activeEdge: next,
        edges: state.edges.map((v, i) =>
          i === index ? next : v,
        ),
        drag: some({ ...d, last: point }),
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
