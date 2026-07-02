import { type SoftStr } from "plgg";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";

/**
 * The resolved inputs a single `build`/`dev` run
 * operates on. The CLI fills these from cwd defaults +
 * flags + the loaded {@link SiteConfig}; the programmatic
 * API takes them directly. Pure data.
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
 * The outcome of a successful `build`: where it wrote and
 * the output paths it emitted. The contract the pipeline
 * ticket fulfils.
 */
export type BuildReport = Readonly<{
  outDir: SoftStr;
  pages: ReadonlyArray<SoftStr>;
}>;
