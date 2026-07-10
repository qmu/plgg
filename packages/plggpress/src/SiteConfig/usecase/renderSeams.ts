import { pipe, getOr, matchOption } from "plgg";
import {
  type SlugFn,
  type RenderOptions,
  type Highlighter,
  type LinkResolver,
  slugify,
  githubSlugify,
} from "plgg-md";
import {
  type SiteConfig,
  type SluggerKind,
} from "plggpress/SiteConfig/model/SiteConfig";

/**
 * The configured raw-HTML mode: the site's `rawHtml` flag,
 * defaulting to `false` (the spike default — angle
 * brackets escape as text) when the config omits it, so
 * every existing config renders byte-identically.
 */
export const rawHtmlOf = (
  config: SiteConfig,
): boolean =>
  pipe(config.rawHtml, getOr<boolean>(false));

/** Maps a declared {@link SluggerKind} to its base slugger. */
const slugFnOf = (kind: SluggerKind): SlugFn =>
  kind === "github" ? githubSlugify : slugify;

/**
 * The configured base heading slugger: `githubSlugify` when
 * the site declares `slugger: "github"`, else the
 * VitePress-exact {@link slugify} (the default, so the
 * guide's anchors are unchanged).
 */
export const sluggerOf = (
  config: SiteConfig,
): SlugFn =>
  pipe(
    config.slugger,
    matchOption((): SlugFn => slugify, slugFnOf),
  );

/**
 * Assembles the plgg-md {@link RenderOptions} for a page
 * render from the site config plus the two element-producing
 * seams the caller supplies (`highlighter`, `resolveLink`):
 * the site's `rawHtml` mode and configured base slugger,
 * both defaulted so a config that declares neither renders
 * exactly as before. The one place a `SiteConfig`'s render
 * knobs cross into plgg-md.
 */
export const pressRenderOptions = (
  config: SiteConfig,
  highlighter: Highlighter,
  resolveLink: LinkResolver,
): RenderOptions => ({
  highlighter,
  resolveLink,
  rawHtml: rawHtmlOf(config),
  slug: sluggerOf(config),
});
