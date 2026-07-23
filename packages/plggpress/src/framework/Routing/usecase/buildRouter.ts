import { type SoftStr } from "plgg";
import {
  type Web,
  type Handler,
  web,
  get,
} from "plgg-server";

/**
 * The framework-generic ROUTER BUILDER: fold a discovered
 * route set into a plgg-server {@link Web} app, binding
 * ONE GET route per path to the single app-supplied
 * {@link Handler}. Because the handler reads the request
 * path from its {@link Context}, one handler serves every
 * registered route — the app supplies its own
 * content-source + renderer + layout inside that handler;
 * the framework owns only the assembly. Built data-last
 * over the paths through `web()`/`get()`, so feeding the
 * same `paths` to `generateStatic` renders exactly the
 * routes registered here.
 */
export const buildRouter = (
  paths: ReadonlyArray<SoftStr>,
  handler: Handler,
): Web =>
  paths.reduce(
    (app: Web, path: SoftStr): Web =>
      get(path, handler)(app),
    web(),
  );
