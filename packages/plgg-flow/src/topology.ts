import { edgeIndex } from "plgg-flow/connections";
import type { Graph, Edge } from "./model";

export const adjacency = (graph: Graph) => {
  const incoming = new Map(
    graph.nodes.map((n) => [
      n.id,
      new Set<string>(),
    ]),
  );
  const outgoing = new Map(
    graph.nodes.map((n) => [
      n.id,
      new Set<string>(),
    ]),
  );
  for (const e of graph.edges)
    if (
      outgoing.has(e.source) &&
      incoming.has(e.target)
    ) {
      outgoing.get(e.source)?.add(e.target);
      incoming.get(e.target)?.add(e.source);
    }
  return { incoming, outgoing };
};
/** Iterative Kosaraju traversal avoids recursion on large imports. */
export const components = (
  graph: Graph,
): readonly string[][] => {
  const { incoming, outgoing } = adjacency(graph),
    seen = new Set<string>(),
    order: string[] = [];
  for (const root of outgoing.keys()) {
    if (seen.has(root)) continue;
    const stack = [{ id: root, exit: false }];
    while (stack.length) {
      const frame = stack.pop();
      if (!frame) break;
      if (frame.exit) {
        order.push(frame.id);
        continue;
      }
      if (seen.has(frame.id)) continue;
      seen.add(frame.id);
      stack.push({ ...frame, exit: true });
      for (const id of outgoing.get(frame.id) ??
        [])
        if (!seen.has(id))
          stack.push({ id, exit: false });
    }
  }
  const groups: string[][] = [];
  seen.clear();
  for (const root of order.reverse()) {
    if (seen.has(root)) continue;
    const group = [root];
    seen.add(root);
    for (const id of group)
      for (const parent of incoming.get(id) ?? [])
        if (!seen.has(parent)) {
          seen.add(parent);
          group.push(parent);
        }
    groups.push(group);
  }
  return groups;
};
export const dependencyLevels = (
  graph: Graph,
) => {
  const groups = components(graph),
    groupOf = new Map<string, number>(),
    levels = groups.map(() => 0);
  groups.forEach((group, i) =>
    group.forEach((id) => groupOf.set(id, i)),
  );
  const { outgoing } = adjacency(graph);
  for (const [i, group] of groups.entries())
    for (const id of group)
      for (const next of outgoing.get(id) ?? []) {
        const j = groupOf.get(next);
        if (j !== undefined && j !== i)
          levels[j] = Math.max(
            levels[j] ?? 0,
            (levels[i] ?? 0) + 1,
          );
      }
  return new Map(
    graph.nodes.map((n) => [
      n.id,
      levels[groupOf.get(n.id) ?? 0] ?? 0,
    ]),
  );
};
export const shortestPath = (
  graph: Graph,
  start: string,
  end: string,
): readonly string[] => {
  const { outgoing } = adjacency(graph);
  if (!outgoing.has(start) || !outgoing.has(end))
    return [];
  const prev = new Map<string, string>(),
    queue = [start];
  prev.set(start, start);
  for (const id of queue) {
    if (id === end) {
      const path = [id];
      let current = id;
      while (current !== start) {
        current = prev.get(current) ?? start;
        path.push(current);
      }
      return path.reverse();
    }
    for (const next of outgoing.get(id) ?? [])
      if (!prev.has(next)) {
        prev.set(next, id);
        queue.push(next);
      }
  }
  return [];
};

const traverse = (
  links: ReadonlyMap<string, ReadonlySet<string>>,
  root: string,
) => {
  const seen = new Set([root]);
  for (const id of seen)
    for (const next of links.get(id) ?? [])
      seen.add(next);
  return seen;
};

/** Nodes reachable from the start that can also reach the destination.
 * Feedback detours are included. No enumeration of individual walks. */
export const routeCorridor = (
  graph: Graph,
  start: string,
  end: string,
): readonly string[] => {
  const { incoming, outgoing } = adjacency(graph);
  if (!outgoing.has(start) || !incoming.has(end))
    return [];
  const forward = traverse(outgoing, start);
  if (!forward.has(end)) return [];
  const backward = traverse(incoming, end);
  return graph.nodes
    .filter(
      (n) =>
        forward.has(n.id) && backward.has(n.id),
    )
    .map((n) => n.id);
};

/** Lowest common upstream components in the directed dependency graph. */
export const commonOrigins = (
  graph: Graph,
  a: string,
  b: string,
): readonly string[] => {
  const { incoming } = adjacency(graph);
  if (!incoming.has(a) || !incoming.has(b))
    return [];
  const left = traverse(incoming, a),
    right = traverse(incoming, b);
  const common = new Set(
    [...left].filter((id) => right.has(id)),
  );
  if (!common.size) return [];
  const groupOf = new Map<string, number>();
  components(graph).forEach((group, i) =>
    group.forEach((id) => groupOf.set(id, i)),
  );
  const earlier = new Set<number>();
  for (const e of graph.edges) {
    if (
      !common.has(e.source) ||
      !common.has(e.target)
    )
      continue;
    const from = groupOf.get(e.source);
    if (
      from !== undefined &&
      from !== groupOf.get(e.target)
    )
      earlier.add(from);
  }
  return graph.nodes
    .filter(
      (n) =>
        common.has(n.id) &&
        !earlier.has(groupOf.get(n.id) ?? -1),
    )
    .map((n) => n.id);
};

/** Shortest directed replacement for a single wire, retaining concrete edge
 * identities so alternative ports and parallel wires can be inspected. */
export const alternativeWiring = (
  graph: Graph,
  wire: Edge,
): readonly Edge[] => {
  const index = edgeIndex(graph.edges, wire),
    removed = graph.edges[index];
  if (!removed) return [];
  const outgoing = new Map(
    graph.nodes.map((n) => [n.id, Array<Edge>()]),
  );
  graph.edges.forEach((e, i) => {
    if (i !== index && outgoing.has(e.target))
      outgoing.get(e.source)?.push(e);
  });
  const queue = [removed.source],
    seen = new Set(queue),
    previous = new Map<string, Edge>();
  for (const id of queue) {
    for (const edge of outgoing.get(id) ?? []) {
      if (edge.target === removed.target) {
        const path = [edge];
        let current = id;
        while (current !== removed.source) {
          const step = previous.get(current);
          if (!step) return [];
          path.push(step);
          current = step.source;
        }
        return path.reverse();
      }
      if (seen.has(edge.target)) continue;
      seen.add(edge.target);
      previous.set(edge.target, edge);
      queue.push(edge.target);
    }
  }
  return [];
};

/** Immediate dominators in reverse postorder. Store one parent per reachable
 * node, including for cyclic graphs with multiple entries into a component. */
export const mandatoryRoute = (
  graph: Graph,
  start: string,
  end: string,
): readonly string[] => {
  const { incoming, outgoing } = adjacency(graph);
  if (!outgoing.has(start) || !outgoing.has(end))
    return [];
  const seen = new Set<string>(),
    order: string[] = [];
  const stack = [{ id: start, exit: false }];
  while (stack.length) {
    const frame = stack.pop()!;
    if (frame.exit) {
      order.push(frame.id);
      continue;
    }
    if (seen.has(frame.id)) continue;
    seen.add(frame.id);
    stack.push({ ...frame, exit: true });
    for (const next of outgoing.get(frame.id)!)
      if (!seen.has(next))
        stack.push({ id: next, exit: false });
  }
  if (!seen.has(end)) return [];
  order.reverse();
  const rank = new Map(
    order.map((id, i) => [id, i]),
  );
  const parent = new Map([[start, start]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of order) {
      if (id === start) continue;
      let common: string | undefined;
      for (const pred of incoming.get(id)!) {
        if (!parent.has(pred)) continue;
        if (common === undefined) {
          common = pred;
          continue;
        }
        let other = pred;
        while (common !== other) {
          if (
            rank.get(common)! > rank.get(other)!
          )
            common = parent.get(common)!;
          else other = parent.get(other)!;
        }
      }
      if (
        common !== undefined &&
        common !== parent.get(id)
      ) {
        parent.set(id, common);
        changed = true;
      }
    }
  }
  const chain = [end];
  let id = end;
  while (id !== start) {
    id = parent.get(id)!;
    chain.push(id);
  }
  return chain.reverse();
};

/** A deterministic feedback arc set, not necessarily minimum. Dropping all
 * edges to active DFS ancestors makes the remaining directed graph acyclic. */
export const feedbackEdges = (
  graph: Graph,
): readonly Edge[] => {
  const outgoing = new Map(
    graph.nodes.map((n) => [n.id, [] as Edge[]]),
  );
  for (const edge of graph.edges)
    if (outgoing.has(edge.target))
      outgoing.get(edge.source)?.push(edge);
  const visited = new Set<string>(),
    active = new Set<string>(),
    result: Edge[] = [];
  for (const root of outgoing.keys()) {
    if (visited.has(root)) continue;
    const stack = [{ id: root, index: 0 }];
    visited.add(root);
    active.add(root);
    while (stack.length) {
      const frame = stack[stack.length - 1]!;
      const edge = outgoing.get(frame.id)![
        frame.index++
      ];
      if (!edge) {
        active.delete(frame.id);
        stack.pop();
        continue;
      }
      if (active.has(edge.target)) {
        result.push(edge);
        continue;
      }
      if (visited.has(edge.target)) continue;
      active.add(edge.target);
      visited.add(edge.target);
      stack.push({ id: edge.target, index: 0 });
    }
  }
  return result;
};

/** Minimum set of individual wires whose removal blocks all directed paths
 * from source to target. Each wire has unit capacity, including parallel wires. */
export const minimumWireCut = (
  graph: Graph,
  source: string,
  target: string,
): readonly Edge[] => {
  const index = new Map(
    graph.nodes.map((node, i) => [node.id, i]),
  );
  const start = index.get(source),
    end = index.get(target);
  if (
    start === undefined ||
    end === undefined ||
    start === end
  )
    return [];
  const outgoing = graph.nodes.map(
    () => [] as number[],
  );
  const arcs: {
    to: number;
    reverse: number;
    open: boolean;
  }[] = [];
  for (const edge of graph.edges) {
    const a = index.get(edge.source),
      b = index.get(edge.target);
    if (
      a === undefined ||
      b === undefined ||
      a === b
    )
      continue;
    const forward = arcs.length,
      reverse = forward + 1;
    outgoing[a]!.push(forward);
    outgoing[b]!.push(reverse);
    arcs.push(
      { to: b, reverse, open: true },
      { to: a, reverse: forward, open: false },
    );
  }
  for (;;) {
    const via = new Int32Array(index.size).fill(
      -1,
    );
    via[start] = -2;
    const queue = [start];
    for (
      let cursor = 0;
      cursor < queue.length && via[end] === -1;
      cursor++
    ) {
      for (const id of outgoing[
        queue[cursor]!
      ]!) {
        const arc = arcs[id]!;
        if (!arc.open || via[arc.to] !== -1)
          continue;
        via[arc.to] = id;
        queue.push(arc.to);
      }
    }
    if (via[end] === -1) {
      const reachable = new Set(
        queue.map((i) => graph.nodes[i]!.id),
      );
      return graph.edges.filter(
        (e) =>
          reachable.has(e.source) &&
          index.has(e.target) &&
          !reachable.has(e.target),
      );
    }
    let node = end;
    while (node !== start) {
      const arc = arcs[via[node]!]!,
        back = arcs[arc.reverse]!;
      arc.open = false;
      back.open = true;
      node = back.to;
    }
  }
};
