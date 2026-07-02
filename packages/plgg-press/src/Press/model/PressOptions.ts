import { type SoftStr } from "plgg";
import { type AppOptions } from "plggmatic";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";

/**
 * The build outcome is `plggmatic`'s — re-exported so the
 * press public surface is unchanged by the rewire.
 */
export { type BuildReport } from "plggmatic";

/**
 * The resolved inputs a single press `build` run operates
 * on: the framework's generic run inputs plus the
 * validated {@link SiteConfig} — the one field the
 * framework deliberately leaves to the app. The CLI fills
 * these from cwd defaults + flags + the loaded config;
 * the programmatic API takes them directly. Pure data.
 *
 * - `contentDir` — root of the authored Markdown corpus.
 * - `outDir` — where the built site is written.
 * - `assetsDir` — static files copied verbatim.
 * - `config` — the validated site config.
 * - `base` — the deploy base path (e.g. `/plgg/`); the
 *   value `href` is curried with.
 */
export type PressOptions = Readonly<{
  contentDir: SoftStr;
  outDir: SoftStr;
  assetsDir: SoftStr;
  config: SiteConfig;
  base: SoftStr;
}>;

/**
 * Project the framework-generic {@link AppOptions} out of
 * {@link PressOptions} — everything except `config`,
 * which the app closes over its own spec instead of
 * handing to the framework.
 */
export const appOptionsOf = (
  opts: PressOptions,
): AppOptions => ({
  contentDir: opts.contentDir,
  outDir: opts.outDir,
  assetsDir: opts.assetsDir,
  base: opts.base,
});
