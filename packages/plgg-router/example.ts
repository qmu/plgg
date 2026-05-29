/**
 * plgg-router example — a tiny client-side SPA router, run without a browser.
 *
 * Run it:
 *   npx tsx src/plgg-router/example.ts
 *
 * It builds a router (home, a parametric user page, a search page reading the
 * query string, a mounted `/admin` sub-router, and a `*` not-found), then
 * `resolve`s several locations and prints the `VNode` each produces as HTML.
 *
 * This exercises the runtime-neutral CORE end to end: router building, path
 * matching, `:param` + query extraction, sub-router mounting, first-match-wins,
 * and the wildcard not-found. The DOM/History seam (`start`/`push`/`replace`,
 * link interception, `popstate`) needs a real History API and is exercised in
 * `client.spec.ts` under happy-dom. A real app authors handlers as JSX in
 * `.tsx`; here VNodes are built by hand so the demo stays one dependency-free
 * `.ts` file.
 */
import {
  Dict,
  SoftStr,
  box,
  pipe,
  getOr,
  mapOption,
} from "plgg";
import {
  VNode,
  VNodeAlgebra,
  foldVNode,
} from "plgg-view";
import {
  router,
  get,
  route,
  resolve,
  param,
  query,
  makeLocation,
  parseQuery,
} from "plgg-router/index";

// --- minimal VNode constructors + an HTML-string fold (stands in for the DOM
//     renderer a real host injects via `start`'s `render` option) ---
const text = (value: SoftStr): VNode =>
  box("Text")({ value });

const el = (
  tag: SoftStr,
  children: ReadonlyArray<VNode>,
  props: Dict<string, SoftStr> = {},
): VNode => box("Element")({ tag, props, children });

const toHtml: VNodeAlgebra<string> = {
  text: (value) => value,
  fragment: (children) => children.join(""),
  element: (tag, props, children) => {
    const attrs = Object.entries(props)
      .map(([k, v]) => ` ${k}="${v}"`)
      .join("");
    return `<${tag}${attrs}>${children.join("")}</${tag}>`;
  },
};
const html = (node: VNode): string =>
  foldVNode(toHtml)(node);

// --- a mounted sub-router: every route gains the `/admin` prefix ---
const admin = pipe(
  router(),
  get("/dashboard", () =>
    el("h1", [text("Admin Dashboard")]),
  ),
);

// --- the app: data-last builders through `pipe`, exactly like plgg-server ---
const app = pipe(
  router(),
  get("/", () => el("h1", [text("Home")])),
  get("/users/:id", (loc) =>
    el("h1", [
      text(
        pipe(
          loc,
          param("id"),
          mapOption((id) => `User ${id}`),
          getOr("User ?"),
        ),
      ),
    ]),
  ),
  get("/search", (loc) =>
    el("p", [
      text(
        pipe(
          loc,
          query("q"),
          mapOption((q) => `Results for "${q}"`),
          getOr("No query"),
        ),
      ),
    ]),
  ),
  route("/admin", admin),
  // first-match-wins, so the catch-all wildcard is registered last
  get("*", () => el("h1", [text("Not Found")])),
);

const show = (
  path: SoftStr,
  search: SoftStr = "",
): void =>
  console.log(
    `${path}${search}  ->  ${pipe(
      resolve(
        app,
        makeLocation(path, {}, parseQuery(search)),
      ),
      mapOption(html),
      getOr("<no match>"),
    )}`,
  );

show("/");
show("/users/42");
show("/search", "?q=plgg%20router");
show("/admin/dashboard");
show("/nope/page");
