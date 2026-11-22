import {
  decodeMarks,
  type Mark,
} from "plgg-flow/annotations";
import {
  type JsonObject,
  isJsonObject,
} from "plgg-flow/metadata";
import {
  connectBatch,
  edgeIds,
  reserveId,
} from "plgg-flow/connections";
import type {
  Dimension,
  SpatialView,
  Section,
} from "./spatial";
import {
  portsFor,
  type Port,
} from "plgg-flow/connections";
import {
  ok,
  err,
  isErr,
  type Result,
} from "plgg";
import type {
  Graph,
  CameraBookmark,
  SelectionSet,
  FlowNode,
  Edge,
} from "./model";
import type { Camera, Point3 } from "plgg-board";

type RecordValue = Readonly<
  Record<string, unknown>
>;
const record = (v: unknown): v is RecordValue =>
  v !== null &&
  typeof v === "object" &&
  !Array.isArray(v);
const number = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);
const id = (v: unknown): v is string =>
  typeof v === "string" &&
  v.length > 0 &&
  v.length <= 1024;
const point = (v: unknown): v is Point3 =>
  record(v) &&
  number(v.x) &&
  number(v.y) &&
  number(v.z);
export type Drawing = Graph &
  Readonly<{
    camera: Camera;
    spatial?: SpatialView;
    bookmarks?: readonly CameraBookmark[];
    sets?: readonly SelectionSet[];
    marks?: readonly Mark[];
  }>;
export const saveDrawing = (
  drawing: Drawing,
): string =>
  JSON.stringify({
    format: "plgg-flow",
    version: 1,
    nodes: drawing.nodes,
    edges: drawing.edges,
    camera: drawing.camera,
    spatial: drawing.spatial,
    marks: drawing.marks,
    bookmarks: drawing.bookmarks,
    sets: drawing.sets,
  });
/** Editable structural copy. Keep explicitly named scalar data only, so
 * approving a key cannot implicitly disclose fields nested below it. */
export const saveStructuralCopy = (
  drawing: Drawing,
  keys: readonly string[],
): string => {
  const allowed = new Set(keys);
  const project = <
    T extends { data?: JsonObject },
  >(
    item: T,
  ) => {
    const { data, ...rest } = item;
    const entries = Object.entries(
      data ?? {},
    ).filter(
      ([name, value]) =>
        allowed.has(name) &&
        (value === null ||
          typeof value !== "object"),
    );
    return entries.length
      ? {
          ...rest,
          data: Object.fromEntries(entries),
        }
      : rest;
  };
  return saveDrawing({
    nodes: drawing.nodes.map(project),
    edges: drawing.edges.map(project),
    camera: drawing.camera,
  });
};
const origin = (
  v: unknown,
): v is readonly [number, number] =>
  Array.isArray(v) &&
  v.length === 2 &&
  v.every(number);
const decodeNode = (
  v: unknown,
): Result<FlowNode, string> => {
  if (
    !record(v) ||
    !id(v.id) ||
    typeof v.label !== "string" ||
    !point(v.position)
  )
    return err(
      "Invalid node identity, label or position",
    );
  if (
    v.width !== undefined &&
    (!number(v.width) || v.width <= 0)
  )
    return err("Invalid node width");
  if (
    v.height !== undefined &&
    (!number(v.height) || v.height <= 0)
  )
    return err("Invalid node height");
  if (
    (v.data !== undefined &&
      !isJsonObject(v.data)) ||
    (v.type !== undefined && !id(v.type)) ||
    (v.origin !== undefined && !origin(v.origin))
  )
    return err("Invalid node metadata");
  if (
    v.extent !== undefined &&
    v.extent !== "parent"
  )
    return err("Invalid node extent");
  if (
    v.boundary !== undefined &&
    v.boundary !== "inbound" &&
    v.boundary !== "outbound" &&
    v.boundary !== "closed"
  )
    return err("Invalid group boundary");
  if (v.parent !== undefined && !id(v.parent))
    return err("Invalid parent id");
  if (v.value !== undefined && !number(v.value))
    return err("Invalid node value");
  for (const key of [
    "group",
    "connectable",
    "expandParent",
    "collapsed",
    "locked",
    "hidden",
  ])
    if (
      v[key] !== undefined &&
      typeof v[key] !== "boolean"
    )
      return err("Invalid " + key);
  const ports: Port[] = [];
  if (v.ports !== undefined) {
    if (!Array.isArray(v.ports))
      return err("Invalid ports");
    const seen = new Set<string>();
    for (const p of v.ports) {
      if (
        !record(p) ||
        !id(p.id) ||
        (p.direction !== "source" &&
          p.direction !== "target")
      )
        return err("Invalid port");
      const key = JSON.stringify([
        p.direction,
        p.id,
      ]);
      if (seen.has(key))
        return err("Duplicate port");
      seen.add(key);
      if (
        (p.description !== undefined &&
          typeof p.description !== "string") ||
        (p.payload !== undefined &&
          !id(p.payload)) ||
        (p.capacity !== undefined &&
          (!number(p.capacity) ||
            !Number.isSafeInteger(p.capacity) ||
            p.capacity < 0))
      )
        return err("Invalid port policy");
      ports.push({
        id: p.id,
        direction: p.direction,
        ...(typeof p.description === "string"
          ? { description: p.description }
          : {}),
        ...(id(p.payload)
          ? { payload: p.payload }
          : {}),
        ...(number(p.capacity)
          ? { capacity: p.capacity }
          : {}),
      });
    }
  }
  return ok({
    id: v.id,
    ...(number(v.height)
      ? { height: v.height }
      : {}),
    ...(id(v.type) ? { type: v.type } : {}),
    ...(origin(v.origin)
      ? { origin: v.origin }
      : {}),
    ...(isJsonObject(v.data)
      ? { data: v.data }
      : {}),
    label: v.label,
    ...(ports.length ? { ports } : {}),
    position: {
      x: v.position.x,
      y: v.position.y,
      z: v.position.z,
    },
    ...(number(v.width)
      ? { width: v.width }
      : {}),
    ...(v.boundary === "inbound" ||
    v.boundary === "outbound" ||
    v.boundary === "closed"
      ? { boundary: v.boundary }
      : {}),
    ...(v.connectable === false
      ? { connectable: false }
      : {}),
    ...(v.expandParent === true
      ? { expandParent: true }
      : {}),
    ...(v.extent === "parent"
      ? { extent: v.extent }
      : {}),
    ...(id(v.parent) ? { parent: v.parent } : {}),
    ...(number(v.value)
      ? { value: v.value }
      : {}),
    ...(v.group ? { group: true } : {}),
    ...(v.locked ? { locked: true } : {}),
    ...(v.hidden ? { hidden: true } : {}),
    ...(v.collapsed ? { collapsed: true } : {}),
  });
};
const decodeEdge = (
  v: unknown,
): Result<Edge, string> => {
  if (
    !record(v) ||
    !id(v.source) ||
    !id(v.target)
  )
    return err("Invalid edge endpoints");
  if (
    v.interactionWidth !== undefined &&
    (!number(v.interactionWidth) ||
      v.interactionWidth < 0)
  )
    return err("Invalid interaction width");
  if (
    v.arrows !== undefined &&
    v.arrows !== "forward" &&
    v.arrows !== "backward" &&
    v.arrows !== "both" &&
    v.arrows !== "none"
  )
    return err("Invalid arrow direction");
  if (
    v.route !== undefined &&
    v.route !== "curve" &&
    v.route !== "step" &&
    v.route !== "straight"
  )
    return err("Invalid route");
  if (
    v.label !== undefined &&
    typeof v.label !== "string"
  )
    return err("Invalid edge label");
  for (const key of [
    "animated",
    "highlighted",
    "hidden",
  ])
    if (
      v[key] !== undefined &&
      typeof v[key] !== "boolean"
    )
      return err("Invalid " + key);
  for (const field of [
    "id",
    "sourceHandle",
    "targetHandle",
  ])
    if (v[field] !== undefined && !id(v[field]))
      return err("Invalid edge " + field);
  if (
    (v.data !== undefined &&
      !isJsonObject(v.data)) ||
    (v.type !== undefined && !id(v.type))
  )
    return err("Invalid edge metadata");
  if (
    v.waypoints !== undefined &&
    (!Array.isArray(v.waypoints) ||
      v.waypoints.length > 4096 ||
      !v.waypoints.every(point))
  )
    return err("Invalid edge waypoints");
  return ok({
    source: v.source,
    ...(Array.isArray(v.waypoints)
      ? { waypoints: v.waypoints.filter(point) }
      : {}),
    ...(isJsonObject(v.data)
      ? { data: v.data }
      : {}),
    ...(id(v.type) ? { type: v.type } : {}),
    ...(id(v.id) ? { id: v.id } : {}),
    ...(id(v.sourceHandle)
      ? { sourceHandle: v.sourceHandle }
      : {}),
    ...(id(v.targetHandle)
      ? { targetHandle: v.targetHandle }
      : {}),
    target: v.target,
    ...(v.arrows ? { arrows: v.arrows } : {}),
    ...(v.route ? { route: v.route } : {}),
    ...(typeof v.label === "string"
      ? { label: v.label }
      : {}),
    ...(number(v.interactionWidth)
      ? { interactionWidth: v.interactionWidth }
      : {}),
    ...(v.animated ? { animated: true } : {}),
    ...(v.highlighted
      ? { highlighted: true }
      : {}),
    ...(v.hidden ? { hidden: true } : {}),
  });
};
export const inspectGraph = (
  graph: Graph,
): readonly string[] => {
  const diagnostics = new Set<string>(),
    byId = new Map(
      graph.nodes.map((n) => [n.id, n]),
    );
  if (byId.size !== graph.nodes.length)
    diagnostics.add("Duplicate node id");
  const edgeIds = graph.edges.flatMap((e) =>
    e.id === undefined ? [] : [e.id],
  );
  if (new Set(edgeIds).size !== edgeIds.length)
    diagnostics.add("Duplicate edge id");
  const processed = new Set<string>();
  for (const n of graph.nodes) {
    if (
      n.parent !== undefined &&
      !byId.has(n.parent)
    )
      diagnostics.add(
        "Missing parent: " + n.parent,
      );
    const branch = new Set<string>();
    let current: FlowNode | undefined = n;
    while (
      current &&
      !processed.has(current.id)
    ) {
      if (branch.has(current.id)) {
        diagnostics.add(
          "Cyclic parent chain: " + current.id,
        );
        break;
      }
      branch.add(current.id);
      current =
        current.parent === undefined
          ? undefined
          : byId.get(current.parent);
    }
    for (const id of branch) processed.add(id);
  }
  for (const e of graph.edges)
    if (
      !byId.has(e.source) ||
      !byId.has(e.target)
    )
      diagnostics.add(
        "Missing edge endpoint: " +
          e.source +
          " → " +
          e.target,
      );
  return [...diagnostics];
};
const parse = (
  source: string,
): Result<RecordValue, string> => {
  if (source.length > 8_000_000)
    return err(
      "Diagram exceeds the 8 MB input limit",
    );
  try {
    const v: unknown = JSON.parse(source);
    return record(v)
      ? ok(v)
      : err("Expected a JSON object");
  } catch {
    return err("Invalid JSON");
  }
};
const collection = (v: RecordValue) =>
  Array.isArray(v.nodes) &&
  v.nodes.length <= 10000 &&
  Array.isArray(v.edges) &&
  v.edges.length <= 50000;
const decodeGraph = (
  v: RecordValue,
): Result<Graph, string> => {
  if (
    !collection(v) ||
    !Array.isArray(v.nodes) ||
    !Array.isArray(v.edges)
  )
    return err(
      "Expected up to 10,000 nodes and 50,000 edges",
    );
  const nodes: FlowNode[] = [],
    edges: Edge[] = [];
  for (const entry of v.nodes) {
    const n = decodeNode(entry);
    if (isErr(n)) return n;
    nodes.push(n.content);
  }
  for (const entry of v.edges) {
    const e = decodeEdge(entry);
    if (isErr(e)) return e;
    edges.push(e.content);
  }
  const graph = { nodes, edges },
    problem = inspectGraph(graph)[0];
  return problem ? err(problem) : ok(graph);
};
const readSpatial = (
  value: unknown,
): Result<SpatialView, string> => {
  if (!record(value))
    return err("Invalid spatial settings");
  for (const key of [
    "axes",
    "depthColor",
    "overview",
  ])
    if (
      value[key] !== undefined &&
      typeof value[key] !== "boolean"
    )
      return err("Invalid " + key);
  if (
    value.pivot !== undefined &&
    !id(value.pivot)
  )
    return err("Invalid rotation pivot");
  let section: Section | undefined;
  const slab = value.section;
  if (slab !== undefined) {
    if (
      !record(slab) ||
      (slab.axis !== "x" &&
        slab.axis !== "y" &&
        slab.axis !== "z") ||
      !number(slab.min) ||
      !number(slab.max) ||
      slab.min > slab.max
    )
      return err("Invalid section");
    section = {
      axis: slab.axis,
      min: slab.min,
      max: slab.max,
    };
  }
  const dimensions: Dimension[] = [];
  if (value.dimensions !== undefined) {
    if (
      !Array.isArray(value.dimensions) ||
      value.dimensions.length > 10000
    )
      return err("Invalid dimension collection");
    for (const v of value.dimensions) {
      if (
        !record(v) ||
        (v.kind !== "angle" &&
          v.kind !== "distance") ||
        !Array.isArray(v.nodes) ||
        v.nodes.length !==
          (v.kind === "angle" ? 3 : 2) ||
        !v.nodes.every(id)
      )
        return err("Invalid dimension");
      dimensions.push({
        kind: v.kind,
        nodes: v.nodes,
      });
    }
  }
  return ok({
    ...(value.axes ? { axes: true } : {}),
    ...(value.overview ? { overview: true } : {}),
    ...(value.depthColor
      ? { depthColor: true }
      : {}),
    ...(id(value.pivot)
      ? { pivot: value.pivot }
      : {}),
    ...(section ? { section } : {}),
    dimensions,
  });
};
const decodeCamera = (
  c: unknown,
): Camera | undefined => {
  if (
    !record(c) ||
    !record(c.origin) ||
    !number(c.origin.x) ||
    !number(c.origin.y) ||
    !number(c.yaw) ||
    !number(c.pitch) ||
    !number(c.scale) ||
    c.scale <= 0 ||
    (c.perspective !== undefined &&
      typeof c.perspective !== "boolean" &&
      (!number(c.perspective) ||
        c.perspective < 0 ||
        c.perspective > 1))
  )
    return undefined;
  return {
    origin: { x: c.origin.x, y: c.origin.y },
    yaw: c.yaw,
    pitch: c.pitch,
    scale: c.scale,
    ...(c.perspective !== undefined
      ? { perspective: c.perspective }
      : {}),
  };
};
export const loadDrawing = (
  source: string,
): Result<Drawing, string> => {
  const result = parse(source);
  if (isErr(result)) return result;
  const v = result.content;
  if (v.format !== "plgg-flow" || v.version !== 1)
    return err("Unsupported drawing version");
  const graph = decodeGraph(v);
  if (isErr(graph)) return graph;
  const camera = decodeCamera(v.camera);
  if (!camera) return err("Invalid camera");
  const bookmarks: CameraBookmark[] = [];
  if (v.bookmarks !== undefined) {
    if (!Array.isArray(v.bookmarks))
      return err("Invalid camera bookmarks");
    const names = new Set<string>();
    for (const entry of v.bookmarks) {
      if (
        !record(entry) ||
        !id(entry.name) ||
        names.has(entry.name)
      )
        return err("Invalid camera bookmark");
      const pose = decodeCamera(entry.camera);
      if (!pose)
        return err("Invalid bookmarked camera");
      names.add(entry.name);
      bookmarks.push({
        name: entry.name,
        camera: pose,
      });
    }
  }
  const sets: SelectionSet[] = [];
  if (v.sets !== undefined) {
    if (!Array.isArray(v.sets))
      return err("Invalid selection sets");
    const names = new Set<string>(),
      nodes = new Set(
        graph.content.nodes.map((n) => n.id),
      );
    for (const set of v.sets) {
      if (
        !record(set) ||
        !id(set.name) ||
        names.has(set.name) ||
        !Array.isArray(set.members) ||
        !set.members.every(id)
      )
        return err("Invalid selection set");
      names.add(set.name);
      sets.push({
        name: set.name,
        members: [
          ...new Set<string>(set.members),
        ].filter((member) => nodes.has(member)),
      });
    }
  }
  const marks = decodeMarks(v.marks ?? []);
  if (isErr(marks)) return marks;
  const spatial = readSpatial(v.spatial ?? {});
  if (isErr(spatial)) return spatial;
  return ok({
    ...graph.content,
    ...(v.bookmarks === undefined
      ? {}
      : { bookmarks }),
    ...(v.sets === undefined ? {} : { sets }),
    ...(v.marks === undefined
      ? {}
      : { marks: marks.content }),
    ...(v.spatial === undefined
      ? {}
      : { spatial: spatial.content }),
    camera,
  });
};
/** Import the portable React Flow data subset; leave custom implementations
 * to the caller and report every encountered unsupported feature category. */
export const importReactFlow = (
  source: string,
): Result<
  {
    drawing: Drawing;
    warnings: readonly string[];
  },
  string
> => {
  const result = parse(source);
  if (isErr(result)) return result;
  const v = result.content;
  if (
    !collection(v) ||
    !Array.isArray(v.nodes) ||
    !Array.isArray(v.edges)
  )
    return err(
      "Invalid React Flow collection size",
    );
  const warnings = new Set<string>(),
    nodes: FlowNode[] = [],
    edges: Edge[] = [],
    sizes = new Map<
      string,
      { width: number; height: number }
    >();
  for (const n of v.nodes) {
    if (
      !record(n) ||
      !id(n.id) ||
      !record(n.position) ||
      !number(n.position.x) ||
      !number(n.position.y)
    )
      return err("Invalid React Flow node");
    if (
      n.parentId !== undefined &&
      !id(n.parentId)
    )
      return err("Invalid parentId");
    if (
      (n.origin !== undefined &&
        !origin(n.origin)) ||
      (n.data !== undefined &&
        !isJsonObject(n.data)) ||
      (n.type !== undefined && !id(n.type))
    )
      return err(
        "Invalid React Flow node metadata",
      );
    if (
      n.type &&
      ![
        "input",
        "default",
        "output",
        "group",
      ].includes(String(n.type))
    )
      warnings.add(
        "Custom node types use the default card",
      );
    if (n.style || n.className)
      warnings.add("Custom styling is omitted");
    const measured = record(n.measured)
        ? n.measured
        : {},
      width = number(n.width)
        ? n.width
        : number(measured.width)
          ? measured.width
          : 104,
      height = number(n.height)
        ? n.height
        : number(measured.height)
          ? measured.height
          : 36;
    if (width <= 0 || height <= 0)
      return err("Invalid measured dimensions");
    sizes.set(n.id, { width, height });
    nodes.push({
      id: n.id,
      height,
      ...(origin(n.origin)
        ? { origin: n.origin }
        : {}),
      ...(id(n.type) ? { type: n.type } : {}),
      ...(isJsonObject(n.data)
        ? { data: n.data }
        : {}),
      label:
        record(n.data) &&
        typeof n.data.label === "string"
          ? n.data.label
          : n.id,
      width,
      position: {
        x:
          n.position.x -
          width *
            (origin(n.origin) ? n.origin[0] : 0),
        y:
          n.position.y -
          height *
            (origin(n.origin) ? n.origin[1] : 0),
        z: 0,
      },
      ...(n.connectable === false
        ? { connectable: false }
        : {}),
      ...(n.expandParent === true
        ? { expandParent: true }
        : {}),
      ...(n.extent === "parent"
        ? { extent: n.extent }
        : {}),
      ...(id(n.parentId)
        ? { parent: n.parentId }
        : {}),
      ...(n.type === "group"
        ? { group: true }
        : {}),
      ...(n.draggable === false
        ? { locked: true }
        : {}),
      ...(n.hidden === true
        ? { hidden: true }
        : {}),
    });
  }

  for (const e of v.edges) {
    if (
      !record(e) ||
      !id(e.source) ||
      !id(e.target)
    )
      return err("Invalid React Flow edge");
    if (
      e.interactionWidth !== undefined &&
      (!number(e.interactionWidth) ||
        e.interactionWidth < 0)
    )
      return err("Invalid interaction width");
    for (const value of [
      e.id,
      e.sourceHandle,
      e.targetHandle,
    ])
      if (
        value !== undefined &&
        value !== null &&
        !id(value)
      )
        return err("Invalid edge identifier");
    if (
      e.type &&
      ![
        "straight",
        "step",
        "smoothstep",
        "default",
        "simplebezier",
      ].includes(String(e.type))
    )
      warnings.add(
        "Custom edge types use the default curve",
      );
    if (
      (e.data !== undefined &&
        !isJsonObject(e.data)) ||
      (e.type !== undefined && !id(e.type))
    )
      return err(
        "Invalid React Flow edge metadata",
      );
    const supportedArrow = (marker: unknown) =>
      record(marker) &&
      (marker.type === "arrow" ||
        marker.type === "arrowclosed");
    const start = supportedArrow(e.markerStart),
      end = supportedArrow(e.markerEnd);
    if (
      (e.markerStart && !start) ||
      (e.markerEnd && !end)
    )
      warnings.add(
        "Custom arrow markers are not rendered",
      );
    edges.push({
      arrows: start
        ? end
          ? "both"
          : "backward"
        : end
          ? "forward"
          : "none",
      ...(isJsonObject(e.data)
        ? { data: e.data }
        : {}),
      ...(id(e.type) ? { type: e.type } : {}),
      ...(id(e.id) ? { id: e.id } : {}),
      ...(id(e.sourceHandle)
        ? { sourceHandle: e.sourceHandle }
        : {}),
      ...(id(e.targetHandle)
        ? { targetHandle: e.targetHandle }
        : {}),
      source: e.source,
      target: e.target,
      route:
        e.type === "straight"
          ? "straight"
          : e.type === "step" ||
              e.type === "smoothstep"
            ? "step"
            : "curve",
      ...(typeof e.label === "string"
        ? { label: e.label }
        : {}),
      ...(number(e.interactionWidth)
        ? { interactionWidth: e.interactionWidth }
        : {}),
      ...(e.animated === true
        ? { animated: true }
        : {}),
      ...(e.hidden === true
        ? { hidden: true }
        : {}),
    });
  }
  const importedPorts = portsFor({
    nodes,
    edges,
  });
  const problem = inspectGraph({
    nodes,
    edges,
  })[0];
  if (problem) return err(problem);
  const byId = new Map(
      nodes.map((n) => [n.id, n]),
    ),
    absolute = new Map<string, Point3>();
  for (const n of nodes) {
    const chain: FlowNode[] = [];
    let current: FlowNode | undefined = n;
    while (current && !absolute.has(current.id)) {
      chain.push(current);
      current =
        current.parent === undefined
          ? undefined
          : byId.get(current.parent);
    }
    let base = current
      ? absolute.get(current.id)
      : undefined;
    for (const child of chain.reverse()) {
      base = {
        x: child.position.x + (base?.x ?? 0),
        y: child.position.y + (base?.y ?? 0),
        z: 0,
      };
      absolute.set(child.id, base);
    }
  }
  const c = v.viewport;
  if (
    !record(c) ||
    !number(c.x) ||
    !number(c.y) ||
    !number(c.zoom) ||
    c.zoom <= 0
  )
    return err("Invalid React Flow viewport");
  return ok({
    drawing: {
      nodes: nodes.map((n) => {
        const p =
            absolute.get(n.id) ?? n.position,
          size = sizes.get(n.id);
        return {
          ...n,
          ...(importedPorts.has(n.id)
            ? {
                ports:
                  importedPorts.get(n.id) ?? [],
              }
            : {}),
          position: {
            x: p.x + (size?.width ?? 104) / 2,
            y: p.y + (size?.height ?? 36) / 2,
            z: 0,
          },
        };
      }),
      edges,
      camera: {
        yaw: 0,
        pitch: 0,
        origin: { x: c.x, y: c.y },
        scale: c.zoom,
      },
    },
    warnings: [...warnings],
  });
};

/** React Flow expects parents before children and relative, anchored positions.
 * The source camera's pan and zoom are exported in plan coordinates. */
export const exportReactFlow = (
  drawing: Drawing,
): Result<string, string> => {
  const problem = inspectGraph(drawing)[0];
  if (problem) return err(problem);
  const byId = new Map(
      drawing.nodes.map((n) => [n.id, n]),
    ),
    used = edgeIds(drawing.edges);
  const ordered: FlowNode[] = [],
    done = new Set<string>();
  for (const n of drawing.nodes) {
    const chain: FlowNode[] = [];
    let current: FlowNode | undefined = n;
    while (current && !done.has(current.id)) {
      chain.push(current);
      done.add(current.id);
      current =
        current.parent === undefined
          ? undefined
          : byId.get(current.parent);
    }
    ordered.push(...chain.reverse());
  }
  return ok(
    JSON.stringify({
      nodes: ordered.map((n) => {
        const parent =
            n.parent === undefined
              ? undefined
              : byId.get(n.parent),
          width = n.width ?? 104,
          height = n.height ?? 36;
        const px = parent
            ? parent.position.x -
              (parent.width ?? 104) / 2
            : 0,
          py = parent
            ? parent.position.y -
              (parent.height ?? 36) / 2
            : 0;
        return {
          id: n.id,
          type:
            n.type ??
            (n.group ? "group" : "default"),
          data: { ...n.data, label: n.label },
          width,
          height,
          position: {
            x:
              n.position.x +
              ((n.origin?.[0] ?? 0) - 0.5) *
                width -
              px,
            y:
              n.position.y +
              ((n.origin?.[1] ?? 0) - 0.5) *
                height -
              py,
          },
          ...(n.origin
            ? { origin: n.origin }
            : {}),
          ...(n.connectable === false
            ? { connectable: false }
            : {}),
          ...(parent && n.expandParent
            ? { expandParent: true }
            : {}),
          ...(parent && n.extent === "parent"
            ? { extent: n.extent }
            : {}),
          ...(parent
            ? { parentId: parent.id }
            : {}),
          ...(n.hidden ? { hidden: true } : {}),
          ...(n.locked
            ? { draggable: false }
            : {}),
        };
      }),
      edges: drawing.edges.map((e) => ({
        ...(e.arrows === "both" ||
        e.arrows === "backward"
          ? {
              markerStart: {
                type: "arrowclosed",
              },
            }
          : {}),
        ...(e.arrows === undefined ||
        e.arrows === "both" ||
        e.arrows === "forward"
          ? { markerEnd: { type: "arrowclosed" } }
          : {}),
        id:
          e.id ??
          reserveId(
            used,
            e.source + "-" + e.target,
          ),
        source: e.source,
        target: e.target,
        type:
          e.type ??
          (e.route === "curve"
            ? "default"
            : (e.route ?? "default")),
        ...(e.sourceHandle
          ? { sourceHandle: e.sourceHandle }
          : {}),
        ...(e.targetHandle
          ? { targetHandle: e.targetHandle }
          : {}),
        ...(e.label === undefined
          ? {}
          : { label: e.label }),
        ...(e.interactionWidth !== undefined
          ? {
              interactionWidth:
                e.interactionWidth,
            }
          : {}),
        ...(e.animated ? { animated: true } : {}),
        ...(e.hidden ? { hidden: true } : {}),
        ...(e.data ? { data: e.data } : {}),
      })),
      viewport: {
        x: drawing.camera.origin.x,
        y: drawing.camera.origin.y,
        zoom: drawing.camera.scale,
      },
    }),
  );
};

export type NodeTemplate = Pick<
  FlowNode,
  | "label"
  | "data"
  | "ports"
  | "width"
  | "height"
  | "type"
  | "origin"
  | "value"
  | "group"
  | "connectable"
>;

export const templateFromNode = (
  node: FlowNode,
): NodeTemplate => {
  const {
    id,
    position,
    parent,
    extent,
    expandParent,
    hidden,
    collapsed,
    locked,
    ...template
  } = node;
  return template;
};

export const saveTemplates = (
  templates: ReadonlyMap<string, NodeTemplate>,
): string =>
  JSON.stringify({
    format: "plgg-flow-templates",
    version: 1,
    nodes: [...templates].map(([id, t]) => ({
      ...t,
      id,
      position: { x: 0, y: 0, z: 0 },
    })),
  });
export const loadTemplates = (
  source: string,
): Result<
  ReadonlyMap<string, NodeTemplate>,
  string
> => {
  const parsed = parse(source);
  if (isErr(parsed)) return parsed;
  const doc = parsed.content;
  if (
    doc.format !== "plgg-flow-templates" ||
    doc.version !== 1
  )
    return err("対応していないひな形集です");
  const graph = decodeGraph({
    nodes: doc.nodes,
    edges: [],
  });
  return isErr(graph)
    ? graph
    : ok(
        new Map(
          graph.content.nodes.map((n) => [
            n.id,
            templateFromNode(n),
          ]),
        ),
      );
};

/** Spreadsheet inventory. Quote text cells and neutralize formula prefixes.
 * Coordinates come from the numeric model and remain usable as numbers. */
export const nodeInventoryCsv = (
  graph: Graph,
): string => {
  const cell = (value: string) => {
    const safe = /^(?:\s*[=+@-]|[\t\r\n])/u.test(
      value,
    )
      ? "'" + value
      : value;
    return '"' + safe.replace(/"/gu, '""') + '"';
  };
  const rows = ["id,label,type,parent,x,y,z"];
  for (const n of graph.nodes)
    rows.push(
      [
        cell(n.id),
        cell(n.label),
        cell(
          n.type ??
            (n.group ? "group" : "default"),
        ),
        cell(n.parent ?? ""),
        n.position.x,
        n.position.y,
        n.position.z,
      ].join(","),
    );
  return rows.join("\r\n") + "\r\n";
};

/** Reconstruct parent references stored in application metadata on import.
 * Missing fields leave ownership intact; an explicit null moves to the root. */
export const hierarchyFromField = (
  graph: Graph,
  key: string,
): Result<Graph, string> => {
  if (!key)
    return err(
      "親 ID を持つ項目名を指定してください",
    );
  const nodes: FlowNode[] = [];
  const containers = new Set<string>();
  for (const n of graph.nodes) {
    if (
      !n.data ||
      !Object.prototype.hasOwnProperty.call(
        n.data,
        key,
      )
    ) {
      nodes.push(n);
      continue;
    }
    const parent = n.data[key];
    if (
      parent !== null &&
      (typeof parent !== "string" || !parent)
    )
      return err(
        n.id +
          " の親 ID は文字列または null で指定してください",
      );
    if (parent !== null) containers.add(parent);
    if ((parent ?? undefined) === n.parent) {
      nodes.push(n);
      continue;
    }
    if (parent === null) {
      const {
        parent: old,
        extent,
        expandParent,
        ...root
      } = n;
      nodes.push(root);
    } else nodes.push({ ...n, parent });
  }
  const candidate = {
    ...graph,
    nodes: nodes.map((n) =>
      containers.has(n.id) && !n.group
        ? { ...n, group: true }
        : n,
    ),
  };
  const issues = inspectGraph(candidate);
  return issues.length
    ? err(issues.join("\n"))
    : ok(candidate);
};

/** Materialize an incoming dependency list on each card. Existing edges keep
 * their identities; validate the entire proposed batch before publishing it. */
export const dependenciesFromField = (
  graph: Graph,
  field: string,
  allow?: (edge: Edge, graph: Graph) => boolean,
): Result<Graph, string> => {
  if (!field)
    return err(
      "入力元 ID の配列を持つ項目名を指定してください",
    );
  const signature = (
    source: string,
    target: string,
  ) => JSON.stringify([source, target]);
  const seen = new Set(
    graph.edges.map((e) =>
      signature(e.source, e.target),
    ),
  );
  const nodes = new Set(
    graph.nodes.map((n) => n.id),
  );
  const candidates: Edge[] = [];
  for (const n of graph.nodes) {
    if (
      !n.data ||
      !Object.prototype.hasOwnProperty.call(
        n.data,
        field,
      )
    )
      continue;
    const list = n.data[field];
    if (!Array.isArray(list))
      return err(
        n.id +
          " の " +
          field +
          " は入力元 ID の配列で指定してください",
      );
    for (const source of list) {
      if (
        typeof source !== "string" ||
        !nodes.has(source)
      )
        return err(
          n.id +
            " の入力元が不正です：" +
            JSON.stringify(source),
        );
      const key = signature(source, n.id);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ source, target: n.id });
    }
  }
  return connectBatch(graph, candidates, allow);
};

/** Export the logical graph, including collapsed branches, as nested DOT
 * clusters. Generated identifiers keep user text out of DOT syntax. */
export const graphvizDot = (
  graph: Graph,
): string => {
  const quote = (value: string) =>
    '"' +
    value
      .replaceAll("\\", "\\\\")
      .replaceAll('"', '\\"')
      .replace(/\r\n?|\n/g, "\\n")
      .replace(
        /[\u0000-\u0008\u000b-\u001f\u007f]/g,
        " ",
      ) +
    '"';
  const ids = new Map(
    graph.nodes.map((n, i) => [n.id, i]),
  );
  const children = new Map<
    string | undefined,
    FlowNode[]
  >();
  for (const n of graph.nodes) {
    const parent =
      n.parent !== undefined && ids.has(n.parent)
        ? n.parent
        : undefined;
    const siblings = children.get(parent);
    if (siblings) siblings.push(n);
    else children.set(parent, [n]);
  }
  const lines = ["digraph flow {"],
    seen = new Set<string>();
  const pending: (FlowNode | string)[] = [
    ...(children.get(undefined) ?? []),
  ].reverse();
  while (pending.length) {
    const item = pending.pop()!;
    if (typeof item === "string") {
      lines.push(item);
      continue;
    }
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const i = ids.get(item.id),
      nested = children.get(item.id) ?? [];
    if (item.group || nested.length) {
      lines.push(
        "subgraph cluster_" + i + " {",
        "label=" + quote(item.label) + ";",
      );
      pending.push("}");
      for (let j = nested.length - 1; j >= 0; j--)
        pending.push(nested[j]!);
    }
    lines.push(
      "n" +
        i +
        " [label=" +
        quote(item.label) +
        "];",
    );
  }
  for (const edge of graph.edges) {
    if (
      !seen.has(edge.source) ||
      !seen.has(edge.target)
    )
      continue;
    const dir =
      edge.arrows === "backward"
        ? "back"
        : (edge.arrows ?? "forward");
    lines.push(
      "n" +
        ids.get(edge.source) +
        " -> n" +
        ids.get(edge.target) +
        " [dir=" +
        dir +
        (edge.label !== undefined
          ? ", label=" + quote(edge.label)
          : "") +
        "];",
    );
  }
  return [...lines, "}"].join("\n");
};

/** Identify native authoring data omitted or replaced by the portable export. */
export const reactFlowExportLosses = (
  drawing: Drawing,
) => {
  const rows: {
    kind: "図面" | "カード" | "配線";
    id: string;
    fields: string[];
  }[] = [];
  const documentFields: string[] = [];
  if (
    drawing.camera.yaw ||
    drawing.camera.pitch ||
    drawing.camera.perspective !== undefined
  )
    documentFields.push("3D カメラ");
  if (drawing.marks?.length)
    documentFields.push("注釈");
  if (drawing.bookmarks?.length)
    documentFields.push("視点ブックマーク");
  if (drawing.sets?.length)
    documentFields.push("保存した選択");
  if (
    drawing.spatial &&
    Object.keys(drawing.spatial).length
  )
    documentFields.push("空間表示設定");
  if (documentFields.length)
    rows.push({
      kind: "図面",
      id: "",
      fields: documentFields,
    });
  for (const node of drawing.nodes) {
    const fields: string[] = [];
    if (node.position.z !== 0)
      fields.push("奥行き");
    if (node.collapsed) fields.push("収納状態");
    if (node.boundary)
      fields.push("境界配線ポリシー");
    if (node.ports?.length)
      fields.push("明示ポート定義");
    if (node.value !== undefined)
      fields.push("数値");
    if (
      node.group &&
      node.type &&
      node.type !== "group"
    )
      fields.push("グループ指定");
    if (
      node.data &&
      Object.prototype.hasOwnProperty.call(
        node.data,
        "label",
      ) &&
      node.data.label !== node.label
    )
      fields.push("data.label の元の値");
    if (fields.length)
      rows.push({
        kind: "カード",
        id: node.id,
        fields,
      });
  }
  for (const edge of drawing.edges) {
    const fields: string[] = [];
    if (edge.waypoints?.length)
      fields.push("3D 折れ点");
    if (edge.highlighted) fields.push("強調表示");
    if (
      edge.route &&
      edge.type &&
      edge.type !==
        (edge.route === "curve"
          ? "default"
          : edge.route)
    )
      fields.push("描画経路");
    if (fields.length)
      rows.push({
        kind: "配線",
        id:
          edge.id ??
          edge.source + " → " + edge.target,
        fields,
      });
  }
  return rows;
};
