import {
  SoftStr,
  Option,
  some,
  none,
  pipe,
  matchOption,
} from "plgg";

/**
 * One directed edge of an assertion's relation graph,
 * from a source concept name to a target concept name.
 */
export type Edge = Readonly<{
  from: SoftStr;
  to: SoftStr;
}>;

/**
 * The target concepts directly reachable from `node`.
 */
const successors = (
  edges: ReadonlyArray<Edge>,
  node: SoftStr,
): ReadonlyArray<SoftStr> =>
  edges
    .filter((e) => e.from === node)
    .map((e) => e.to);

/**
 * Does `o` carry a value?
 */
const isFound = <A>(o: Option<A>): boolean =>
  pipe(
    o,
    matchOption(
      (): boolean => false,
      (): boolean => true,
    ),
  );

/**
 * The DFS carry: nodes fully explored (`done`) and the
 * first cycle found, if any.
 */
type Walk = Readonly<{
  done: ReadonlyArray<SoftStr>;
  cycle: Option<ReadonlyArray<SoftStr>>;
}>;

/**
 * Depth-first visit of `node` with the current recursion
 * `stack` (gray path). A successor already on the stack
 * closes a cycle (returned as the path from that node
 * back to it); a successor already `done` is skipped.
 * `node` joins `done` once its successors are explored.
 */
const visit = (
  node: SoftStr,
  stack: ReadonlyArray<SoftStr>,
  edges: ReadonlyArray<Edge>,
  done0: ReadonlyArray<SoftStr>,
): Walk =>
  pipe(
    successors(edges, node).reduce<Walk>(
      (w, nb) =>
        isFound(w.cycle)
          ? w
          : stack.includes(nb)
            ? {
                done: w.done,
                cycle: some([
                  ...stack.slice(
                    stack.indexOf(nb),
                  ),
                  nb,
                ]),
              }
            : w.done.includes(nb)
              ? w
              : visit(
                  nb,
                  [...stack, nb],
                  edges,
                  w.done,
                ),
      { done: done0, cycle: none() },
    ),
    (w: Walk): Walk =>
      isFound(w.cycle)
        ? w
        : {
            done: [...w.done, node],
            cycle: none(),
          },
  );

/**
 * The first directed cycle in the graph over `nodes`
 * with `edges`, as the sequence of concept names it
 * traverses (first node repeated at the end), or `None`
 * when the graph is acyclic (a DAG). Polynomial — plain
 * depth-first search, never a search over assignments.
 */
export const findCycle = (
  nodes: ReadonlyArray<SoftStr>,
  edges: ReadonlyArray<Edge>,
): Option<ReadonlyArray<SoftStr>> =>
  nodes.reduce<Walk>(
    (w, node) =>
      isFound(w.cycle)
        ? w
        : w.done.includes(node)
          ? w
          : visit(node, [node], edges, w.done),
    { done: [], cycle: none() },
  ).cycle;
