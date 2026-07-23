/**
 * The sample site as pure data — the pages the central
 * configuration classifies, hides, and re-themes. A page
 * is just its corpus-relative path plus the tags DERIVED
 * from that path: the filesystem is a TREE, so the first
 * directory segment is the page's tag (root files fall
 * under "guide"). That derivation is exactly the
 * "classify by front-matter tags" surface the config's
 * TagDefs decorate — here sourced from the tree so the PoC
 * runs on the real guide corpus with no front matter
 * required.
 *
 * Every function is total and pure (no fs), so tag
 * derivation, the glob exclusion match, and the
 * visible-page filter are unit-tested offline. The serve
 * entry only supplies the sorted path list; all meaning is
 * computed here.
 */
import {
  type SoftStr,
  type Option,
  fromNullable,
} from "plgg";
import { type Config, type TagDef } from "./config.ts";

/** One page of the sample site. */
export type Page = Readonly<{
  path: SoftStr;
  tags: ReadonlyArray<SoftStr>;
}>;

/** Root-level pages (no directory) group under this tag. */
export const ROOT_TAG = "guide";

/**
 * The tag(s) a path belongs to: its first directory
 * segment, or {@link ROOT_TAG} when the file sits at the
 * corpus root. One tag per page keeps the tree→tag mapping
 * unambiguous; PoC 6 is where multi-tag/link grouping is
 * explored.
 */
export const derivePageTags = (
  path: SoftStr,
): ReadonlyArray<SoftStr> => {
  const segments = path.split("/");
  const head = segments[0];
  return segments.length > 1 &&
    head !== undefined &&
    head !== ""
    ? [head]
    : [ROOT_TAG];
};

/** Build the page list from a sorted path list. */
export const pagesFromPaths = (
  paths: ReadonlyArray<SoftStr>,
): ReadonlyArray<Page> =>
  paths.map((path) => ({
    path,
    tags: derivePageTags(path),
  }));

/**
 * Does a page path match an exclusion glob? A small,
 * total matcher supporting `**` (any run, crossing `/`)
 * and `*` (any run within one segment) — enough for the
 * exclusions a writer expresses ("contributing/**",
 * "*.md", "packages/plgg/index.md"). Every other character
 * is matched literally.
 */
export const matchesExclusion = (
  glob: SoftStr,
  path: SoftStr,
): boolean => {
  const pattern = glob
    .split("")
    .reduce<SoftStr>((acc, ch, i, all) => {
      if (ch === "*") {
        // "**" → any run (crosses "/"); a lone "*" → a
        // run within one path segment.
        return all[i - 1] === "*"
          ? acc + ".*"
          : all[i + 1] === "*"
            ? acc
            : acc + "[^/]*";
      }
      return /[a-zA-Z0-9/]/.test(ch)
        ? acc + ch
        : acc + "\\" + ch;
    }, "");
  return new RegExp(`^${pattern}$`).test(path);
};

/** Is a page hidden by any of the config's exclusions? */
export const pageExcluded = (
  config: Config,
  page: Page,
): boolean =>
  config.exclusions.some((glob) =>
    matchesExclusion(glob, page.path),
  );

/** The pages the site shows under the current config. */
export const visiblePages = (
  config: Config,
  pages: ReadonlyArray<Page>,
): ReadonlyArray<Page> =>
  pages.filter((page) => !pageExcluded(config, page));

/** The TagDef classifying `slug`, if the config has one. */
export const tagDefFor = (
  config: Config,
  slug: SoftStr,
): Option<TagDef> =>
  fromNullable(
    config.tags.find((t) => t.slug === slug),
  );
