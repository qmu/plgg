import { type SoftStr } from "plgg";
import { type Document } from "plgg-cms/content/Ingest/model/Document";

/**
 * A MicroCMS-shaped list response: the page of `contents`
 * plus the `totalCount` under the same filter and the echoed
 * paging window, so a delivery consumer can paginate.
 */
export type ListResult = Readonly<{
  contents: ReadonlyArray<Document>;
  totalCount: number;
  limit: number;
  offset: number;
}>;

/**
 * One FTS5 search hit — the matched {@link Document}, the
 * `headingPath` of the best-matching chunk (the section a
 * consumer deep-links to), and the BM25 `rank` (lower is
 * more relevant).
 */
export type SearchHit = Readonly<{
  document: Document;
  headingPath: SoftStr;
  rank: number;
}>;
