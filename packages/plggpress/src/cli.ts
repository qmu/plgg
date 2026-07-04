import { type SoftStr, type Defect } from "plgg";
import { type SsgError } from "plggpress/framework/ssg";
import {
  type AppOptions,
  type AppRunContext,
  runApp,
} from "plggpress/framework";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import {
  type BrokenLink,
  type BrokenLinks,
} from "plggpress/CheckLinks/model/CheckLinks";
import { loadConfig } from "plggpress/Config/usecase/loadConfig";
import { buildSpecOf } from "plggpress/Press/usecase/appSpecs";
import { pressServeWeb } from "plggpress/server/pressServer";

/**
 * Renders a build failure as a one-line shell message. The
 * tagged `SsgError`/`Defect` union narrows on `__tag` — no
 * cast — so each variant surfaces its most useful field.
 */
const formatBuildError = (
  e: SsgError | Defect | BrokenLinks,
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
      : e.__tag === "WriteFailed"
        ? `${e.content.path}: ${e.content.message}`
        : `${e.__tag}: ${e.content.path}`;

/**
 * The plggpress CLI: the framework's pre-organized app
 * runner (argv parsing, command dispatch, the usage banner,
 * and the `Result`→exit-code fold are all the framework's)
 * declared with the press specifics — the `site.config.ts`
 * loader, the deploy base from the validated config, the
 * {@link buildSpecOf} build declaration, the
 * {@link pressServeWeb} served-router factory, and the press
 * error formatter.
 *
 * THREE modes, one `site.config.ts`, one `loadConfig`, one
 * `pressRouter`:
 * - `build` — the SSG: renders every route to static files
 *   (the public reader path, D5's SSG/CDN half).
 * - `serve` — a persistent `node:http` instance rendering the
 *   SAME router live (D5's always-on half; the mount point
 *   for the later `/api`, `/admin`, `/auth`, `/mcp` subtrees,
 *   composed in `pressServer.ts`). Config is loaded once at
 *   startup; no watch, no re-import.
 * - authoring hot-reload is a TOOLCHAIN concern — `plgg-bundle
 *   dev` via `devEntry` — so plggpress still ships no `dev`
 *   command, and `serve` is not its return.
 */
await runApp<SiteConfig, Defect | BrokenLinks>({
  name: "plggpress",
  description: "static site generator",
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
    pressServeWeb(
      opts.contentDir,
      config,
      opts.base,
    ),
  formatError: formatBuildError,
});
