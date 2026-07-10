import { type SoftStr, type Defect } from "plgg";
import { type SsgError } from "plgg-server/ssg";
import {
  type AppOptions,
  type AppRunContext,
  runApp,
} from "plggpress/framework";
import {
  type SiteConfig,
  type BrokenLink,
  type BrokenLinks,
  type ModelViolations,
  loadConfig,
  buildSpecOf,
} from "plggpress";
import { pressServeWebWithAuth } from "plgg-cms/server/pressServer";

/**
 * Renders a build failure as a one-line shell message. The
 * tagged `SsgError`/`Defect` union narrows on `__tag` — no
 * cast — so each variant surfaces its most useful field.
 */
const formatBuildError = (
  e:
    | SsgError
    | Defect
    | BrokenLinks
    | ModelViolations,
): SoftStr =>
  e.__tag === "Defect"
    ? e.content.message
    : e.__tag === "BrokenLinks"
      ? `${e.content.broken.length} broken link(s): ${e.content.broken
          .map(
            (b: BrokenLink): SoftStr =>
              `${b.source} -> ${b.href} (${b.reason})`,
          )
          .join("; ")}`
      : e.__tag === "ModelViolations"
        ? `${e.content.length} content-model violation(s): ${e.content
            .map(
              (v): SoftStr =>
                `${v.path}: ${v.reason}`,
            )
            .join("; ")}`
        : e.__tag === "WriteFailed"
          ? `${e.content.path}: ${e.content.message}`
          : `${e.__tag}: ${e.content.path}`;

/**
 * The plgg-cms CLI: the plggpress framework's pre-organized
 * app runner (argv parsing, command dispatch, the usage
 * banner, and the `Result`→exit-code fold are all the
 * framework's) declared with the dynamic-content specifics —
 * the `site.config.ts` loader, the deploy base from the
 * validated config, the {@link buildSpecOf} build
 * declaration, the {@link pressServeWebWithAuth}
 * served-router factory, and the press error formatter.
 *
 * plgg-cms is the DYNAMIC half, so it supplies a `serveWeb`
 * and gets both verbs against one `site.config.ts`:
 * - `build` — the SSG: renders every route to static files
 *   (the public reader path, D5's SSG/CDN half).
 * - `serve` — a persistent `node:http` instance rendering the
 *   SAME router live (D5's always-on half; the mount point for
 *   the `/api`, `/admin`, `/auth`, `/mcp` subtrees, composed
 *   in `pressServer.ts`). Config is loaded once at startup;
 *   no watch, no re-import.
 * - authoring hot-reload is a TOOLCHAIN concern — `plgg-bundle
 *   dev` via plggpress's `devEntry` — so plgg-cms ships no
 *   `dev` command, and `serve` is not its return.
 */
await runApp<
  SiteConfig,
  Defect | BrokenLinks | ModelViolations
>({
  name: "plgg-cms",
  description: "dynamic content-management server",
  configFile: "site.config.ts",
  loadConfig,
  context: (
    config: SiteConfig,
  ): AppRunContext => ({ base: config.base }),
  buildSpec: (
    config: SiteConfig,
    opts: AppOptions,
  ) =>
    buildSpecOf(
      config,
      opts.contentDir,
      opts.base,
    ),
  serveWeb: (
    config: SiteConfig,
    opts: AppOptions,
  ) =>
    pressServeWebWithAuth(
      opts.contentDir,
      config,
      opts.base,
    ),
  formatError: formatBuildError,
});
