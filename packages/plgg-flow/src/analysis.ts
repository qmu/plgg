import { err, ok, type Result } from "plgg";
import { push, pop } from "plgg-flow/frontier";
import type { Graph, Edge } from "./model";
import { adjacency } from "plgg-flow/topology";

/** Undirected islands identify independent diagrams on a common board. */
export const islands = (
  graph: Graph,
): readonly string[][] => {
  const { incoming, outgoing } = adjacency(graph),
    seen = new Set<string>(),
    result: string[][] = [];
  for (const n of graph.nodes) {
    if (seen.has(n.id)) continue;
    const region = [n.id];
    seen.add(n.id);
    for (const id of region)
      for (const neighbors of [
        incoming.get(id),
        outgoing.get(id),
      ])
        for (const other of neighbors ?? [])
          if (!seen.has(other)) {
            seen.add(other);
            region.push(other);
          }
    result.push(region);
  }
  return result;
};
/** Cut vertices in the undirected projection, using an explicit DFS stack. */
const inspectCuts = (graph: Graph) => {
  const { incoming, outgoing } = adjacency(graph),
    discovered = new Map<string, number>(),
    low = new Map<string, number>(),
    parent = new Map<string, string>(),
    cuts = new Set<string>(),
    bridges = new Map<string, string>();
  let clock = 0;
  const frame = (id: string) => ({
    id,
    children: 0,
    neighbors: [
      ...new Set([
        ...(incoming.get(id) ?? []),
        ...(outgoing.get(id) ?? []),
      ]),
    ],
    next: 0,
  });
  for (const n of graph.nodes) {
    if (discovered.has(n.id)) continue;
    const stack = [frame(n.id)];
    discovered.set(n.id, ++clock);
    low.set(n.id, clock);
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (!top) break;
      const next = top.neighbors[top.next++];
      if (next !== undefined) {
        if (!discovered.has(next)) {
          parent.set(next, top.id);
          top.children++;
          discovered.set(next, ++clock);
          low.set(next, clock);
          stack.push(frame(next));
        } else if (parent.get(top.id) !== next)
          low.set(
            top.id,
            Math.min(
              low.get(top.id) ?? clock,
              discovered.get(next) ?? clock,
            ),
          );
        continue;
      }
      stack.pop();
      const prev = parent.get(top.id);
      if (prev === undefined) {
        if (top.children > 1) cuts.add(top.id);
        continue;
      }
      low.set(
        prev,
        Math.min(
          low.get(prev) ?? clock,
          low.get(top.id) ?? clock,
        ),
      );
      if (
        (low.get(top.id) ?? 0) >
        (discovered.get(prev) ?? 0)
      )
        bridges.set(top.id, prev);
      if (
        parent.has(prev) &&
        (low.get(top.id) ?? 0) >=
          (discovered.get(prev) ?? 0)
      )
        cuts.add(prev);
    }
  }
  return { cuts, bridges };
};
export const articulationNodes = (
  graph: Graph,
): readonly string[] => [
  ...inspectCuts(graph).cuts,
];
/** A parallel or reverse wire keeps its endpoints joined when one is removed. */
export const bridgeEdges = (graph: Graph) => {
  const { bridges } = inspectCuts(graph);
  const candidates = graph.edges.flatMap(
    (edge) => {
      const child =
        bridges.get(edge.source) === edge.target
          ? edge.source
          : bridges.get(edge.target) ===
              edge.source
            ? edge.target
            : undefined;
      return child === undefined
        ? []
        : [{ child, edge }];
    },
  );
  const counts = new Map<string, number>();
  for (const { child } of candidates)
    counts.set(
      child,
      (counts.get(child) ?? 0) + 1,
    );
  return candidates
    .filter(
      ({ child }) => counts.get(child) === 1,
    )
    .map(({ edge }) => edge);
};
export const topologicalOrder = (
  graph: Graph,
): Result<readonly string[], string> => {
  const a = adjacency(graph),
    pending = new Map(
      [...a.incoming].map(([id, set]) => [
        id,
        set.size,
      ]),
    ),
    queue = graph.nodes
      .filter((n) => !pending.get(n.id))
      .map((n) => n.id);
  for (const id of queue)
    for (const next of a.outgoing.get(id) ?? []) {
      const left = (pending.get(next) ?? 1) - 1;
      pending.set(next, left);
      if (!left) queue.push(next);
    }
  return queue.length === graph.nodes.length
    ? ok(queue)
    : err("有向閉路があります");
};
export type Timing = Readonly<{
  start: number;
  finish: number;
  slack: number;
}>;
export const criticalSchedule = (
  graph: Graph,
  duration: (id: string) => number,
): Result<
  {
    duration: number;
    tasks: ReadonlyMap<string, Timing>;
  },
  string
> => {
  const sorted = topologicalOrder(graph);
  if (sorted.__tag === "Err") return sorted;
  const a = adjacency(graph),
    finish = new Map<string, number>(),
    length = new Map<string, number>(),
    late = new Map<string, number>();
  let total = 0;
  for (const id of sorted.content) {
    const time = duration(id);
    if (!Number.isFinite(time) || time < 0)
      return err(
        "所要時間には非負の有限値が必要です",
      );
    length.set(id, time);
    let earliest = 0;
    for (const p of a.incoming.get(id) ?? [])
      earliest = Math.max(
        earliest,
        finish.get(p) ?? 0,
      );
    const end = earliest + time;
    finish.set(id, end);
    total = Math.max(total, end);
  }
  const tasks = new Map<string, Timing>();
  for (const id of [
    ...sorted.content,
  ].reverse()) {
    let deadline = total;
    for (const child of a.outgoing.get(id) ?? [])
      deadline = Math.min(
        deadline,
        late.get(child) ?? total,
      );
    const time = length.get(id) ?? 0,
      end = finish.get(id) ?? 0;
    late.set(id, deadline - time);
    tasks.set(id, {
      start: end - time,
      finish: end,
      slack: deadline - end,
    });
  }
  return ok({ duration: total, tasks });
};
/** Feedback witness, including self loops; returns an actual closed walk. */
export const cycleWitness = (
  graph: Graph,
): readonly string[] => {
  const { outgoing } = adjacency(graph),
    seen = new Set<string>(),
    active = new Map<string, number>();
  for (const n of graph.nodes) {
    if (seen.has(n.id)) continue;
    const make = (id: string) => ({
        id,
        neighbors: [...(outgoing.get(id) ?? [])],
        i: 0,
      }),
      stack = [make(n.id)];
    active.set(n.id, 0);
    seen.add(n.id);
    while (stack.length) {
      const top = stack[stack.length - 1];
      if (!top) break;
      const next = top.neighbors[top.i++];
      if (next === undefined) {
        stack.pop();
        active.delete(top.id);
        continue;
      }
      const index = active.get(next);
      if (index !== undefined)
        return [
          ...stack.slice(index).map((n) => n.id),
          next,
        ];
      if (!seen.has(next)) {
        seen.add(next);
        active.set(next, stack.length);
        stack.push(make(next));
      }
    }
  }
  return [];
};
/** Group by distance from a selected origin, across either direction. */
export const neighborhood = (
  graph: Graph,
  roots: readonly string[],
  radius: number,
  upstream = false,
): ReadonlySet<string> => {
  const a = adjacency(graph),
    links = upstream ? a.incoming : a.outgoing,
    seen = new Set(
      roots.filter((id) => links.has(id)),
    );
  let current = [...seen];
  for (
    let i = 0;
    i < radius && current.length;
    i++
  ) {
    const next: string[] = [];
    for (const id of current)
      for (const child of links.get(id) ?? [])
        if (!seen.has(child)) {
          seen.add(child);
          next.push(child);
        }
    current = next;
  }
  return seen;
};
/** Greedy vertex coloring ensures adjacent nodes belong to different classes. */
export const colorClasses = (
  graph: Graph,
): ReadonlyMap<string, number> => {
  const a = adjacency(graph),
    neighbors = new Map(
      graph.nodes.map((n) => [
        n.id,
        new Set([
          ...(a.incoming.get(n.id) ?? []),
          ...(a.outgoing.get(n.id) ?? []),
        ]),
      ]),
    ),
    colors = new Map<string, number>();
  const byDegree = [...neighbors].sort(
    ([, x], [, y]) => y.size - x.size,
  );
  for (const [id, others] of byDegree) {
    const used = new Set(
      [...others].map((other) =>
        colors.get(other),
      ),
    );
    let color = 0;
    while (used.has(color)) color++;
    colors.set(id, color);
  }
  return colors;
};

/** Minimum additive cost across directed wires. Missing costs default to one. */
export const cheapestRoute = (
  graph: Graph,
  start: string,
  end: string,
  key = "cost",
): Result<
  { edges: readonly Edge[]; cost: number },
  string
> => {
  const outgoing = new Map(
    graph.nodes.map((n) => [
      n.id,
      Array<{ edge: Edge; weight: number }>(),
    ]),
  );
  if (!outgoing.has(start) || !outgoing.has(end))
    return err("端点が見つかりません");
  for (const edge of graph.edges) {
    const weight =
      edge.data?.[key] === undefined
        ? 1
        : edge.data[key];
    if (
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight < 0
    )
      return err(
        "配線コストには 0 以上の有限数が必要です",
      );
    if (outgoing.has(edge.target))
      outgoing
        .get(edge.source)
        ?.push({ edge, weight });
  }
  const previous = new Map<string, Edge>(),
    costs = new Map([[start, 0]]),
    heap = [{ id: start, priority: 0 }];
  while (heap.length) {
    const current = pop(heap);
    if (
      !current ||
      current.priority !== costs.get(current.id)
    )
      continue;
    if (current.id === end) {
      const edges: Edge[] = [];
      let id = end;
      while (id !== start) {
        const edge = previous.get(id);
        if (!edge)
          return err("経路を復元できません");
        edges.push(edge);
        id = edge.source;
      }
      return ok({
        edges: edges.reverse(),
        cost: current.priority,
      });
    }
    for (const { edge, weight } of outgoing.get(
      current.id,
    ) ?? []) {
      const sum = current.priority + weight;
      if (
        sum >=
        (costs.get(edge.target) ?? Infinity)
      )
        continue;
      costs.set(edge.target, sum);
      previous.set(edge.target, edge);
      push(heap, {
        id: edge.target,
        priority: sum,
      });
    }
  }
  return err("終点へ到達できません");
};

/** Find sibling leaf processors with identical configuration and input wiring.
 * Results are review candidates; application-defined behavior may have side effects. */
export const repeatedProcessors = (
  graph: Graph,
): readonly string[][] => {
  const inputs = new Map<string, string[]>(),
    parents = new Set(
      graph.nodes.map((n) => n.parent),
    );
  const canonical = (
    _key: string,
    value: unknown,
  ): unknown => {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value)
    )
      return value;
    return Object.fromEntries(
      Object.entries(value).sort(([a], [b]) =>
        a < b ? -1 : a > b ? 1 : 0,
      ),
    );
  };
  for (const edge of graph.edges) {
    const list = inputs.get(edge.target) ?? [];
    list.push(
      JSON.stringify(
        [
          edge.source,
          edge.sourceHandle,
          edge.targetHandle,
          edge.type,
          edge.label,
          edge.data,
        ],
        canonical,
      ),
    );
    inputs.set(edge.target, list);
  }
  const buckets = new Map<string, string[]>();
  for (const node of graph.nodes) {
    const incoming = inputs.get(node.id);
    if (
      !incoming ||
      node.group ||
      parents.has(node.id)
    )
      continue;
    const ports = (node.ports ?? [])
      .map((p) => JSON.stringify(p, canonical))
      .sort();
    const key = JSON.stringify(
      [
        node.parent,
        node.type ?? "default",
        node.value,
        node.data ?? {},
        ports,
        incoming.sort(),
      ],
      canonical,
    );
    const group = buckets.get(key) ?? [];
    group.push(node.id);
    buckets.set(key, group);
  }
  return [...buckets.values()].filter(
    (ids) => ids.length > 1,
  );
};

/** Incomplete cards whose direct prerequisites have all finished. Treat an
 * unknown upstream ID as unfinished so partial imports cannot release work. */
export const readyCards = (
  graph: Graph,
  completed: Iterable<string>,
): readonly string[] => {
  const done = new Set(completed);
  const known = new Set(
    graph.nodes.map((n) => n.id),
  );
  const waiting = new Set<string>();
  for (const edge of graph.edges)
    if (
      !known.has(edge.source) ||
      !done.has(edge.source)
    )
      waiting.add(edge.target);
  return graph.nodes
    .filter(
      (n) =>
        !done.has(n.id) && !waiting.has(n.id),
    )
    .map((n) => n.id);
};

/** Build a feasible resource-limited schedule in dependency order. Undefined
 * owners share an unassigned pool. Slots are allocated only as tasks arrive. */
export const resourceSchedule = (
  graph: Graph,
  capacity: number,
): Result<
  readonly {
    id: string;
    owner: string | undefined;
    start: number;
    finish: number;
  }[],
  string
> => {
  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1
  )
    return err(
      "同時作業数は 1 以上の整数で指定してください",
    );
  const order = topologicalOrder(graph);
  if (order.__tag === "Err") return order;
  const { incoming } = adjacency(graph),
    nodes = new Map(
      graph.nodes.map((n) => [n.id, n]),
    );
  const pools = new Map<
      string | undefined,
      { priority: number }[]
    >(),
    ends = new Map<string, number>();
  const rows = [];
  for (const id of order.content) {
    const data = nodes.get(id)?.data,
      owner = data?.owner,
      duration = data?.duration ?? 1;
    if (
      owner !== undefined &&
      typeof owner !== "string"
    )
      return err(
        id +
          " の owner は文字列で指定してください",
      );
    if (
      typeof duration !== "number" ||
      !Number.isFinite(duration) ||
      duration < 0
    )
      return err(
        id +
          " の duration は 0 以上の数値で指定してください",
      );
    const pool = pools.get(owner) ?? [];
    let start =
      pool.length === capacity
        ? (pop(pool)?.priority ?? 0)
        : 0;
    for (const parent of incoming.get(id) ?? [])
      start = Math.max(
        start,
        ends.get(parent) ?? 0,
      );
    const finish = start + duration;
    if (!Number.isFinite(finish))
      return err(
        "終了時刻が数値の範囲を超えました",
      );
    push(pool, { priority: finish });
    pools.set(owner, pool);
    ends.set(id, finish);
    rows.push({ id, owner, start, finish });
  }
  return ok(
    rows.sort((a, b) => a.start - b.start),
  );
};
