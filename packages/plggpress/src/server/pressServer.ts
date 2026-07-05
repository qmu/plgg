import {
  type SoftStr,
  type Result,
  type PromisedResult,
  type Defect,
  ok,
  err,
  defect,
  matchResult,
} from "plgg";
import {
  type Web,
  web,
  get,
  htmlResponse,
} from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { pressRouter } from "plggpress/router/pressRouter";
import { openDb } from "plgg-content";
import { bootstrapAuthWeb } from "plggpress/auth/bootstrapAuth";

/**
 * plggpress's serve-side {@link Web} assembly and the ONE
 * mount seam the roadmap's dynamic subtrees extend. Today it
 * is exactly the SSG content router ({@link pressRouter}
 * verbatim), so the served site is byte-identical to the
 * built site (proven by the byte-identity spec) — serve
 * composes AROUND the router, never inside it.
 *
 * **This — and only this — is where later tickets mount their
 * sub-apps** via plgg-server's `route(basePath, sub)` (which
 * scopes a sub-app's middleware to its prefix, so an auth
 * guard on `/admin` never touches reader routes):
 * `route("/api", …)` (ticket 16 delivery API),
 * `route("/auth", …)` / `route("/admin", …)` (tickets 19/20),
 * `route("/mcp", …)` (ticket 27 MCP-over-HTTP). If the first
 * real mount lands anywhere else, this seam has failed its
 * purpose. `pressRouter` and `buildSpecOf` are not modified —
 * the reader render path stays the single source of HTML.
 */
export const pressServeWeb =
  (
    contentDir: SoftStr,
    config: SiteConfig,
    base: SoftStr,
  ) =>
  (paths: ReadonlyArray<SoftStr>): Web =>
    pressRouter(contentDir, config, base, paths);

/** A placeholder admin landing page until ticket 20's admin UI. */
const placeholderAdmin = (): Web =>
  get("/", async () =>
    ok(
      htmlResponse(
        "<!doctype html><title>plggpress admin</title><p>Admin UI — ticket 20.</p>",
      ),
    ),
  )(web());

/** Concatenate two Webs' routes (guard middlewares are per-route-scoped). */
const mergeWebs = (a: Web, b: Web): Web => ({
  routes: [...a.routes, ...b.routes],
  middlewares: [
    ...a.middlewares,
    ...b.middlewares,
  ],
});

/**
 * The async serve seam: the content router (reader routes,
 * byte-identical to the build) MERGED with the dogfooded
 * OIDC OP+RP admin auth Web ({@link bootstrapAuthWeb}) — the
 * OP endpoints, `/auth/*` login flow, and guarded `/admin`.
 * `runApp`'s serve command awaits this before starting the
 * server. The auth store is an in-process `:memory:` index
 * for the server's lifetime; admin accounts are provisioned
 * out of band (the invite flow). NOTE: the issuer/origin and
 * a persistent auth Db are operator config — the placeholder
 * issuer suffices for the same-process flow but a real deploy
 * threads the served origin here.
 */
export const pressServeWebWithAuth = (
  contentDir: SoftStr,
  config: SiteConfig,
  base: SoftStr,
): PromisedResult<
  (paths: ReadonlyArray<SoftStr>) => Web,
  Defect
> =>
  bootstrapAuthWeb(
    openDb(":memory:"),
    "https://plggpress.local",
    "plggpress-admin",
    () => Math.floor(Date.now() / 1000),
    86400,
    placeholderAdmin(),
  ).then(
    matchResult<
      { web: Web },
      { content: { message: SoftStr } },
      Result<
        (
          paths: ReadonlyArray<SoftStr>,
        ) => Web,
        Defect
      >
    >(
      (e) =>
        err(
          defect(
            `auth bootstrap failed: ${e.content.message}`,
          ),
        ),
      (boot) =>
        ok(
          (
            paths: ReadonlyArray<SoftStr>,
          ): Web =>
            mergeWebs(
              pressServeWeb(
                contentDir,
                config,
                base,
              )(paths),
              boot.web,
            ),
        ),
    ),
  );
