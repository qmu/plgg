import {
  type SoftStr,
  type PromisedResult,
  type InvalidError,
  type Defect,
  ok,
  proc,
} from "plgg";
import { type Db, type SqlError } from "plgg-sql";
import {
  type SsgError,
  discoverPaths,
} from "plgg-server/ssg";
import {
  type SiteConfig,
  type Page,
  collectPages,
  rawHtmlOf,
} from "plggpress";
import {
  type RebuildReport,
  rebuildIndex,
} from "plgg-cms/content/Ingest/usecase/rebuildIndex";
import { indexInputsOf } from "plgg-cms/content/Ingest/usecase/indexInputsOf";
import { type SourcePage } from "plgg-cms/content/Ingest/model/SourcePage";
import { registerCollection } from "plgg-cms/content/Query/usecase/registerCollection";
import { collectionSchema } from "plgg-cms/content/Query/model/CollectionSchema";

/**
 * Every way the ingest can fail, as data. `SsgError` rides
 * along because the corpus walk is the SSG's own
 * `discoverPaths` — reusing the reader means reusing its
 * error vocabulary rather than flattening it to a Defect
 * and losing which path could not be read.
 */
export type CorpusIngestError =
  SqlError | InvalidError | Defect | SsgError;

/**
 * A one-line description of an ingest failure. Not every
 * variant carries a `message` — `SsgError`'s `RenderFailed`
 * carries a path and an HTTP error — so the tag is the
 * honest fallback rather than an empty string that would
 * report a failure as if it had no cause.
 */
export const corpusIngestErrorMessage = (
  e: CorpusIngestError,
): SoftStr =>
  "message" in e.content &&
  typeof e.content.message === "string"
    ? e.content.message
    : e.__tag;

/**
 * The collection every corpus page is filed under. A single
 * name, because the corpus is one body of documentation —
 * an MCP client that read `list_collections` gets this back
 * and passes it to `get_article` verbatim.
 */
export const CORPUS_COLLECTION = "content";

/** plggpress's reader output, at the boundary. */
const asSourcePage = (
  page: Page,
): SourcePage => ({
  path: page.path,
  source: page.source,
});

/**
 * Reads the Markdown corpus under `contentDir` and rebuilds
 * the derived content index from it, returning what it did.
 *
 * This is the step ticket 16 specified and deferred: its
 * adapter, its schema, and its query side all shipped, so
 * the served index existed and answered — over zero rows.
 * The MCP tools, the delivery API and the admin browser all
 * read that one index, so filling it here lights all of
 * them at once.
 *
 * It is entry-point independent on purpose. `serve` calls
 * it at boot today, but the same call works from the CLI or
 * from a spec, which is what keeps the decision of WHAT to
 * index out of the server shell.
 *
 * Re-running is safe and is the intended use: `rebuildIndex`
 * skips pages whose `contentHash` is unchanged and prunes
 * documents whose file is gone, so the index converges on
 * the corpus rather than accumulating.
 */
export const ingestCorpus =
  (db: Db) =>
  (
    contentDir: SoftStr,
    config: SiteConfig,
    updatedAt: SoftStr,
  ): PromisedResult<
    RebuildReport,
    CorpusIngestError
  > =>
    proc(
      registerCollection(db)(
        collectionSchema(CORPUS_COLLECTION, []),
      ),
      () => discoverPaths(contentDir),
      (paths: ReadonlyArray<SoftStr>) =>
        collectPages(contentDir)(paths),
      (pages: ReadonlyArray<Page>) =>
        indexInputsOf({
          collection: CORPUS_COLLECTION,
          rawHtml: rawHtmlOf(config),
          updatedAt,
        })(pages.map(asSourcePage)),
      rebuildIndex(db),
      (report: RebuildReport) => ok(report),
    );
