// Public barrel for plggmatic — the framework facade an
// app (the content/render specifics) composes onto: config
// loading, the router builder, the static-build
// orchestration, app-options, and the pre-organized CLI.
// (Dev/hot-reload is a toolchain concern — `plgg-bundle
// dev` — not the framework's.)
//
// The facade also wraps the mid-library surfaces, so an app
// depends on plggmatic (plus the plgg foundation) alone:
// plgg-view, plgg-server (whose surface already includes all
// of plgg-http via its own re-exports), plgg-md, and
// plgg-highlight. This deliberately amends the original
// "the framework never renders" boundary: the framework owns
// the consumer-facing vocabulary of the whole stack. The
// wrap is a pure re-export — no logic lives here — so each
// mid-library stays rebuildable behind the facade.
// Subpath vocabularies stay on their own entries, mirroring
// the wrapped packages: `plggmatic/ssg` (plgg-server/ssg)
// and `plggmatic/style` (plgg-view/style).
export {
  type AppOptions,
  type BuildReport,
} from "plggmatic/App/model/AppOptions";

export {
  type ConfigLoadError,
  configLoadError,
  configLoadError$,
} from "plggmatic/App/model/AppError";

export { loadConfig } from "plggmatic/Config/usecase/loadConfig";

export { buildRouter } from "plggmatic/Routing/usecase/buildRouter";

export {
  type BuildSpec,
  build,
} from "plggmatic/Build/usecase/build";

export {
  type AppRunContext,
  configPathOf,
  resolveOptions,
} from "plggmatic/Cli/usecase/resolveOptions";

export {
  type AppDefinition,
  runApp,
} from "plggmatic/Cli/usecase/runApp";

// Wrapped mid-library surfaces. plgg-http is reached through
// plgg-server's re-exports (its whole surface is included);
// the explicit star keeps the wrap intact even if plgg-server
// ever narrows what it forwards.
export * from "plgg-view";
export * from "plgg-server";
export * from "plgg-http";
export * from "plgg-md";
export * from "plgg-highlight";

// Names exported by more than one wrapped library resolve to
// distinct declarations, so ESM/TS drops them from the star
// exports above. Re-export the page-authoring (plgg-view)
// variant explicitly — the facade's consumer vocabulary. The
// shadowed variants stay reachable from their own packages:
// plgg-server's `head` (HEAD route), `header` (context
// header), `on` (route matcher); plgg-md's AST constructors
// `link`, `strong`, `table`, `text$` and its `ListItem`,
// `TableRow` node types.
export {
  head,
  header,
  on,
  link,
  strong,
  table,
  text$,
  type ListItem,
  type TableRow,
} from "plgg-view";
