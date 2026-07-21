import {
  SoftStr,
  Option,
  some,
  none,
  pipe,
  matchOption,
} from "plgg";
import { Relation } from "plgg-ir-thesis";

/**
 * A derivation path through an assertion's relation
 * graph: the `start` concept and the ordered `edges`
 * (relations) that carry it to the goal. Rendered as
 * `start →name→ to →name→ …` for a counterexample trace.
 */
export type Path = Readonly<{
  start: SoftStr;
  edges: ReadonlyArray<Relation>;
}>;

/**
 * Does `o` carry a value? (The reduce short-circuit
 * predicate, mirroring `graph.ts`.)
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
 * The relations leaving `node` whose target has not yet
 * been visited on this path.
 */
const outgoing = (
  relations: ReadonlyArray<Relation>,
  node: SoftStr,
  visited: ReadonlyArray<SoftStr>,
): ReadonlyArray<Relation> =>
  relations.filter(
    (r) =>
      r.from === node && !visited.includes(r.to),
  );

/**
 * Depth-first search from `node` to `goal` over
 * `relations`, returning the ordered edges of the first
 * path found (empty when `node` already is `goal`), or
 * `None` when the goal is unreachable. `visited` is the
 * set of concepts already on the current path, so the
 * walk is acyclic and terminates on any finite graph.
 */
const walk = (
  relations: ReadonlyArray<Relation>,
  node: SoftStr,
  goal: SoftStr,
  visited: ReadonlyArray<SoftStr>,
): Option<ReadonlyArray<Relation>> =>
  node === goal
    ? some([])
    : outgoing(
        relations,
        node,
        visited,
      ).reduce<Option<ReadonlyArray<Relation>>>(
        (acc, r) =>
          isFound(acc)
            ? acc
            : pipe(
                walk(
                  relations,
                  r.to,
                  goal,
                  [...visited, r.to],
                ),
                matchOption(
                  (): Option<
                    ReadonlyArray<Relation>
                  > => none(),
                  (rest) => some([r, ...rest]),
                ),
              ),
        none(),
      );

/**
 * The first {@link Path} from any concept in `starts` to
 * `goal` over `relations`, or `None` when none reaches
 * it. Pure depth-first reachability — never a search over
 * assignments — so it stays polynomial (the metamodel's
 * model-checking discipline).
 */
export const findPath = (
  relations: ReadonlyArray<Relation>,
  starts: ReadonlyArray<SoftStr>,
  goal: SoftStr,
): Option<Path> =>
  starts.reduce<Option<Path>>(
    (acc, start) =>
      isFound(acc)
        ? acc
        : pipe(
            walk(relations, start, goal, [start]),
            matchOption(
              (): Option<Path> => none(),
              (edges) => some({ start, edges }),
            ),
          ),
    none(),
  );

/**
 * Renders a {@link Path} as the counterexample trace
 * `start →name→ to →name→ …` (just the concept name when
 * the path has no edges).
 */
export const renderPath = (path: Path): string =>
  path.edges.reduce(
    (acc, r) => `${acc} →${r.name}→ ${r.to}`,
    `${path.start}`,
  );
