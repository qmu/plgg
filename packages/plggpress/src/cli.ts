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
import { type ModelViolations } from "plggpress/ContentModel/model/ModelViolation";
import { loadConfig } from "plggpress/Config/usecase/loadConfig";
import { buildSpecOf } from "plggpress/Press/usecase/appSpecs";
import { pressDevOf } from "plggpress/Press/usecase/devSpec";

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
 * The plggpress CLI: the framework's pre-organized app
 * runner (argv parsing, command dispatch, the usage banner,
 * and the `Result`→exit-code fold are all the framework's)
 * declared with the press specifics — the `site.config.ts`
 * loader, the deploy base from the validated config, the
 * {@link buildSpecOf} build declaration, the
 * {@link pressDevOf} dev declaration, and the press error
 * formatter.
 *
 * plggpress is the pure STATIC-SITE GENERATOR, so it declares
 * NO `serveWeb` and gets a `build` + `dev` CLI:
 * - `build` — renders every route to static files (the public
 *   reader path, D5's SSG/CDN half).
 * - `dev` — the authoring loop: the same render path, served
 *   with hot reload.
 * - the dynamic `serve` mode (a persistent `node:http` instance
 *   mounting `/api`, `/admin`, `/auth`, `/mcp`) lives in
 *   `plgg-cms`, which supplies its own `serveWeb`.
 *
 * `dev` REVERSES this file's previous stance ("authoring
 * hot-reload is a TOOLCHAIN concern … plggpress ships no
 * `dev` command"). Leaving the command to the toolchain
 * meant every consumer hand-wrote a `bundle.config.ts`, a
 * `devEntry.ts`, and took a bundler dependency just to read
 * their own Markdown. Reducing exactly that friction is what
 * this package is FOR, so plggpress now SERVES its own
 * persistent dev surface (`framework/DevServer`): the shared
 * render path wrapped in a self-owned live-reload channel
 * and a live-edit bridge, watching the source paths.
 * `plggpress dev` in a bare docs repo, no wiring, no bundler.
 */
await runApp<
  SiteConfig,
  Defect | BrokenLinks | ModelViolations
>({
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
  dev: pressDevOf(),
  formatError: formatBuildError,
});
