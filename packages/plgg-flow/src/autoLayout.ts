import type { Graph } from "./model";
import { nodeSize } from "plgg-flow/nodeSize";
import { components } from "plgg-flow/topology";
import { islands } from "plgg-flow/analysis";

export type LayerOptions = Readonly<{
  direction?: "right" | "down";
  depth?: boolean;
}>;
export type LayerPlan = Readonly<{
  graph: Graph;
  layers: ReadonlyMap<string, number>;
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

// Peel sources and sinks within each strongly connected component.
// Parallel edges each contribute one vote to the degree difference.
const feedbackOrder = (group: Vertex[]) => {
  const left: Vertex[] = [],
    right: Vertex[] = [];
  const remaining = new Set(group);
  while (remaining.size) {
    let choice = group[0]!,
      best = -Infinity,
      sink = false;
    for (const v of remaining) {
      const ins = v.incoming.filter((n) =>
        remaining.has(n),
      ).length;
      const outs = v.outgoing.filter((n) =>
        remaining.has(n),
      ).length;
      const score =
        !ins || !outs ? Infinity : outs - ins;
      if (score > best) {
        choice = v;
        best = score;
        sink = !outs && !!ins;
        if (best === Infinity) break;
      }
    }
    remaining.delete(choice);
    (sink ? right : left).push(choice);
  }
  return left.concat(right.reverse());
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
    offset += v.size / 2 + 40;
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
            (v.size + other.size) / 2 + 40;
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
      child.cross = end - box.left;
      end = child.cross + box.right + 40;
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
        end - 40 - centre,
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
) => {
  if (all.every((v) => v.incoming.length <= 1)) {
    placeTree(all);
    return;
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
    v.outgoing = core;
  }

  const rows: Vertex[][] = [];
  for (const v of group)
    (rows[v.layer] ??= []).push(v);
  // Replace each long arc with a private chain for ordering and alignment.
  for (const v of group) {
    const targets = v.outgoing.slice();
    v.outgoing = [];
    for (const target of targets) {
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
            ? 0
            : Math.min(v.size, target.size),
        );
        rows[l]!.push(dummy);
        link(prev, dummy);
        prev = dummy;
      }
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
        (s, v) => s + v.size + 40,
        -40,
      ) / 2;
    for (const v of row) {
      v.cross = x + v.size / 2;
      x += v.size + 40;
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
        (sum, v) => sum + v.size + 40,
        -40,
      ) /
        2;
    for (const v of row) {
      reserve([v], x + v.size / 2, occupied);
      x += v.size + 40;
    }
  }
};

export const planLayers = (
  graph: Graph,
  options: LayerOptions = {},
): LayerPlan => {
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
          down ? height : width,
          down ? width : height,
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
  const order = components(canonical).flatMap(
    (ids) =>
      feedbackOrder(
        ids
          .sort(compare)
          .map((id) => by.get(id)!),
      ),
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
  for (const e of edges) {
    const a = by.get(e.source)!,
      b = by.get(e.target)!;
    if (rank.get(a)! > rank.get(b)!) {
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
  for (const v of order.slice().reverse()) {
    const fixed = v.outgoing.filter(
      (n) => !pendant.has(n),
    );
    if (
      fixed.length &&
      fixed.length >= v.incoming.length
    )
      v.layer =
        Math.min(...fixed.map((n) => n.layer)) -
        1;
  }
  for (const leaf of pendant)
    leaf.layer = leaf.incoming[0]!.layer + 1;
  const widths: number[] = [];
  for (const v of order)
    widths[v.layer] = Math.max(
      widths[v.layer] ?? 0,
      v.main,
    );
  let length = -96;
  const centres = widths.map((w) => {
    length += 96 + w;
    return length - w / 2;
  });
  let cross = 0;
  for (const ids of [...islands(canonical)].sort(
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
    placeComponent(
      group,
      group.some((v) => cycles.has(v.id)),
    );
    const low = Math.min(
      ...group.map((v) => v.cross - v.size / 2),
    );
    const high = Math.max(
      ...group.map((v) => v.cross + v.size / 2),
    );
    for (const v of group) v.cross += cross - low;
    cross += high - low + 40;
  }
  return {
    graph: {
      ...graph,
      nodes: graph.nodes.map((n) => {
        const v = by.get(n.id)!,
          a = centres[v.layer]! - length / 2,
          b = v.cross - (cross - 40) / 2;
        return {
          ...n,
          position: {
            x: down ? b : a,
            y: down ? a : b,
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
