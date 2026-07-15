/**
 * The PURE HEART of PoC 6 — turning a tree-shaped corpus
 * into NON-TREE classification data. The filesystem is a
 * tree, but knowledge is multi-dimensional: a page belongs
 * to several tags and links to several others. This module
 * derives, from each page's path and markdown text:
 *
 *   - TAGS: every directory segment of the path (so
 *     `packages/plgg/index.md` is both `packages` and
 *     `plgg`), plus any front-matter `tags:` — the
 *     multi-dimensional grouping the variants navigate;
 *   - LINKS: the in-corpus markdown links the page makes,
 *     resolved against its directory — the graph edges the
 *     link/backlink variant traverses.
 *
 * Every function is total and pure (no fs, no DOM): tag
 * derivation, front-matter parsing, link resolution, and
 * the tag/backlink adjacencies are all unit-tested offline.
 * The serve entry only supplies `{path, text}` pairs; all
 * meaning is computed here.
 */
import { type SoftStr } from "plgg";

/** One classified page. */
export type Page = Readonly<{
  path: SoftStr;
  tags: ReadonlyArray<SoftStr>;
  links: ReadonlyArray<SoftStr>;
}>;

/** Root-level pages (no directory) group under this tag. */
export const ROOT_TAG = "guide";

/** The directory part of a path ("" for a root file). */
const dirOf = (path: SoftStr): SoftStr => {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
};

/**
 * The tags a path's TREE position gives it: every
 * directory segment, or {@link ROOT_TAG} for a root file.
 * `packages/plgg/index.md` → `packages`, `plgg`.
 */
export const pathTags = (
  path: SoftStr,
): ReadonlyArray<SoftStr> => {
  const dir = dirOf(path);
  return dir === "" ? [ROOT_TAG] : dir.split("/");
};

/**
 * Front-matter tags, if the page opens with a `---` block
 * carrying a one-line `tags:` — either inline-array
 * (`tags: [a, b]`) or comma (`tags: a, b`) form. Total: no
 * front matter, or no `tags:` line, → empty.
 */
export const frontMatterTags = (
  text: SoftStr,
): ReadonlyArray<SoftStr> => {
  if (!text.startsWith("---")) {
    return [];
  }
  const end = text.indexOf("\n---", 3);
  if (end < 0) {
    return [];
  }
  const block = text.slice(3, end);
  const line = block
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("tags:"));
  if (line === undefined) {
    return [];
  }
  return line
    .slice("tags:".length)
    .replace(/^\s*\[/, "")
    .replace(/\]\s*$/, "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t !== "");
};

/** Unique, order-preserving. */
const uniq = (
  xs: ReadonlyArray<SoftStr>,
): ReadonlyArray<SoftStr> => [...new Set(xs)];

/** A page's full tag set: tree tags + front-matter tags. */
export const pageTags = (
  path: SoftStr,
  text: SoftStr,
): ReadonlyArray<SoftStr> =>
  uniq([...pathTags(path), ...frontMatterTags(text)]);

/** Normalize a segment list, resolving `.` and `..`. */
const normalize = (
  segments: ReadonlyArray<SoftStr>,
): ReadonlyArray<SoftStr> =>
  segments.reduce<ReadonlyArray<SoftStr>>(
    (acc, seg) =>
      seg === "" || seg === "."
        ? acc
        : seg === ".."
          ? acc.slice(0, Math.max(0, acc.length - 1))
          : [...acc, seg],
    [],
  );

/**
 * Resolve a markdown link target (relative to the linking
 * page's directory) to a corpus-relative path. A leading
 * `/` is treated as corpus-root-relative.
 */
export const resolveLink = (
  fromPath: SoftStr,
  target: SoftStr,
): SoftStr => {
  const clean = target.split("#")[0]?.split("?")[0] ?? "";
  if (clean === "") {
    return "";
  }
  const base = clean.startsWith("/")
    ? clean.slice(1).split("/")
    : [...dirOf(fromPath).split("/"), ...clean.split("/")];
  return normalize(base).join("/");
};

/**
 * Every in-corpus `.md` link the page makes, resolved and
 * de-duped, keeping only targets that are known pages (a
 * dangling or external link is dropped).
 */
export const extractLinks = (
  fromPath: SoftStr,
  text: SoftStr,
  known: ReadonlySet<SoftStr>,
): ReadonlyArray<SoftStr> =>
  uniq(
    [...text.matchAll(/\]\(([^)]+)\)/g)]
      .map((m) =>
        resolveLink(fromPath, m[1] ?? ""),
      )
      .filter(
        (resolved) =>
          resolved.endsWith(".md") &&
          resolved !== fromPath &&
          known.has(resolved),
      ),
  );

/** Build the classified page set from `{path, text}` pairs. */
export const buildPages = (
  entries: ReadonlyArray<
    Readonly<{ path: SoftStr; text: SoftStr }>
  >,
): ReadonlyArray<Page> => {
  const known = new Set(entries.map((e) => e.path));
  return entries.map((e) => ({
    path: e.path,
    tags: pageTags(e.path, e.text),
    links: extractLinks(e.path, e.text, known),
  }));
};

/* ------------------------------------------------ *
 * Non-tree adjacencies (queried by the variants)    *
 * ------------------------------------------------ */

/** Every tag across the corpus, sorted, with no repeats. */
export const allTags = (
  pages: ReadonlyArray<Page>,
): ReadonlyArray<SoftStr> =>
  [
    ...new Set(pages.flatMap((p) => p.tags)),
  ].sort();

/** How many pages carry a tag (the facet's count). */
export const tagCount = (
  pages: ReadonlyArray<Page>,
  tag: SoftStr,
): number =>
  pages.filter((p) => p.tags.includes(tag)).length;

/** The pages that link TO `path` (its backlinks). */
export const backlinksOf = (
  pages: ReadonlyArray<Page>,
  path: SoftStr,
): ReadonlyArray<SoftStr> =>
  pages
    .filter((p) => p.links.includes(path))
    .map((p) => p.path);

/**
 * The neighbors of a focus page in the link graph: the
 * pages it links to (outbound) unioned with the pages that
 * link to it (inbound/backlinks), de-duped.
 */
export const neighborsOf = (
  pages: ReadonlyArray<Page>,
  focus: SoftStr,
): ReadonlyArray<SoftStr> => {
  const page = pages.find((p) => p.path === focus);
  const outbound = page?.links ?? [];
  return uniq([
    ...outbound,
    ...backlinksOf(pages, focus),
  ]);
};
