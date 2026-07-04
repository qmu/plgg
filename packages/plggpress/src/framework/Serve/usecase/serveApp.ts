import { type Server } from "node:http";
import {
  type SoftStr,
  type Defect,
  type PromisedResult,
  ok,
  proc,
  matchOption,
} from "plgg";
import { type Web, toFetch } from "plgg-server";
import {
  type ServeOptions,
  serve,
} from "plgg-server/node";
import {
  type SsgError,
  discoverPaths,
} from "plgg-server/ssg";
import { type AppOptions } from "plggpress/framework/App/model/AppOptions";
import { type ServeSettings } from "plggpress/framework/Cli/usecase/resolveOptions";

/**
 * Run an app's content router as a PERSISTENT `node:http`
 * process — the served (D5) third mode beside SSG `build`
 * and the `plgg-bundle dev` authoring loop. It discovers the
 * same route set the build crawls, hands those paths to the
 * SAME router factory (so served HTML ≡ generated HTML —
 * byte-identity is a spec), converts the {@link Web} app to a
 * `Fetch` and listens through plgg-server's node adapter
 * (which brings the body cap + request/socket timeouts for
 * free).
 *
 * Discovery/config failures stay on the typed `Result`
 * channel (never a throw). On success the Promise resolves
 * with the LISTENING server once the socket is bound, so a
 * caller can read its real port (`server.address()`) and
 * `close()` it deterministically. `serveApp` does NOT keep
 * the process alive itself — the returned server holds the
 * event loop; the CLI's `runServe` awaits `close`.
 */
export const serveApp = (
  opts: AppOptions,
  router: (
    paths: ReadonlyArray<SoftStr>,
  ) => Web,
  settings: ServeSettings,
): PromisedResult<Server, SsgError | Defect> =>
  proc(
    discoverPaths(opts.contentDir),
    (
      paths: ReadonlyArray<SoftStr>,
    ): PromisedResult<Server, SsgError> =>
      new Promise((resolve) => {
        const handler = toFetch(router(paths));
        // omit `hostname` when absent (exactOptionalPropertyTypes:
        // the adapter binds all interfaces on an absent field)
        const serveOpts: ServeOptions = matchOption(
          (): ServeOptions => ({
            port: settings.port,
          }),
          (h: SoftStr): ServeOptions => ({
            port: settings.port,
            hostname: h,
          }),
        )(settings.hostname);
        const server: Server = serve(
          serveOpts,
          () => resolve(ok(server)),
        )(handler);
      }),
  );
