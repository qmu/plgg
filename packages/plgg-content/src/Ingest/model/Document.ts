import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  pipe,
  cast,
  asRawObj,
  asNum,
  asSoftStr,
  forProp,
  chainResult,
  matchOption,
  fromNullable,
  isErr,
  some,
  none,
  ok,
  decodeJson,
} from "plgg";

/**
 * One indexed page as served — the `documents` row with its
 * `attributes_json` parsed back to plain data. `title` is
 * `None` when the column is NULL (a page with no H1/title).
 * `attributes` is the ticket-17-validated typed frontmatter
 * (opaque here: plgg-content stores and returns it, the
 * validating layer upstream owns its shape).
 */
export type Document = Readonly<{
  id: number;
  collection: SoftStr;
  path: SoftStr;
  title: Option<SoftStr>;
  contentHash: SoftStr;
  attributes: unknown;
  updatedAt: SoftStr;
}>;

/** A nullable TEXT column → `Option<SoftStr>` (null ⇒ None). */
const asOptionalText = (
  v: unknown,
): Result<Option<SoftStr>, InvalidError> =>
  matchOption<
    unknown,
    Result<Option<SoftStr>, InvalidError>
  >(
    (): Result<Option<SoftStr>, InvalidError> =>
      ok(none()),
    (
      s: unknown,
    ): Result<Option<SoftStr>, InvalidError> => {
      const r = asSoftStr(s);
      return isErr(r) ? r : ok(some(r.content));
    },
  )(fromNullable(v));

/**
 * Decodes a raw `documents` row (snake_case columns, a
 * serialized `attributes_json`) into a typed {@link Document}
 * — the `decodeRows(asDocument)` mapper for every read path.
 * Total: a malformed row or unparseable JSON is an `Err`.
 */
export const asDocument = (
  row: unknown,
): Result<Document, InvalidError> =>
  pipe(
    // asRawObj (not asObj): a SQL NULL column is JS `null`,
    // which is not a Datum — asObj would reject the whole
    // row. Nullability is handled per-column below.
    cast(
      row,
      asRawObj,
      forProp("id", asNum),
      forProp("collection", asSoftStr),
      forProp("path", asSoftStr),
      forProp("title", asOptionalText),
      forProp("content_hash", asSoftStr),
      forProp("attributes_json", asSoftStr),
      forProp("updated_at", asSoftStr),
    ),
    chainResult(
      (r: {
        id: number;
        collection: SoftStr;
        path: SoftStr;
        title: Option<SoftStr>;
        content_hash: SoftStr;
        attributes_json: SoftStr;
        updated_at: SoftStr;
      }): Result<Document, InvalidError> => {
        const parsed = decodeJson(
          r.attributes_json,
        );
        return isErr(parsed)
          ? parsed
          : ok({
              id: r.id,
              collection: r.collection,
              path: r.path,
              title: r.title,
              contentHash: r.content_hash,
              attributes: parsed.content,
              updatedAt: r.updated_at,
            });
      },
    ),
  );
