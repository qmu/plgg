/**
 * plgg-router example — the pure client-side path toolkit, run without a
 * browser.
 *
 * Run it:
 *   npx tsx src/plgg-router/example.ts
 *
 * plgg-router is now just the **pure path machinery**: it compiles a pattern to
 * `Segment`s, matches a concrete pathname (capturing `:param`s and a trailing
 * `*wildcard`), and parses the query string. It returns *data* — a `Location` —
 * never a view. The DOM/History loop and the `Url -> Model -> Html` wiring live
 * in plgg-view's `application` runtime; an app maps each matched route to a
 * `Msg`/`Model` there. This file demonstrates exactly the data that runtime
 * folds in.
 *
 * It builds a tiny route table (home, a parametric user page, a search page, a
 * mounted `/admin` route, and a `*` catch-all), then resolves several locations
 * to a label + the params/query each captures — first-match-wins, like a real
 * router's resolution order.
 */
import {
  SoftStr,
  Option,
  none,
  isSome,
  pipe,
  getOr,
  mapOption,
} from "plgg";
import {
  Segment,
  Location,
  makeLocation,
  compilePattern,
  matchSegments,
  parseQuery,
  param,
  query,
} from "plgg-router/index";

// --- a route table: a compiled pattern + a label-from-location, pure data ---
type Route = Readonly<{
  segments: ReadonlyArray<Segment>;
  label: (loc: Location) => SoftStr;
}>;

const makeRoute = (
  pattern: SoftStr,
  label: (loc: Location) => SoftStr,
): Route => ({
  segments: compilePattern(pattern),
  label,
});

const routes: ReadonlyArray<Route> = [
  makeRoute("/", () => "Home"),
  makeRoute("/users/:id", (loc) =>
    pipe(
      loc,
      param("id"),
      mapOption((id) => `User ${id}`),
      getOr("User ?"),
    ),
  ),
  makeRoute("/search", (loc) =>
    pipe(
      loc,
      query("q"),
      mapOption((q) => `Results for "${q}"`),
      getOr("No query"),
    ),
  ),
  makeRoute("/admin/dashboard", () => "Admin Dashboard"),
  // first-match-wins, so the catch-all wildcard is registered last
  makeRoute("*", () => "Not Found"),
];

// --- resolve a location to the first matching route's label ---
const resolve = (loc: Location): Option<SoftStr> =>
  routes.reduce<Option<SoftStr>>(
    (acc, route) =>
      isSome(acc)
        ? acc
        : pipe(
            matchSegments(route.segments, loc.path),
            mapOption((params) =>
              route.label({ ...loc, params }),
            ),
          ),
    none(),
  );

const show = (
  path: SoftStr,
  search: SoftStr = "",
): void =>
  console.log(
    `${path}${search}  ->  ${pipe(
      resolve(
        makeLocation(path, {}, parseQuery(search)),
      ),
      getOr("<no match>"),
    )}`,
  );

show("/");
show("/users/42");
show("/search", "?q=plgg%20router");
show("/admin/dashboard");
show("/nope/page");
