// Public barrel for plggmatic — the framework facade an
// app (the content/render specifics) composes onto: config
// loading, the router builder, static-build + dev-server
// orchestration, app-options, and the pre-organized CLI.
export {
  type AppOptions,
  type BuildReport,
  type DevServer,
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
  type Clients,
  type DevHandle,
  type DevSpec,
  dev,
  createDevHandle,
  decorateDevHtml,
  isAllowedHost,
  devPort,
  devUrl,
  watchContent,
} from "plggmatic/Dev/usecase/dev";

export {
  type AppRunContext,
  configPathOf,
  resolveOptions,
} from "plggmatic/Cli/usecase/resolveOptions";

export {
  type AppDefinition,
  runApp,
} from "plggmatic/Cli/usecase/runApp";
