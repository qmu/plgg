import {
  Option,
  SoftStr,
  Dict,
  none,
  isSome,
  pipe,
  fromNullable,
  mapOption,
  matchOption,
  chainOption,
} from "plgg";
import {
  Route,
  Method,
  Segment,
  splitPath,
  matchSegments,
} from "plgg-server/index";

/**
 * A route tagged with its registration index, so the compiled lookup can pick
 * the first-registered match across the static map and the dynamic list —
 * preserving the flat scan's registration-order semantics exactly.
 */
type IndexedRoute = Readonly<{
  route: Route;
  index: number;
}>;

/**
 * The lookup structure for a single HTTP method: an `O(1)` exact-match map for
 * fully-static patterns, plus an ordered list of `:param`/`*` routes walked in
 * registration order.
 */
type MethodTable = Readonly<{
  statics: ReadonlyMap<SoftStr, IndexedRoute>;
  dynamics: ReadonlyArray<IndexedRoute>;
}>;

/**
 * The compiled route table: routes indexed by method first, plus the original
 * flat list kept for the (cold) 404/405 path, which must report matches in
 * registration order.
 */
export type RouteTable = Readonly<{
  byMethod: ReadonlyMap<Method, MethodTable>;
  routes: ReadonlyArray<Route>;
}>;

/**
 * A resolved match: the chosen route and the path parameters captured for it.
 */
export type Matched = Readonly<{
  route: Route;
  params: Dict<string, SoftStr>;
}>;

/**
 * A route is fully static when every compiled segment is a literal — such
 * routes can be matched by an exact key lookup with no per-segment work.
 */
const isStaticRoute = (route: Route): boolean =>
  route.segments.every((s) => s.__tag === "Static");

/**
 * The exact-match key for a fully-static route: its literal segments joined.
 * Mirrors {@link pathKey} so a request path keys into the same slot.
 */
const staticRouteKey = (
  segments: ReadonlyArray<Segment>,
): SoftStr => segments.map((s) => s.content).join("/");

/**
 * The exact-match key for an incoming request path — the static parts joined,
 * matching how `matchSegments` compares `Static` segments against raw parts.
 */
const pathKey = (path: SoftStr): SoftStr =>
  splitPath(path).join("/");

/**
 * Builds a `[key, route]` tuple, typed so `new Map(...)` infers its entries
 * without an `as` assertion.
 */
const staticEntry = (
  ir: IndexedRoute,
): readonly [SoftStr, IndexedRoute] => [
  staticRouteKey(ir.route.segments),
  ir,
];

/**
 * Collects the static routes into key/route entries, keeping the
 * first-registered route per key (the flat scan's `find` also keeps the first).
 */
const staticEntries = (
  rs: ReadonlyArray<IndexedRoute>,
): ReadonlyArray<readonly [SoftStr, IndexedRoute]> =>
  rs
    .filter((ir) => isStaticRoute(ir.route))
    .reduce<
      ReadonlyArray<readonly [SoftStr, IndexedRoute]>
    >(
      (acc, ir) =>
        acc.some(
          ([k]) => k === staticRouteKey(ir.route.segments),
        )
          ? acc
          : [...acc, staticEntry(ir)],
      [],
    );

/**
 * Compiles the routes for one method into its {@link MethodTable}.
 */
const methodTable = (
  rs: ReadonlyArray<IndexedRoute>,
): MethodTable => ({
  statics: new Map(staticEntries(rs)),
  dynamics: rs.filter((ir) => !isStaticRoute(ir.route)),
});

/**
 * Builds a `[method, table]` tuple, typed for `new Map(...)`.
 */
const methodEntry = (
  m: Method,
  rs: ReadonlyArray<IndexedRoute>,
): readonly [Method, MethodTable] => [
  m,
  methodTable(rs),
];

/**
 * Distinct methods in first-registration order, so the cold 404/405 path's
 * method ordering stays stable.
 */
const methodsInOrder = (
  rs: ReadonlyArray<IndexedRoute>,
): ReadonlyArray<Method> =>
  rs.reduce<ReadonlyArray<Method>>(
    (acc, ir) =>
      acc.includes(ir.route.method)
        ? acc
        : [...acc, ir.route.method],
    [],
  );

/**
 * Pure build of the {@link RouteTable} from a flat route list.
 */
const buildTable = (
  routes: ReadonlyArray<Route>,
): RouteTable =>
  pipe(
    routes.map(
      (route, index): IndexedRoute => ({ route, index }),
    ),
    (indexed) => ({
      byMethod: new Map(
        methodsInOrder(indexed).map((m) =>
          methodEntry(
            m,
            indexed.filter(
              (ir) => ir.route.method === m,
            ),
          ),
        ),
      ),
      routes,
    }),
  );

/**
 * Memoizes the compiled table on the routes array's identity, so registrars
 * stay pure (compilation is a derivation) and a long-lived `Web` compiles once.
 */
const cache = new WeakMap<
  ReadonlyArray<Route>,
  RouteTable
>();

/**
 * Stores then returns the table — an expression-bodied cache write.
 */
const remember = (
  routes: ReadonlyArray<Route>,
  table: RouteTable,
): RouteTable => (cache.set(routes, table), table);

/**
 * Returns the compiled {@link RouteTable} for a route list, building it once.
 */
export const compileRoutes = (
  routes: ReadonlyArray<Route>,
): RouteTable =>
  pipe(
    fromNullable(cache.get(routes)),
    matchOption(
      () => remember(routes, buildTable(routes)),
      (table: RouteTable) => table,
    ),
  );

/**
 * A scored match: a {@link Matched} plus the registration index used to break
 * ties between a static and a dynamic hit.
 */
type Candidate = Readonly<{
  index: number;
  route: Route;
  params: Dict<string, SoftStr>;
}>;

/**
 * The static (exact-key) candidate for a path: captures no parameters.
 */
const staticCandidate = (
  table: MethodTable,
  path: SoftStr,
): Option<Candidate> =>
  pipe(
    fromNullable(table.statics.get(pathKey(path))),
    mapOption(
      (ir): Candidate => ({
        index: ir.index,
        route: ir.route,
        params: {},
      }),
    ),
  );

/**
 * The first dynamic candidate (registration order) whose segments match,
 * paired with its captured parameters.
 */
const dynamicCandidate = (
  table: MethodTable,
  path: SoftStr,
): Option<Candidate> =>
  table.dynamics.reduce<Option<Candidate>>(
    (acc, ir) =>
      isSome(acc)
        ? acc
        : pipe(
            matchSegments(ir.route.segments, path),
            mapOption(
              (params): Candidate => ({
                index: ir.index,
                route: ir.route,
                params,
              }),
            ),
          ),
    none(),
  );

/**
 * Picks the earlier-registered of two candidates, preserving the flat scan's
 * "first match in registration order wins" rule across static and dynamic.
 */
const pickEarlier = (
  a: Option<Candidate>,
  b: Option<Candidate>,
): Option<Candidate> =>
  isSome(a)
    ? isSome(b)
      ? a.content.index <= b.content.index
        ? a
        : b
      : a
    : b;

/**
 * Resolves a method + path against the compiled table to the route that the
 * flat scan would have chosen, with its captured parameters.
 */
export const lookupRoute = (
  table: RouteTable,
  method: Method,
  path: SoftStr,
): Option<Matched> =>
  pipe(
    fromNullable(table.byMethod.get(method)),
    chainOption((mt: MethodTable) =>
      pickEarlier(
        staticCandidate(mt, path),
        dynamicCandidate(mt, path),
      ),
    ),
    mapOption(
      (c): Matched => ({
        route: c.route,
        params: c.params,
      }),
    ),
  );
