// Public barrel for plggmatic — the framework facade an
// app (the content/render specifics) composes onto: config
// loading, the router builder, the static-build
// orchestration, app-options, and the pre-organized CLI.
// (Dev/hot-reload is a toolchain concern — `plgg-bundle
// dev` — not the framework's.)
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
