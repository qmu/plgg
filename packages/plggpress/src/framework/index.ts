// plggpress's internal framework facade — the generic web
// application seam plggpress composes its content/render
// specifics onto: config loading, the router builder, the
// static-build orchestration, app-options, and the
// pre-organized CLI. (Dev/hot-reload is a toolchain
// concern — `plgg-bundle dev` — not the framework's.)
//
// Absorbed (31fdee9) from the retired `plggmatic`
// app-framework facade; the name `plggmatic` now
// belongs to the UI design framework in
// `packages/plggmatic/`. plggpress carries this
// framework internally instead of depending on it.
//
// The facade also wraps the mid-library surfaces, so
// plggpress reaches the whole stack through one internal
// barrel (plus the plgg foundation): plgg-view, plgg-server
// (whose surface already includes all of plgg-http via its
// own re-exports), plgg-md, and plgg-highlight. The wrap is
// a pure re-export — no logic lives here — so each
// mid-library stays rebuildable behind the facade.
// Subpath vocabularies stay on their own entries, mirroring
// the wrapped packages: `plggpress/framework/ssg`
// (plgg-server/ssg) and `plggpress/framework/style`
// (plgg-view/style).
export {
  type AppOptions,
  type BuildReport,
} from "plggpress/framework/App/model/AppOptions";

export {
  type ConfigLoadError,
  configLoadError,
  configLoadError$,
} from "plggpress/framework/App/model/AppError";

export { loadConfig } from "plggpress/framework/Config/usecase/loadConfig";

export { buildRouter } from "plggpress/framework/Routing/usecase/buildRouter";

export {
  type BuildSpec,
  build,
} from "plggpress/framework/Build/usecase/build";

export {
  type AppRunContext,
  type ServeSettings,
  configPathOf,
  resolveOptions,
  resolveServe,
} from "plggpress/framework/Cli/usecase/resolveOptions";

export { serveApp } from "plggpress/framework/Serve/usecase/serveApp";

export {
  type AppDefinition,
  runApp,
} from "plggpress/framework/Cli/usecase/runApp";

// Wrapped mid-library surfaces. plgg-http is reached through
// plgg-server's re-exports (its whole surface is included);
// the explicit star keeps the wrap intact even if plgg-server
// ever narrows what it forwards.
// plgg-http is NOT star-exported here: plgg-server already
// re-exports its whole surface (`plgg-server/Http/model` does
// `export * from "plgg-http"`), so a second star would make
// every plgg-http name an ambiguous star export — which native
// ESM rejects when this barrel is loaded as source (it is, via
// the `plggpress/framework` self-alias). Reaching plgg-http
// through plgg-server keeps one unambiguous path.
export * from "plgg-view";
export * from "plgg-server";
export * from "plgg-md";
export * from "plgg-highlight";

// Names exported by more than one wrapped library are ambiguous
// star exports, so native ESM would reject the barrel. Re-export
// the page-authoring (plgg-view) variant explicitly — an
// explicit re-export shadows the star ambiguity, giving the
// facade's consumer vocabulary a single definition. The shadowed
// variants stay reachable from their own packages: plgg-server's
// `head` (HEAD route), `header` (context header), `on` (route
// matcher), and its SSR fold `renderToString` / `collectCss`
// (which it re-exports from plgg-view); plgg-md's AST
// constructors `link`, `strong`, `table`, `text$` and its
// `ListItem`, `TableRow` node types.
export {
  head,
  header,
  on,
  renderToString,
  collectCss,
  link,
  strong,
  table,
  text$,
  type ListItem,
  type TableRow,
} from "plgg-view";
