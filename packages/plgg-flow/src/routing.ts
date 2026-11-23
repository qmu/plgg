import { nodeSize } from "plgg-flow/nodeSize";
import { wireGraph } from "plgg-flow/wiring";
import { simplifyTrace } from "plgg-flow/polyline";
import { push, pop } from "plgg-flow/frontier";
import { err, ok, type Result } from "plgg";
import type { Point3 } from "plgg-board";
import type { Graph, Edge } from "./model";
type Cell = Readonly<{ x: number; y: number }>;
type Entry = Cell &
  Readonly<{
    cost: number;
    priority: number;
    id: string;
  }>;
const key = (c: Cell) => c.x + "," + c.y;
const manhattan = (a: Cell, b: Cell) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
export const routeAroundNodes = (
  graph: Graph,
  edge: Edge,
  grid = 16,
): Result<readonly Point3[], string> => {
  if (!Number.isFinite(grid) || grid < 1)
    return err("Invalid routing grid");
  const from = graph.nodes.find(
      (n) => n.id === edge.source,
    ),
    to = graph.nodes.find(
      (n) => n.id === edge.target,
    );
  if (!from || !to)
    return err("Missing endpoint");
  const obstacles = graph.nodes
    .filter(
      (n) =>
        n.id !== from.id &&
        n.id !== to.id &&
        !n.hidden &&
        !n.group,
    )
    .map((n) => ({
      left:
        n.position.x - nodeSize(n).width / 2 - 6,
      right:
        n.position.x + nodeSize(n).width / 2 + 6,
      top:
        n.position.y - nodeSize(n).height / 2 - 6,
      bottom:
        n.position.y + nodeSize(n).height / 2 + 6,
    }));
  const start = {
    x: Math.ceil(
      (from.position.x +
        nodeSize(from).width / 2 +
        grid) /
        grid,
    ),
    y: Math.round(from.position.y / grid),
  };
  const end = {
    x: Math.floor(
      (to.position.x -
        nodeSize(to).width / 2 -
        grid) /
        grid,
    ),
    y: Math.round(to.position.y / grid),
  };
  const h = (c: Cell) => manhattan(c, end),
    startKey = key(start);
  const queue: Entry[] = [],
    previous = new Map<string, Cell>(),
    cost = new Map([[startKey, 0]]);
  push(queue, {
    ...start,
    id: startKey,
    cost: 0,
    priority: h(start),
  });
  const clear = (a: Cell, b: Cell) =>
    !obstacles.some(
      (o) =>
        Math.max(a.x, b.x) * grid >= o.left &&
        Math.min(a.x, b.x) * grid <= o.right &&
        Math.max(a.y, b.y) * grid >= o.top &&
        Math.min(a.y, b.y) * grid <= o.bottom,
    );
  if (!clear(start, start) || !clear(end, end))
    return err("Port approach is obstructed");
  while (queue.length && cost.size <= 24000) {
    const current = pop(queue);
    if (!current) break;
    if (current.cost !== cost.get(current.id))
      continue;
    if (!h(current)) {
      const points: Cell[] = [end];
      let cursor = current.id;
      while (cursor !== startKey) {
        const parent = previous.get(cursor);
        if (!parent)
          return err("Incomplete route");
        points.push(parent);
        cursor = key(parent);
      }
      points.reverse();
      const path = points.flatMap((p, i) => {
        const before = points[i - 1],
          after = points[i + 1];
        if (
          before &&
          after &&
          (before.x === after.x ||
            before.y === after.y)
        )
          return [];
        return [
          {
            x: p.x * grid,
            y: p.y * grid,
            z:
              from.position.z +
              ((to.position.z - from.position.z) *
                i) /
                Math.max(1, points.length - 1),
          },
        ];
      });
      return ok(path);
    }
    for (const d of [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 0, y: -1 },
    ]) {
      const n = {
          x: current.x + d.x,
          y: current.y + d.y,
        },
        id = key(n),
        parent = previous.get(current.id);
      const turn =
          parent &&
          parent.x !== n.x &&
          parent.y !== n.y
            ? 0.35
            : 0,
        nextCost = current.cost + 1 + turn;
      if (
        nextCost >= (cost.get(id) ?? Infinity) ||
        !clear(current, n)
      )
        continue;
      cost.set(id, nextCost);
      previous.set(id, current);
      push(queue, {
        ...n,
        id,
        cost: nextCost,
        priority: nextCost + h(n),
      });
    }
  }
  return err(
    "No clear route within the search budget",
  );
};

/** Give outgoing wires on the same socket a common trunk before their
 * individual bends. The branch point lies halfway to the target centroid. */
export const bundleFanout = (
  graph: Graph,
  source: string,
  targets: readonly string[],
): Graph => {
  const byId = new Map(
      graph.nodes.map((n) => [n.id, n]),
    ),
    origin = byId.get(source)?.position;
  if (!origin) return graph;
  const selected = new Set(targets),
    groups = new Map<
      string | undefined,
      Edge[]
    >();
  for (const edge of graph.edges) {
    if (
      edge.source !== source ||
      edge.target === source ||
      !selected.has(edge.target) ||
      !byId.has(edge.target)
    )
      continue;
    const group = groups.get(edge.sourceHandle);
    if (group) group.push(edge);
    else groups.set(edge.sourceHandle, [edge]);
  }
  const replacements = new Map<Edge, Edge>();
  for (const group of groups.values()) {
    const ends = new Set(
      group.map((e) => e.target),
    );
    if (ends.size < 2) continue;
    const branch = { ...origin };
    for (const id of ends) {
      const p = byId.get(id)?.position;
      if (!p) continue;
      for (const axis of [
        "x",
        "y",
        "z",
      ] satisfies (keyof Point3)[])
        branch[axis] +=
          (p[axis] - origin[axis]) /
          (2 * ends.size);
    }
    for (const edge of group) {
      const first = edge.waypoints?.[0];
      if (
        first &&
        first.x === branch.x &&
        first.y === branch.y &&
        first.z === branch.z
      )
        continue;
      replacements.set(edge, {
        ...edge,
        waypoints: [
          branch,
          ...(edge.waypoints ?? []),
        ],
      });
    }
  }
  return replacements.size
    ? {
        ...graph,
        edges: graph.edges.map(
          (e) => replacements.get(e) ?? e,
        ),
      }
    : graph;
};

/** Keep shared routing junctions and port approach segments anchored in world space. */
export const simplifyWiring = (
  graph: Graph,
  selection: readonly string[],
  tolerance: number,
): Graph => {
  if (
    !Number.isFinite(tolerance) ||
    tolerance < 0
  )
    return graph;
  const selected = new Set(selection);
  const pointKey = (p: Point3) =>
    JSON.stringify([p.x, p.y, p.z]);
  const owners = new Map<string, number>();
  for (const edge of graph.edges)
    for (const key of new Set(
      edge.waypoints?.map(pointKey),
    ))
      owners.set(key, (owners.get(key) ?? 0) + 1);
  const edges = graph.edges.map((edge) => {
    const points = edge.waypoints;
    if (
      !points ||
      points.length < 3 ||
      (selected.size &&
        !selected.has(edge.source) &&
        !selected.has(edge.target))
    )
      return edge;
    const kept: Point3[] = [points[0]!];
    let start = 0;
    for (let i = 1; i < points.length; i++) {
      if (
        i !== points.length - 1 &&
        owners.get(pointKey(points[i]!)) === 1
      )
        continue;
      for (const point of simplifyTrace(
        points.slice(start, i + 1),
        tolerance,
      ).slice(1))
        kept.push(point);
      start = i;
    }
    return kept.length === points.length
      ? edge
      : { ...edge, waypoints: kept };
  });
  return edges.every(
    (edge, i) => edge === graph.edges[i],
  )
    ? graph
    : { ...graph, edges };
};

/** Route a wire on a constant world-Z plane, with risers at the named ports. */
export const routeOnPlane = (
  graph: Graph,
  edge: Edge,
  z: number,
): Result<Edge, string> => {
  if (!Number.isFinite(z))
    return err("有限の奥行きを指定してください");
  const from = graph.nodes.find(
      (n) => n.id === edge.source,
    ),
    to = graph.nodes.find(
      (n) => n.id === edge.target,
    );
  if (!from || !to)
    return err("端点のカードが見つかりません");
  const routed = wireGraph(
    graph.edges.includes(edge)
      ? graph
      : {
          ...graph,
          edges: [...graph.edges, edge],
        },
  ).find((w) => w.edge === edge);
  if (!routed)
    return err("Missing visible socket");
  const start = { ...routed.source, z },
    end = { ...routed.target, z };
  const waypoints: Point3[] = [];
  for (const point of [
    start,
    ...(edge.waypoints ?? []),
    end,
  ]) {
    const last = waypoints[waypoints.length - 1];
    if (
      !last ||
      last.x !== point.x ||
      last.y !== point.y
    )
      waypoints.push({
        x: point.x,
        y: point.y,
        z,
      });
  }
  return ok({ ...edge, waypoints });
};
