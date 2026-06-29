import { type PromisedResult, err } from "plgg";
import {
  type PressOptions,
  type BuildReport,
} from "plgg-press/Press/model/PressOptions";
import {
  type NotImplementedError,
  notImplementedError,
} from "plgg-press/Press/model/PressError";

/**
 * Build the static site from a content corpus into
 * `opts.outDir`. STUB for this scaffold ticket: the
 * facade's contract is fixed here (signature + error
 * channel), but the pipeline body — read corpus, fold
 * Markdown through plgg-md routed by `href(opts.base)`,
 * render via plgg-view, write HTML — lands in a later
 * ticket. Returns a typed {@link NotImplementedError}
 * rather than throwing, keeping a clean review boundary.
 */
export const build = (
  opts: PressOptions,
): PromisedResult<
  BuildReport,
  NotImplementedError
> =>
  Promise.resolve(
    err(
      notImplementedError(
        `build() is not implemented yet (outDir ${opts.outDir})`,
      ),
    ),
  );
