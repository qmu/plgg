import { type SoftStr } from "plgg";
import { type Web } from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { pressRouter } from "plggpress/router/pressRouter";

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
