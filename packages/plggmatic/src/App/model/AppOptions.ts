import { type SoftStr } from "plgg";

/**
 * The resolved inputs a single framework `build`/`dev` run
 * operates on — the framework-generic generalization of an
 * app's run-input contract. The pre-organized CLI fills
 * these from cwd defaults + flags; the programmatic API
 * takes them directly. Pure data, and deliberately free of
 * any app-specific config type: the app closes its own
 * validated config over the router factory it hands the
 * framework, so {@link AppOptions} stays generic.
 *
 * - `contentDir` — root of the authored content corpus.
 * - `outDir` — where the built site is written.
 * - `assetsDir` — static files copied verbatim.
 * - `base` — the deploy base path (e.g. `/plgg/`).
 */
export type AppOptions = Readonly<{
  contentDir: SoftStr;
  outDir: SoftStr;
  assetsDir: SoftStr;
  base: SoftStr;
}>;

/**
 * The outcome of a successful `build`: where it wrote and
 * the output paths it emitted.
 */
export type BuildReport = Readonly<{
  outDir: SoftStr;
  pages: ReadonlyArray<SoftStr>;
}>;
