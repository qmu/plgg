/**
 * The three NAVIGATION VARIANTS the PoC compares side by
 * side, and their PURE query functions. Each variant is a
 * different way to navigate the non-tree classification
 * (classify.ts) over one corpus:
 *
 *   - tag-facets  — filter by a set of tags, AND or OR;
 *   - link-graph  — the neighbors (out + back links) of a
 *                   focus page;
 *   - multi-filter— combine tags with a path substring.
 *
 * A `VariantQuery` is a closed union; `runQuery` is total
 * and exhaustive, so every variant's search is a
 * deterministic pure function of (pages, query) — which is
 * exactly what makes "an agent can drive each variant's
 * search deterministically" checkable, and lets all three
 * render comparably at once.
 */
import {
  type SoftStr,
  type Option,
  some,
  none,
} from "plgg";
import {
  type Page,
  neighborsOf,
} from "./classify.ts";

/** Tag-facet combination mode. */
export type TagMode = "and" | "or";

export const TAG_MODES: ReadonlyArray<TagMode> = [
  "and",
  "or",
];

const oneOf = <T extends string>(
  catalog: ReadonlyArray<T>,
  raw: SoftStr,
): raw is T => catalog.some((c) => c === raw);

/** A raw string → a TagMode, if it names one. */
export const asTagMode = (
  raw: SoftStr,
): Option<TagMode> =>
  oneOf(TAG_MODES, raw) ? some(raw) : none();

export type TagFacetsQuery = Readonly<{
  tags: ReadonlyArray<SoftStr>;
  mode: TagMode;
}>;

export type LinkGraphQuery = Readonly<{
  focus: SoftStr;
}>;

export type MultiFilterQuery = Readonly<{
  tags: ReadonlyArray<SoftStr>;
  text: SoftStr;
}>;

/** One query, tagged by the variant it drives. */
export type VariantQuery =
  | Readonly<{
      kind: "tag-facets";
      query: TagFacetsQuery;
    }>
  | Readonly<{
      kind: "link-graph";
      query: LinkGraphQuery;
    }>
  | Readonly<{
      kind: "multi-filter";
      query: MultiFilterQuery;
    }>;

/** The variant identifiers, in display order. */
export type Variant = VariantQuery["kind"];

export const VARIANTS: ReadonlyArray<Variant> = [
  "tag-facets",
  "link-graph",
  "multi-filter",
];

/** The human label a variant shows. */
export const variantLabel = (
  variant: Variant,
): SoftStr => {
  switch (variant) {
    case "tag-facets":
      return "Tag facets";
    case "link-graph":
      return "Link / backlink graph";
    case "multi-filter":
      return "Multi-dimensional filter";
  }
};

/** A one-line description of what a variant navigates. */
export const variantBlurb = (
  variant: Variant,
): SoftStr => {
  switch (variant) {
    case "tag-facets":
      return "Filter by a set of tags, combined with AND or OR.";
    case "link-graph":
      return "The pages a focus page links to, plus the pages that link back to it.";
    case "multi-filter":
      return "Combine tags with a path substring — several dimensions at once.";
  }
};

/* ------------------------------------------------ *
 * The pure per-variant queries                      *
 * ------------------------------------------------ */

const runTagFacets = (
  pages: ReadonlyArray<Page>,
  query: TagFacetsQuery,
): ReadonlyArray<Page> =>
  query.tags.length === 0
    ? pages
    : pages.filter((p) =>
        query.mode === "and"
          ? query.tags.every((t) =>
              p.tags.includes(t),
            )
          : query.tags.some((t) =>
              p.tags.includes(t),
            ),
      );

const runLinkGraph = (
  pages: ReadonlyArray<Page>,
  query: LinkGraphQuery,
): ReadonlyArray<Page> => {
  const neighbors = new Set(
    neighborsOf(pages, query.focus),
  );
  return pages.filter((p) =>
    neighbors.has(p.path),
  );
};

const runMultiFilter = (
  pages: ReadonlyArray<Page>,
  query: MultiFilterQuery,
): ReadonlyArray<Page> =>
  pages.filter(
    (p) =>
      (query.tags.length === 0 ||
        query.tags.every((t) =>
          p.tags.includes(t),
        )) &&
      (query.text === "" ||
        p.path.includes(query.text)),
  );

/**
 * Run a variant's query — the single exhaustive entry the
 * view and the agent both call. Deterministic: same
 * (pages, query) always yields the same page set.
 */
export const runQuery = (
  pages: ReadonlyArray<Page>,
  vq: VariantQuery,
): ReadonlyArray<Page> => {
  switch (vq.kind) {
    case "tag-facets":
      return runTagFacets(pages, vq.query);
    case "link-graph":
      return runLinkGraph(pages, vq.query);
    case "multi-filter":
      return runMultiFilter(pages, vq.query);
  }
};
