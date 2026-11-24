import {
  classify,
  type Axis,
} from "plgg-flow/classify";
import { planSpace } from "plgg-flow/space";
import {
  roles,
  type View,
} from "plgg-flow/spaceView";
import type { Point, Point3 } from "plgg-board";
import type { Graph, FlowNode } from "./model";
import {
  grid,
  alignBox,
  nodeSize,
} from "plgg-flow/nodeSize";
import { islands } from "plgg-flow/analysis";

import { components } from "plgg-flow/topology";

export type LayerOptions = Readonly<{
  direction?: "right" | "down";
  depth?: boolean;
  layerAxis?: Axis;
}>;
export type LayerPlan = Readonly<{
  graph: Graph;
  layers: ReadonlyMap<string, number>;
  routes: ReadonlyMap<number, readonly Point[]>;
  reversed: readonly number[];
}>;

const compare = (a: string, b: string) =>
  a < b ? -1 : a > b ? 1 : 0;

type Vertex = {
  id: string;
  layer: number;
  size: number;
  main: number;
  incoming: Vertex[];
  outgoing: Vertex[];
  slot: number;
  cross: number;
};
const vertex = (
  id: string,
  main: number,
  size: number,
): Vertex => ({
  id,
  main,
  size,
  layer: 0,
  incoming: [],
  outgoing: [],
  slot: 0,
  cross: 0,
});
const link = (a: Vertex, b: Vertex) => {
  a.outgoing.push(b);
  b.incoming.push(a);
};

// SCCs already come in topological order. Within each distance
// tier, reverse postorder breaks only ties that close a cycle.
const flowOrder = (
  graph: Graph,
  by: ReadonlyMap<string, Vertex>,
  first?: Vertex,
) => {
  const roots = [...by.values()].filter(
    (v) => !v.incoming.length,
  );
  const depth = new Map<Vertex, number>();
  const measure = (queue: Vertex[]) => {
    for (const v of queue) depth.set(v, 0);
    for (const v of queue)
      for (const n of v.outgoing)
        if (!depth.has(n)) {
          depth.set(n, depth.get(v)! + 1);
          queue.push(n);
        }
  };
  measure(
    roots.length ? roots : first ? [first] : [],
  );
  return components(graph).flatMap((ids) => {
    const group = ids
      .sort(compare)
      .map((id) => by.get(id)!);
    if (!depth.has(group[0]!))
      measure([group[0]!]);
    const members = new Set(group);
    const seen = new Set<Vertex>();
    const order: Vertex[] = [];
    const visit = (v: Vertex) => {
      if (seen.has(v)) return;
      seen.add(v);
      for (const n of v.outgoing)
        if (
          members.has(n) &&
          depth.get(v) === depth.get(n)
        )
          visit(n);
      order.push(v);
    };
    group.forEach(visit);
    return order
      .reverse()
      .sort(
        (a, b) => depth.get(a)! - depth.get(b)!,
      );
  });
};

const mean = (
  ns: Vertex[],
  value: (v: Vertex) => number,
) =>
  ns.reduce((s, v) => s + value(v), 0) /
  ns.length;
const slot = (v: Vertex) => v.slot;
const indexSlots = (rows: Vertex[][]) =>
  rows.forEach((row) =>
    row.forEach((v, i) => {
      v.slot = i;
    }),
  );
const inversions = (a: Vertex[], b: Vertex[]) => {
  let count = 0;
  for (const u of a)
    for (const v of b)
      count += Math.sign(u.slot - v.slot);
  return count;
};
const orderRows = (rows: Vertex[][]) => {
  let best = rows.map((row) => row.slice()),
    cost = Infinity;
  for (
    let start = 0;
    start < 3 && cost;
    start++
  ) {
    for (const row of rows)
      row.sort(
        (a, b) =>
          compare(a.id, b.id) *
          (start === 1 ? -1 : 1),
      );
    indexSlots(rows);
    for (let pass = 0; pass < 8 && cost; pass++) {
      const back = (pass + start) % 2;
      for (const row of back
        ? rows.slice().reverse()
        : rows) {
        const keys = new Map(
          row.map((v) => {
            const ns = back
              ? v.outgoing
              : v.incoming;
            return [
              v,
              ns.length ? mean(ns, slot) : v.slot,
            ];
          }),
        );
        row.sort(
          (a, b) =>
            keys.get(a)! - keys.get(b)! ||
            a.slot - b.slot,
        );
        row.forEach((v, i) => {
          v.slot = i;
        });
        for (let i = 1; i < row.length; i++) {
          const a = row[i - 1]!,
            b = row[i]!;
          if (
            inversions(a.incoming, b.incoming) +
              inversions(a.outgoing, b.outgoing) >
            0
          ) {
            row[i - 1] = b;
            row[i] = a;
            b.slot = i - 1;
            a.slot = i;
          }
        }
      }
      let crossings = 0;
      for (const row of rows)
        for (const [i, a] of row.entries())
          for (let j = i + 1; j < row.length; j++)
            for (const u of a.outgoing)
              for (const v of row[j]!.outgoing)
                if (u.slot > v.slot) crossings++;
      if (crossings < cost) {
        cost = crossings;
        best = rows.map((row) => row.slice());
      }
    }
  }
  return best;
};

// Project desired centres onto the ordered row with minimum gaps.
// Pool adjacent violating intervals, favouring single-neighbour alignments.
const placeRow = (
  row: Vertex[],
  back: boolean,
) => {
  let offset = 0;
  const blocks: {
    start: number;
    end: number;
    sum: number;
    weight: number;
  }[] = [];
  for (const [i, v] of row.entries()) {
    const ns = back ? v.outgoing : v.incoming;
    offset += v.size / 2;
    const weight =
      ns.length === 1 &&
      (back ? ns[0]!.incoming : ns[0]!.outgoing)
        .length === 1
        ? 1000
        : 1;
    const target = ns.length
      ? (Math.min(...ns.map((n) => n.cross)) +
          Math.max(...ns.map((n) => n.cross))) /
        2
      : v.cross;
    v.cross = offset;
    let block = {
      start: i,
      end: i,
      sum: (target - offset) * weight,
      weight,
    };
    while (blocks.length) {
      const last = blocks[blocks.length - 1]!;
      if (
        last.sum / last.weight <=
        block.sum / block.weight
      )
        break;
      blocks.pop();
      block = {
        ...block,
        start: last.start,
        sum: block.sum + last.sum,
        weight: block.weight + last.weight,
      };
    }
    blocks.push(block);
    offset += v.size / 2 + 2 * grid;
  }
  for (const b of blocks)
    for (let i = b.start; i <= b.end; i++)
      row[i]!.cross += b.sum / b.weight;
};

// Reserve a common free interval on every layer traversed by a chain.
const reserve = (
  block: Vertex[],
  target: number,
  occupied: Map<number, Vertex[]>,
) => {
  const intervals = block
    .flatMap((v) =>
      (occupied.get(v.layer) ?? []).map(
        (other) => {
          const gap =
            (v.size + other.size) / 2 + 2 * grid;
          return [
            other.cross - gap,
            other.cross + gap,
          ] satisfies [number, number];
        },
      ),
    )
    .sort((a, b) => a[0] - b[0]);
  let left = -Infinity,
    right = -Infinity;
  for (const [a, b] of intervals) {
    if (a >= right) {
      if (left < target && target < right) break;
      left = a;
    }
    right = Math.max(right, b);
  }
  const x =
    left < target && target < right
      ? target - left < right - target
        ? left
        : right
      : target;
  for (const v of block) {
    v.cross = x;
    const row = occupied.get(v.layer) ?? [];
    row.push(v);
    occupied.set(v.layer, row);
  }
};

// In an outward tree, allocate sibling subtrees disjoint spans.
// A deeper single-child tail keeps its parent's cross coordinate.
const placeTree = (group: Vertex[]) => {
  const bounds = new Map<
    Vertex,
    { left: number; right: number }
  >();
  const ordered = group
    .slice()
    .sort((a, b) => a.layer - b.layer);
  for (const v of ordered.slice().reverse()) {
    let end = 0;
    for (const child of v.outgoing) {
      const box = bounds.get(child)!;
      child.cross = squareUp(end - box.left);
      // Keep the midpoint of the extreme siblings on the parent grid.
      if (
        child ===
          v.outgoing[v.outgoing.length - 1] &&
        (child.cross - v.outgoing[0]!.cross) %
          (2 * grid)
      )
        child.cross += grid;
      end = child.cross + box.right + 2 * grid;
    }
    const centre =
      ((v.outgoing[0]?.cross ?? 0) +
        (v.outgoing[v.outgoing.length - 1]
          ?.cross ?? 0)) /
      2;
    for (const child of v.outgoing)
      child.cross -= centre;
    bounds.set(v, {
      left: Math.min(-v.size / 2, -centre),
      right: Math.max(
        v.size / 2,
        end - 2 * grid - centre,
      ),
    });
  }
  for (const v of ordered)
    for (const child of v.outgoing)
      child.cross += v.cross;
};

const placeComponent = (
  all: Vertex[],
  cyclic: boolean,
  mainLine: ReadonlyMap<Vertex, Vertex>,
) => {
  if (all.every((v) => v.incoming.length <= 1)) {
    placeTree(all);
    return [];
  }
  // Remove pendant sinks before crossing minimisation. Their single arc
  // can be placed beside its parent without reordering the core.
  const leaves = all.filter(
    (v) =>
      !v.outgoing.length &&
      v.incoming.length === 1,
  );
  const detached = new Set(leaves);
  const group = all.filter(
    (v) => !detached.has(v),
  );
  const chains = new Map<Vertex, Vertex>();
  for (const v of group) {
    const core = v.outgoing.filter(
      (n) => !detached.has(n),
    );
    const candidates = core.length
      ? core
      : v.outgoing;
    if (candidates.length === 1) {
      const n = candidates[0]!;
      if (
        n.layer === v.layer + 1 &&
        n.incoming.length === 1
      )
        chains.set(v, n);
    }
    const next = mainLine.get(v);
    if (next && next.layer === v.layer + 1)
      chains.set(v, next);
    v.outgoing = core;
  }

  const routes: {
    source: Vertex;
    target: Vertex;
    chain: Vertex[];
  }[] = [];
  const rows: Vertex[][] = [];
  for (const v of group)
    (rows[v.layer] ??= []).push(v);
  // Replace each long arc with a private chain for ordering and alignment.
  for (const v of group) {
    const targets = v.outgoing.slice();
    v.outgoing = [];
    for (const target of targets) {
      const chain: Vertex[] = [];
      let prev = v;
      for (
        let l = v.layer + 1;
        l < target.layer;
        l++
      ) {
        const dummy = vertex(
          JSON.stringify([v.id, target.id, l]),
          0,
          cyclic
            ? 2 * grid
            : Math.min(v.size, target.size),
        );
        dummy.layer = l;
        chain.push(dummy);
        rows[l]!.push(dummy);
        link(prev, dummy);
        prev = dummy;
      }
      if (chain.length)
        routes.push({ source: v, target, chain });
      prev.outgoing.push(target);
      const i = target.incoming.indexOf(v);
      target.incoming[i] = prev;
    }
  }
  const ordered = orderRows(
    Array.from(rows, (row) => row ?? []),
  );
  for (const row of ordered) {
    let x =
      -row.reduce(
        (s, v) => s + v.size + 2 * grid,
        -2 * grid,
      ) / 2;
    for (const v of row) {
      v.cross = x + v.size / 2;
      x += v.size + 2 * grid;
    }
  }
  for (let pass = 0; pass < 8; pass++) {
    const back = pass % 2 === 1;
    for (const row of back
      ? ordered.slice().reverse()
      : ordered)
      placeRow(row, back);
  }
  const occupied = new Map<number, Vertex[]>();
  const interior = new Set(chains.values());
  const blocks = group
    .filter((v) => !interior.has(v))
    .map((v) => {
      const block = [v];
      for (const current of block) {
        const next = chains.get(current);
        if (next) block.push(next);
      }
      return block;
    });
  // Long chains have fewer placement choices than individual nodes.
  blocks.sort((a, b) => b.length - a.length);
  const spine =
    new Set(group.map((v) => v.layer)).size ===
    group.length;
  for (const block of blocks)
    reserve(
      block,
      spine
        ? 0
        : mean(
            block.filter((v) => !detached.has(v)),
            (v) => v.cross,
          ),
      occupied,
    );
  const siblings = new Map<Vertex, Vertex[]>();
  for (const v of leaves.filter(
    (n) => !interior.has(n),
  )) {
    const parent = v.incoming[0]!;
    const row = siblings.get(parent) ?? [];
    row.push(v);
    siblings.set(parent, row);
  }
  for (const [parent, row] of [...siblings].sort(
    ([a], [b]) =>
      a.outgoing.length - b.outgoing.length ||
      compare(a.id, b.id),
  )) {
    let x =
      parent.cross -
      row.reduce(
        (sum, v) => sum + v.size + 2 * grid,
        -2 * grid,
      ) /
        2;
    for (const v of row) {
      reserve([v], x + v.size / 2, occupied);
      x += v.size + 2 * grid;
    }
  }
  for (const { chain } of routes)
    for (const v of chain)
      reserve([v], v.cross, occupied);
  return routes;
};

// Measure the core layers before deciding whether the peripheral fans
// need another row. A hub with leaves on both sides has a one-node core.
const wrappedPositions = (
  group: readonly Vertex[],
  neighbours: ReadonlyMap<
    Vertex,
    readonly Vertex[]
  >,
) => {
  const rows = new Map<number, Vertex[]>();
  for (const v of group) {
    const row = rows.get(v.layer) ?? [];
    row.push(v);
    rows.set(v.layer, row);
  }
  const span = (row: Vertex[]) =>
    row.reduce(
      (sum, v) => sum + v.size + 2 * grid,
      -2 * grid,
    );
  const core = [...rows.values()]
    .map((row) =>
      row.filter(
        (v) => neighbours.get(v)!.length > 1,
      ),
    )
    .filter((row) => row.length)
    .map(span)
    .sort((a, b) => a - b);
  const median =
    core[Math.floor(core.length / 2)] ?? Infinity;
  const positions = new Map<
    Vertex,
    { layer: number; cross: number }
  >();
  let inserted = 0;
  for (const [, row] of [...rows].sort(
    ([a], [b]) => a - b,
  )) {
    const hub = neighbours
      .get(row[0]!)!
      .find(
        (peer) =>
          neighbours.get(peer)!.length >=
          row.length,
      );
    if (
      !hub ||
      row.length < 6 ||
      span(row) <= 3 * median ||
      !row.every((v) => {
        const ns = neighbours.get(v)!;
        return (
          ns.includes(hub) &&
          ns.every(
            (peer) =>
              peer === hub ||
              neighbours.get(peer)?.length === 1,
          )
        );
      })
    ) {
      if (inserted)
        for (const v of row)
          positions.set(v, {
            layer: v.layer + inserted,
            cross: v.cross,
          });
      continue;
    }
    const inputs = !row[0]!.incoming.length;
    row.sort((a, b) => a.cross - b.cross);
    const count = Math.ceil(row.length / 2);
    const wing = Math.floor(
      (row.length - count) / 2,
    );
    const far = row.slice(wing, wing + count);
    const near = [
      ...row.slice(0, wing),
      ...row.slice(wing + count),
    ];
    // Leave a central opening in the near row for the distant fan.
    const opening = Math.max(
      0,
      span(far) -
        Math.min(...far.map((v) => v.size)),
    );
    for (const half of [far, near]) {
      const extra = half === near ? opening : 0;
      let cross =
        hub.cross - (span(half) + extra) / 2;
      for (const [i, v] of half.entries()) {
        if (i === wing) cross += extra;
        positions.set(v, {
          layer:
            v.layer +
            inserted +
            Number((half === far) !== inputs),
          cross: cross + v.size / 2,
        });
        cross += v.size + 2 * grid;
      }
    }
    inserted++;
  }
  return positions;
};

export const planLayers = (
  graph: Graph,
  options: LayerOptions = {},
): LayerPlan => {
  if (options.layerAxis) {
    if (options.depth)
      throw new Error(
        "depth and layerAxis cannot be combined",
      );
    const placed = planRooms(graph, {
      y: options.layerAxis,
    });
    return {
      graph: placed.graph,
      layers: new Map(
        placed.graph.nodes.map((n) => [
          n.id,
          roomFor(placed, n)!.index[1],
        ]),
      ),
      routes: new Map(),
      reversed: [],
    };
  }

  const down = options.direction === "down";
  const nodes = graph.nodes
    .slice()
    .sort((a, b) => compare(a.id, b.id));
  const by = new Map(
    nodes.map((n) => {
      const { width, height } = nodeSize(n);
      return [
        n.id,
        vertex(
          n.id,
          squareUp(down ? height : width),
          squareUp(down ? width : height),
        ),
      ];
    }),
  );
  const edges = graph.edges
    .map((e, i) => ({ ...e, i }))
    .filter(
      (e) =>
        e.source !== e.target &&
        by.has(e.source) &&
        by.has(e.target),
    )
    .sort(
      (a, b) =>
        compare(a.source, b.source) ||
        compare(a.target, b.target),
    );
  const canonical = { nodes, edges };
  for (const e of edges)
    link(by.get(e.source)!, by.get(e.target)!);
  const mainLine = new Map<Vertex, Vertex>();
  for (const v of by.values()) {
    const next = v.outgoing[0];
    if (
      next &&
      new Set(v.outgoing).size === 1 &&
      new Set(next.incoming).size === 1
    )
      mainLine.set(v, next);
  }
  const order = flowOrder(
    canonical,
    by,
    by.get(graph.nodes[0]?.id ?? ""),
  );
  const rank = new Map(
    order.map((v, i) => [v, i]),
  );
  for (const v of order) {
    v.incoming = [];
    v.outgoing = [];
  }
  const reversed: number[] = [];
  const cycles = new Set<string>();
  const indices = new Map<string, number[]>();
  for (const e of edges) {
    const a = by.get(e.source)!,
      b = by.get(e.target)!;
    const back = rank.get(a)! > rank.get(b)!;
    const key = JSON.stringify(
      back ? [b.id, a.id] : [a.id, b.id],
    );
    const list = indices.get(key) ?? [];
    list.push(e.i);
    indices.set(key, list);
    if (back) {
      reversed.push(e.i);
      cycles.add(e.source);
      link(b, a);
    } else link(a, b);
  }
  for (const v of order)
    for (const n of v.outgoing)
      n.layer = Math.max(n.layer, v.layer + 1);
  // Pendant sinks can follow their parent at unit span wherever it lands.
  const pendant = new Set(
    order.filter(
      (v) =>
        !v.outgoing.length &&
        v.incoming.length === 1,
    ),
  );
  const groups = [...islands(canonical)];
  const cyclicNodes = new Set(
    groups
      .filter((ids) =>
        ids.some((id) => cycles.has(id)),
      )
      .flat(),
  );
  for (const v of order.slice().reverse()) {
    const fixed = v.outgoing.filter(
      (n) => !pendant.has(n),
    );
    if (
      fixed.length &&
      (fixed.length > v.incoming.length ||
        (!cyclicNodes.has(v.id) &&
          fixed.length === v.incoming.length))
    )
      v.layer =
        Math.min(...fixed.map((n) => n.layer)) -
        1;
  }
  for (const leaf of pendant)
    leaf.layer = leaf.incoming[0]!.layer + 1;
  let cross = 0;
  const virtual = new Map<number, Vertex[]>();
  let gap = 6 * grid;
  for (const ids of groups.sort(
    (a, b) =>
      b.length - a.length ||
      b.reduce(
        (s, id) =>
          s + by.get(id)!.incoming.length,
        0,
      ) -
        a.reduce(
          (s, id) =>
            s + by.get(id)!.incoming.length,
          0,
        ),
  )) {
    const group = ids
      .sort(compare)
      .map((id) => by.get(id)!);
    const neighbours = new Map(
      group.map((v) => [
        v,
        [...v.incoming, ...v.outgoing],
      ]),
    );
    const returns = group.filter((v) =>
      cycles.has(v.id),
    ).length;
    const tree = group.every(
      (v) => v.incoming.length <= 1,
    );
    const routes = placeComponent(
      group,
      returns > 0,
      mainLine,
    );
    for (const {
      source,
      target,
      chain,
    } of routes) {
      const i = indices
        .get(
          JSON.stringify([source.id, target.id]),
        )!
        .shift()!;
      virtual.set(i, chain);
    }
    const positions = wrappedPositions(
      group,
      neighbours,
    );
    const wrappedLayers = new Map<
      number,
      number
    >();
    for (const [v, position] of positions)
      wrappedLayers.set(
        v.layer,
        Math.min(
          wrappedLayers.get(v.layer) ?? Infinity,
          position.layer,
        ),
      );
    for (const [v, position] of positions)
      Object.assign(v, position);
    const wrapped = positions.size > 0;
    if (wrapped) {
      const occupied = new Map<
        number,
        Vertex[]
      >();
      for (const v of group) {
        const row = occupied.get(v.layer) ?? [];
        row.push(v);
        occupied.set(v.layer, row);
      }
      for (const { chain } of routes)
        for (const v of chain) {
          v.layer =
            wrappedLayers.get(v.layer) ?? v.layer;
          reserve([v], v.cross, occupied);
        }
    }
    if (returns)
      gap = Math.max(
        gap,
        ...group.map(
          // room for a return wire to turn, not two node widths
          (v) => 2 * v.main + 4 * grid,
        ),
      );
    if (tree || wrapped) {
      for (const v of group)
        for (const peer of neighbours.get(v)!) {
          const slope =
            Math.abs(v.cross - peer.cross) /
            Math.abs(v.layer - peer.layer);
          gap = Math.max(
            gap,
            squareUp(
              wrapped
                ? 0.6 * slope + v.main
                : 0.4 * slope,
            ),
          );
        }
    }
    const low = Math.min(
      ...group.map((v) => v.cross - v.size / 2),
    );
    const high = Math.max(
      ...group.map((v) => v.cross + v.size / 2),
    );
    for (const { chain } of routes) {
      for (const v of chain)
        v.cross += cross - low;
    }
    for (const v of group) v.cross += cross - low;
    cross += high - low + 2 * grid;
  }
  const widths: number[] = [];
  for (const v of order)
    widths[v.layer] = Math.max(
      widths[v.layer] ?? 0,
      v.main,
    );
  let length = -gap;
  const centres = widths.map((w) => {
    length += gap + w;
    return length - w / 2;
  });
  const routes = new Map<number, Point[]>();
  const feedback = new Set(reversed);
  for (const [i, chain] of virtual) {
    if (!chain.length) continue;
    const via = chain.map((v) => {
      const main = centres[v.layer]! - length / 2;
      const side =
        v.cross - (cross - 2 * grid) / 2;
      return down
        ? { x: side, y: main }
        : { x: main, y: side };
    });
    routes.set(
      i,
      feedback.has(i) ? via.reverse() : via,
    );
  }
  return {
    routes,
    graph: {
      ...graph,
      edges: graph.edges.map(
        (
          { via: oldVia, lift: oldLift, ...edge },
          i,
        ) => {
          const via = routes.get(i);
          return {
            ...edge,
            ...(via && { via }),
            ...(options.depth &&
              feedback.has(i) && { lift: 24 }),
          };
        },
      ),
      nodes: graph.nodes.map((n) => {
        const v = by.get(n.id)!,
          a = centres[v.layer]! - length / 2,
          b = v.cross - (cross - 2 * grid) / 2;
        const size = nodeSize(n);
        const aligned = (
          centre: number,
          extent: number,
        ) => {
          const top = alignBox(centre, extent);
          return centre < 0 &&
            top - centre === grid / 2
            ? top - grid
            : top;
        };
        return {
          ...n,
          position: {
            x: down
              ? aligned(b, size.width)
              : alignBox(a, size.width),
            y: down
              ? alignBox(a, size.height)
              : aligned(b, size.height),
            z: options.depth ? v.layer * 48 : 0,
          },
        };
      }),
    },
    layers: new Map(
      order.map((v) => [v.id, v.layer]),
    ),
    reversed: reversed.sort((a, b) => a - b),
  };
};
export const layeredLayout = (
  graph: Graph,
  options?: LayerOptions,
): Graph => planLayers(graph, options).graph;

export type Direction = "x" | "y" | "z";
export * from "plgg-flow/classify";
export * from "plgg-flow/spaceView";
export * from "plgg-flow/bestViews";
export * from "plgg-flow/space";
export type RoomAxes = Readonly<
  Record<string, Axis & { pin?: string }>
>;
export type Room = {
  occupied: boolean;
  members: readonly string[];
  block: number;
  caption: string;
  blockAddress?: { row: string; column: string };
  index: [number, number, number];
  values: [string, string, string];
  min: Point3;
  max: Point3;
};
export type RoomLayout = {
  axes: RoomAxes;
  rooms: Room[];
};
const memberships = new WeakMap<
  RoomLayout,
  Map<string, Room>
>();
export const roomFor = (
  layout: RoomLayout,
  node: FlowNode,
) => {
  let members = memberships.get(layout);
  if (!members) {
    members = new Map();
    for (const r of layout.rooms)
      for (const id of r.members)
        members.set(id, r);
    memberships.set(layout, members);
  }
  return members.get(node.id);
};
const squareUp = (n: number) =>
  Math.ceil(n / grid) * grid;
const computeRooms = (
  graph: Graph,
  axes: RoomAxes,
) => {
  const data = classify(
    graph,
    Object.values(axes),
  );
  const pins: Record<string, string> = {};
  const view: View = { pins };
  for (const [key, a] of Object.entries(axes)) {
    const role = roles.find((r) => r === key);
    if (role) view[role] = a.attribute;
    else
      pins[a.attribute] =
        a.pin ??
        data.axes.find(
          (d) => d.attribute === a.attribute,
        )!.values[0]!;
  }
  const space = planSpace(data, view);
  const rooms = space.blocks.flatMap((b, block) =>
    b.cells.map((c) => {
      return {
        block,
        blockAddress: b.address,
        caption: [
          ...(view.column
            ? [b.address.column]
            : []),
          ...(view.row ? [b.address.row] : []),
        ].join(" / "),
        members: c.nodes.map((n) => n.id),
        occupied: !!c.nodes.length,
        index: c.index,
        values: c.values,
        min: c.min,
        max: c.max,
      };
    }),
  );
  const layout = { axes, rooms };
  return {
    ...layout,
    graph: {
      edges: graph.edges.map((e, i) => {
        const path = space.routes.get(e.id ?? i);
        if (path) return { ...e, path };
        const { path: previous, ...rest } = e;
        return previous ? rest : e;
      }),
      nodes: graph.nodes.map((n) => {
        const p = space.place(n);
        const cell = roomFor(layout, n);
        const size = nodeSize(n);
        return p && cell
          ? {
              ...n,
              position: p,
              within: {
                min: {
                  x: cell.min.x + size.width / 2,
                  y: p.y,
                  z: cell.min.z + 18,
                },
                max: {
                  x: cell.max.x - size.width / 2,
                  y: p.y,
                  z: cell.max.z - 18,
                },
              },
            }
          : n;
      }),
    },
  };
};
const roomPlans = new WeakMap<
  Graph["nodes"],
  {
    edges: Graph["edges"];
    plan: ReturnType<typeof computeRooms>;
  }
>();
export const planRooms = (
  graph: Graph,
  axes: RoomAxes,
) => {
  const known = roomPlans.get(graph.nodes);
  if (
    known?.edges === graph.edges &&
    known.plan.axes === axes
  )
    return known.plan;
  const plan = computeRooms(graph, axes);
  roomPlans.set(graph.nodes, {
    edges: graph.edges,
    plan,
  });
  return plan;
};
