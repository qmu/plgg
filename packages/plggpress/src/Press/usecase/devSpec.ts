import { join } from "node:path";
import { type SoftStr } from "plgg";
import { type DevDefinition } from "plggpress/framework";
import { srcRootOf } from "plggpress/framework/Dev/usecase/appSource";
import { runDev } from "plggpress/framework/Dev/node/devSeam";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";

/**
 * plggpress's own source root, found from THIS module's
 * location on disk (see {@link srcRootOf}) — never from the
 * consumer's directory. This is what lets `plggpress dev`
 * run in a repository that has only ever heard of
 * `plggpress`: the theme's whereabouts are the CLI's own
 * business, not a path a consumer must configure.
 */
const SRC_ROOT: SoftStr = srcRootOf(
  import.meta.url,
);

/**
 * The press `dev` declaration: the dev-entry module
 * plggpress SHIPS (so no consumer writes one), its own
 * self-alias + source root, and the extra Hosts the
 * validated `site.config.ts` allows.
 *
 * The rest of a dev run — content root, config path, port —
 * comes from flags and conventions the framework resolves,
 * so the whole hand-wiring a consumer used to keep
 * (`bundle.config.ts` + `devEntry.ts` + a bundler
 * dependency) is now this one declaration.
 *
 * This is also where the toolchain seam is INJECTED. Only
 * `cli.ts` imports this module, and `cli.ts` runs from
 * source (it is not a bundled entry), so naming the seam
 * here keeps `import.meta` — which the seam needs to
 * register the bundler's loader hook, and which is a syntax
 * error inside a built entry's module graph — off
 * plggpress's published surface.
 */
export const pressDevOf =
  (): DevDefinition<SiteConfig> => ({
    entry: join(SRC_ROOT, "devServerEntry.ts"),
    aliasPrefix: "plggpress",
    srcDir: SRC_ROOT,
    allowedHosts: (
      config: SiteConfig,
    ): ReadonlyArray<SoftStr> =>
      config.dev.allowedHosts,
    run: runDev,
  });
