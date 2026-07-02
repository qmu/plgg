import {
  type PromisedResult,
  type Defect,
} from "plgg";
import { type SsgError } from "plgg-server/ssg";
import { build as frameworkBuild } from "plggmatic";
import {
  type PressOptions,
  type BuildReport,
  appOptionsOf,
} from "plgg-press/Press/model/PressOptions";
import { type BrokenLinks } from "plgg-press/CheckLinks/model/CheckLinks";
import { buildSpecOf } from "plgg-press/Press/usecase/appSpecs";

/**
 * Build the static site from a content corpus into
 * `opts.outDir`: `plggmatic`'s framework build
 * (discover → link-check → render → assets → 404, one
 * typed transform pipeline that never throws) run with
 * the press {@link buildSpecOf} declaration — the
 * Markdown → highlight → theme router, the theme 404
 * body, and the docs link-check policy. `opts.base` is
 * threaded into the theme + injected `href` resolver so
 * the deploy base is applied in exactly one place. The
 * error channel folds to `SsgError | Defect |
 * BrokenLinks` at the edge.
 */
export const build = (
  opts: PressOptions,
): PromisedResult<
  BuildReport,
  SsgError | Defect | BrokenLinks
> =>
  frameworkBuild(
    appOptionsOf(opts),
    buildSpecOf(
      opts.config,
      opts.contentDir,
      opts.base,
    ),
  );
