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
import { type Web } from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { pressRouter } from "plggpress/router/pressRouter";
import {
  type Db,
  openDb,
  openIndex,
} from "plgg-content";
import { sqlAccountStore } from "plgg-auth";
import { bootstrapAuthWeb } from "plggpress/auth/bootstrapAuth";
import { deliverAdmin } from "plggpress/Admin/deliverAdmin";
import {
  memorySettingsStore,
  settingsError,
} from "plggpress/Admin/settingsStore";

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
 * byte-identical to the build) MERGED with the dogfooded OIDC
 * OP+RP admin auth Web ({@link bootstrapAuthWeb}) — the OP
 * endpoints, `/auth/*` login flow, and the guarded `/admin`
 * scheduled admin UI ({@link deliverAdmin}). `runApp`'s serve
 * command awaits this before starting the server.
 *
 * One `authDb` backs both the OP store AND the account store,
 * and the admin's account store is that SAME `sqlAccountStore`
 * — so a role change in the admin UI is the role the auth
 * guard reads. A separate in-process content index backs the
 * admin's content browsing (and, later, ticket 16's live
 * `/api`). Both are `:memory:` for the server's lifetime;
 * admin accounts are provisioned out of band (the invite
 * flow), and the issuer/origin + a persistent Db are operator
 * config — the placeholder issuer suffices for the
 * same-process flow but a real deploy threads the served
 * origin here.
 */
export const pressServeWebWithAuth = (
  contentDir: SoftStr,
  config: SiteConfig,
  base: SoftStr,
): PromisedResult<
  (paths: ReadonlyArray<SoftStr>) => Web,
  Defect
> => {
  const authDb = openDb(":memory:");
  // used lazily at request time, by when bootstrapAuthWeb has
  // applied ACCOUNT_SCHEMA to authDb.
  const accounts = sqlAccountStore(authDb);
  const clock = () => Math.floor(Date.now() / 1000);
  // The LLM-key validator is a non-empty check until plgg-kit
  // wires in (it is not yet a plggpress dep); the store's
  // write-only posture is enforced regardless.
  const settings = memorySettingsStore((key) =>
    Promise.resolve(
      key.length > 0
        ? ok(null)
        : err(settingsError("empty key")),
    ),
  );
  return openIndex(":memory:").then(
    matchResult<
      Db,
      { content: { message: SoftStr } },
      PromisedResult<
        (
          paths: ReadonlyArray<SoftStr>,
        ) => Web,
        Defect
      >
    >(
      (e) =>
        Promise.resolve(
          err(
            defect(
              `content index open failed: ${e.content.message}`,
            ),
          ),
        ),
      (contentDb) =>
        bootstrapAuthWeb(
          authDb,
          "https://plggpress.local",
          "plggpress-admin",
          clock,
          86400,
          deliverAdmin(
            contentDb,
            accounts,
            settings,
            clock,
          ),
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
        ),
    ),
  );
};
