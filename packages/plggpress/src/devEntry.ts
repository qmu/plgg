import { type SoftStr, matchResult } from "plgg";
import { type Fetch, toFetch } from "plggmatic";
import {
  type SsgError,
  discoverPaths,
} from "plggmatic/ssg";
import { type SiteConfig } from "plggpress/SiteConfig/model/SiteConfig";
import { loadConfig } from "plggpress/Config/usecase/loadConfig";
import { pressRouter } from "plggpress/router/pressRouter";

/**
 * What a consumer's dev entry supplies to build the render
 * `Fetch`: the content root, the `site.config` path, and
 * the deploy base. The guide closes these over its own
 * layout and default-exports the resulting factory.
 */
export type DevEntryOptions = Readonly<{
  contentDir: SoftStr;
  configPath: SoftStr;
  base: SoftStr;
}>;

/**
 * A dev-entry `Fetch` factory for the `plgg-bundle dev`
 * toolchain server: the SAME render path `build` uses —
 * load + validate the site config, discover routes, build
 * {@link pressRouter}, and expose it as a Web `Fetch`. The
 * toolchain re-invokes this on every watched edit; because
 * it is re-imported with a busted module version, a theme
 * `.ts` change re-evaluates here and a content change is
 * re-discovered — so both hot-reload with no restart.
 *
 * A config/discovery failure is thrown (not a plgg
 * `Result`), which is exactly the boundary `plgg-bundle`'s
 * dev loop catches to keep the last good build alive.
 */
export const pressDevEntry =
  (
    opts: DevEntryOptions,
  ): (() => Promise<Fetch>) =>
  (): Promise<Fetch> =>
    loadConfig(opts.configPath).then(
      matchResult(
        (e): Promise<Fetch> => {
          throw new Error(e.content.message);
        },
        (config: SiteConfig): Promise<Fetch> =>
          discoverPaths(opts.contentDir).then(
            matchResult(
              (_e: SsgError): Fetch => {
                throw new Error(
                  `route discovery failed under ${opts.contentDir}`,
                );
              },
              (
                paths: ReadonlyArray<SoftStr>,
              ): Fetch =>
                toFetch(
                  pressRouter(
                    opts.contentDir,
                    config,
                    opts.base,
                    paths,
                  ),
                ),
            ),
          ),
      ),
    );
