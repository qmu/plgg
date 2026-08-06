import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  ok,
  some,
  none,
  pipe,
  chainResult,
  mapResult,
  matchOption,
  fromNullable,
} from "plgg";
import {
  type Block,
  type YamlMap,
  isHeading,
  parseFrontmatter,
  parseBlocks,
  foldYaml,
} from "plgg-md";
import { type IndexInput } from "plgg-cms/content/Ingest/usecase/indexDocument";
import { type SourcePage } from "plgg-cms/content/Ingest/model/SourcePage";
import { fingerprint } from "plgg-cms/domainCore/Domain/model/Fingerprint";

/**
 * What the corpus mapping needs beyond the pages
 * themselves. `rawHtml` must be the SITE's flag (read with
 * plggpress's `rawHtmlOf`), never a hardcoded default —
 * parsing the index under a different flag than the render
 * path would let the two disagree about what is markup.
 * `updatedAt` is supplied by the caller because ingest
 * carries no clock (the `projectStakeholderFeed`
 * precedent): a pure mapping that reads the time is not
 * pure, and its tests would need a frozen one.
 */
export type CorpusOptions = Readonly<{
  collection: SoftStr;
  rawHtml: boolean;
  updatedAt: SoftStr;
}>;

/**
 * The page's title: the text of its first level-1 heading,
 * `None` when it has none. Frontmatter is deliberately NOT
 * consulted — the corpus has no declared content model
 * (`SiteConfig.models` is `None` for the guide), so a
 * `title` key would be an attribute this layer invented a
 * meaning for. The H1 is what the rendered page shows.
 */
const titleOf = (
  blocks: ReadonlyArray<Block>,
): Option<SoftStr> =>
  pipe(
    fromNullable(
      blocks.find(
        (b: Block) =>
          isHeading(b) && b.content.level === 1,
      ),
    ),
    matchOption<Block, Option<SoftStr>>(
      () => none(),
      (b: Block) =>
        isHeading(b)
          ? some(b.content.text)
          : none(),
    ),
  );

/**
 * The frontmatter as the JSON string the `documents` row
 * carries. A page with no fence yields `{}` — the absence
 * of attributes, spelled as an empty object rather than as
 * a missing column, so every indexed document decodes the
 * same way.
 */
const attributesJsonOf = (
  data: Option<YamlMap>,
): SoftStr =>
  matchOption<YamlMap, SoftStr>(
    () => "{}",
    (map: YamlMap) =>
      JSON.stringify(foldYaml(map)),
  )(data);

/**
 * One source page → the index input for it.
 *
 * `contentHash` is a fingerprint of the RAW source
 * (frontmatter included), so an edit to either the
 * attributes or the body re-indexes the page while an
 * unchanged page is skipped by `indexDocument`. Hashing the
 * parsed blocks instead would make a frontmatter-only edit
 * invisible; hashing a timestamp would defeat the skip
 * entirely.
 */
export const indexInputOf =
  (opts: CorpusOptions) =>
  (
    page: SourcePage,
  ): Result<IndexInput, InvalidError> =>
    pipe(
      parseFrontmatter(page.source),
      chainResult((parsed) =>
        pipe(
          parseBlocks(parsed.body, opts.rawHtml),
          mapResult(
            (
              blocks: ReadonlyArray<Block>,
            ): IndexInput => ({
              collection: opts.collection,
              path: page.path,
              title: titleOf(blocks),
              attributesJson: attributesJsonOf(
                parsed.frontmatter.data,
              ),
              blocks,
              contentHash: fingerprint(
                page.source,
              ),
              updatedAt: opts.updatedAt,
            }),
          ),
        ),
      ),
    );

/**
 * The whole corpus → the index inputs for it, failing on
 * the first page that will not parse.
 *
 * This is the pure half of the ingest, and it is pure on
 * purpose: it is where every branch worth testing lives (a
 * page with no H1, a page with no fence, a malformed
 * fence), while the surrounding shell only reads files.
 * Failing loudly on a bad page rather than skipping it is
 * the same call `checkModels` makes at build time — a
 * corpus that cannot be parsed is a corpus the served index
 * would silently under-report.
 */
export const indexInputsOf =
  (opts: CorpusOptions) =>
  (
    pages: ReadonlyArray<SourcePage>,
  ): Result<
    ReadonlyArray<IndexInput>,
    InvalidError
  > =>
    pages.reduce<
      Result<
        ReadonlyArray<IndexInput>,
        InvalidError
      >
    >(
      (acc, page: SourcePage) =>
        pipe(
          acc,
          chainResult(
            (
              soFar: ReadonlyArray<IndexInput>,
            ): Result<
              ReadonlyArray<IndexInput>,
              InvalidError
            > =>
              pipe(
                indexInputOf(opts)(page),
                mapResult(
                  (
                    input: IndexInput,
                  ): ReadonlyArray<IndexInput> => [
                    ...soFar,
                    input,
                  ],
                ),
              ),
          ),
        ),
      ok([]),
    );
