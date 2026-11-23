import { nodeSize } from "plgg-flow/nodeSize";
import { none, some, type Option } from "plgg";
import { visibleScene } from "plgg-flow/hierarchy";
import {
  projectLayer,
  projectedScale,
  type Point3,
} from "plgg-board";
import { edgeIndex } from "plgg-flow/connections";
import { islands } from "plgg-flow/analysis";
import type {
  Graph,
  Flow,
  FlowNode,
  Edge,
} from "./model";
export type Dimension = Readonly<{
  kind: "distance" | "angle";
  nodes: readonly string[];
}>;
export type Section = Readonly<{
  axis: keyof Point3;
  min: number;
  max: number;
}>;
export type SpatialView = Readonly<{
  axes?: boolean;
  overview?: boolean;
  depthColor?: boolean;
  section?: Section;
  dimensions?: readonly Dimension[];
  pivot?: string;
}>;
export const distance3 = (a: Point3, b: Point3) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** Select node centers inside a sphere in world coordinates, including its boundary. */
export const nodesInRadius = (
  graph: Graph,
  center: Point3,
  radius: number,
): readonly string[] => {
  if (!Number.isFinite(radius) || radius < 0)
    return [];
  return graph.nodes
    .filter(
      (n) =>
        distance3(n.position, center) <= radius,
    )
    .map((n) => n.id);
};
export const angle3 = (
  a: Point3,
  vertex: Point3,
  b: Point3,
): Option<number> => {
  const length =
    distance3(a, vertex) * distance3(b, vertex);
  if (!length) return none();
  const dot =
    (a.x - vertex.x) * (b.x - vertex.x) +
    (a.y - vertex.y) * (b.y - vertex.y) +
    (a.z - vertex.z) * (b.z - vertex.z);
  return some(
    (Math.acos(
      Math.max(-1, Math.min(1, dot / length)),
    ) *
      180) /
      Math.PI,
  );
};
export const sectionGraph = (
  graph: Graph,
  section?: Section,
): Graph => {
  if (!section) return graph;
  const nodes = graph.nodes.filter(
      (n) =>
        n.position[section.axis] >= section.min &&
        n.position[section.axis] <= section.max,
    ),
    ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    edges: graph.edges.filter(
      (e) =>
        ids.has(e.source) && ids.has(e.target),
    ),
  };
};
export const worldBounds = (
  graph: Graph,
  ids: readonly string[],
) => {
  const selected = new Set(ids),
    nodes = selected.size
      ? graph.nodes.filter((n) =>
          selected.has(n.id),
        )
      : graph.nodes;
  if (!nodes.length) return none();
  const min = {
      x: Infinity,
      y: Infinity,
      z: Infinity,
    },
    max = {
      x: -Infinity,
      y: -Infinity,
      z: -Infinity,
    };
  for (const n of nodes)
    for (const axis of [
      "x",
      "y",
      "z",
    ] satisfies (keyof Point3)[]) {
      min[axis] = Math.min(
        min[axis],
        n.position[axis],
      );
      max[axis] = Math.max(
        max[axis],
        n.position[axis],
      );
    }
  return some({ min, max });
};

/** Express all editable world geometry relative to a new origin. Camera
 * framing is controlled by the caller; node and edge references stay stable. */
export const rebaseOrigin = (
  flow: Flow,
  anchor: string,
): Flow => {
  const origin = flow.nodes.find(
    (n) => n.id === anchor,
  )?.position;
  if (
    !origin ||
    (!origin.x && !origin.y && !origin.z)
  )
    return flow;
  const shift = (p: Point3): Point3 => ({
    x: p.x - origin.x,
    y: p.y - origin.y,
    z: p.z - origin.z,
  });
  const edges = flow.edges.map((e) =>
    e.waypoints
      ? {
          ...e,
          waypoints: e.waypoints.map(shift),
        }
      : e,
  );
  const active = flow.activeEdge
    ? edges[
        edgeIndex(flow.edges, flow.activeEdge)
      ]
    : undefined;
  const section = flow.spatial?.section,
    bounds = flow.movement?.bounds;
  return {
    ...flow,
    nodes: flow.nodes.map((n) => ({
      ...n,
      position: shift(n.position),
    })),
    edges,
    ...(active ? { activeEdge: active } : {}),
    ...(section
      ? {
          spatial: {
            ...flow.spatial,
            section: {
              ...section,
              min:
                section.min -
                origin[section.axis],
              max:
                section.max -
                origin[section.axis],
            },
          },
        }
      : {}),
    ...(bounds
      ? {
          movement: {
            ...flow.movement,
            bounds: {
              min: shift(bounds.min),
              max: shift(bounds.max),
            },
          },
        }
      : {}),
    ...(flow.marks
      ? {
          marks: flow.marks.map((m) =>
            m.kind === "review"
              ? {
                  ...m,
                  position: shift(m.position),
                }
              : {
                  ...m,
                  points: m.points.map(shift),
                },
          ),
        }
      : {}),
  };
};

/** Prim's algorithm over the selected terminals, with existing connected
 * components admitted at zero cost, including paths through unselected nodes. */
export const proximityTree = (
  graph: Graph,
  ids: readonly string[],
): readonly Edge[] => {
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  const terminals = [...new Set(ids)].flatMap(
    (id) => {
      const n = byId.get(id);
      return n ? [n] : [];
    },
  );
  const first = terminals[0];
  if (!first) return [];
  const components = islands(graph),
    owner = new Map<string, number>();
  components.forEach((group, i) =>
    group.forEach((id) => owner.set(id, i)),
  );
  const pending = new Set(terminals),
    result: Edge[] = [];
  const best = new Map<
    string,
    { distance: number; source: string }
  >();
  let seed = first;
  while (pending.size) {
    const group = owner.get(seed.id);
    const admitted = terminals.filter(
      (n) =>
        pending.has(n) &&
        owner.get(n.id) === group,
    );
    for (const n of admitted) pending.delete(n);
    let shortest = Infinity,
      next: typeof first | undefined;
    for (const n of pending) {
      for (const source of admitted) {
        const distance = distance3(
          n.position,
          source.position,
        );
        if (
          distance <
          (best.get(n.id)?.distance ?? Infinity)
        )
          best.set(n.id, {
            distance,
            source: source.id,
          });
      }
      const candidate = best.get(n.id);
      if (
        candidate &&
        candidate.distance < shortest
      ) {
        shortest = candidate.distance;
        next = n;
      }
    }
    if (!next) break;
    const edge = best.get(next.id);
    if (!edge) break;
    result.push({
      source: edge.source,
      target: next.id,
    });
    seed = next;
  }
  return result;
};

/** Rank waypoint detours using node centers in world space, independently of camera and edge renderer. */
export const routeDetours = (graph: Graph) => {
  const points = new Map(
    graph.nodes.map((n) => [n.id, n.position]),
  );
  return graph.edges
    .flatMap((edge) => {
      const start = points.get(edge.source),
        end = points.get(edge.target);
      if (!start || !end) return [];
      let previous = start,
        length = 0;
      for (const point of edge.waypoints ?? []) {
        length += distance3(previous, point);
        previous = point;
      }
      length += distance3(previous, end);
      const direct = distance3(start, end);
      return [
        {
          edge,
          length,
          direct,
          extra: Math.max(0, length - direct),
        },
      ];
    })
    .sort((a, b) => b.extra - a.extra);
};

/** Pairwise screen-footprint overlap against cards drawn after the target. */
export const foregroundOverlaps = (
  flow: Flow,
  target: string,
) => {
  const visible = visibleScene(
    flow,
    flow.isolatedBranch,
  );
  const nodes = sectionGraph(
    { nodes: visible.nodes, edges: [] },
    flow.spatial?.section,
  ).nodes;
  const layers = projectLayer(
    flow.camera,
    (n: FlowNode) => n.position,
  )(nodes);
  const bounds = ({
    item,
    point,
  }: (typeof layers)[number]) => {
    const scale = projectedScale(
      flow.camera,
      point.z,
    );
    const w = nodeSize(item).width * scale,
      h = nodeSize(item).height * scale;
    return {
      left: point.x - w / 2,
      right: point.x + w / 2,
      top: point.y - h / 2,
      bottom: point.y + h / 2,
      area: w * h,
    };
  };
  const index = layers.findIndex(
      (p) => p.item.id === target,
    ),
    selected = layers[index];
  if (!selected) return [];
  const box = bounds(selected);
  return layers
    .slice(index + 1)
    .reverse()
    .flatMap((layer) => {
      const front = bounds(layer);
      const width =
          Math.min(box.right, front.right) -
          Math.max(box.left, front.left),
        height =
          Math.min(box.bottom, front.bottom) -
          Math.max(box.top, front.top);
      return width > 0 && height > 0
        ? [
            {
              id: layer.item.id,
              fraction: Math.min(
                1,
                (width * height) / box.area,
              ),
            },
          ]
        : [];
    });
};

/** Signed world-space offsets from the oriented plane through three card
 * centers. Normalize the two basis vectors before testing collinearity. */
export const sectionOffsets = (
  graph: Graph,
  anchors: readonly string[],
) => {
  if (anchors.length !== 3) return undefined;
  const [a, b, c] = anchors.map(
    (id) =>
      graph.nodes.find((n) => n.id === id)
        ?.position,
  );
  if (!a || !b || !c) return undefined;
  const direction = (p: Point3) => {
    const length = distance3(a, p);
    return length
      ? {
          x: (p.x - a.x) / length,
          y: (p.y - a.y) / length,
          z: (p.z - a.z) / length,
        }
      : undefined;
  };
  const u = direction(b),
    v = direction(c);
  if (!u || !v) return undefined;
  const x = u.y * v.z - u.z * v.y,
    y = u.z * v.x - u.x * v.z,
    z = u.x * v.y - u.y * v.x;
  const length = Math.hypot(x, y, z);
  if (length < 1e-12) return undefined;
  return {
    inclination:
      (Math.atan2(Math.hypot(x, y), Math.abs(z)) *
        180) /
      Math.PI,
    offsets: graph.nodes
      .filter((n) => !anchors.includes(n.id))
      .map((n) => ({
        id: n.id,
        distance:
          ((n.position.x - a.x) * x +
            (n.position.y - a.y) * y +
            (n.position.z - a.z) * z) /
          length,
      }))
      .sort(
        (a, b) =>
          Math.abs(b.distance) -
          Math.abs(a.distance),
      ),
  };
};
