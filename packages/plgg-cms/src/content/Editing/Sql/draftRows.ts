import {
  type Result,
  type Option,
  type SoftStr,
  type InvalidError,
  ok,
  some,
  none,
  isErr,
  pipe,
  cast,
  mapResult,
  matchOption,
  fromNullable,
  asRawObj,
  asNum,
  asSoftStr,
  forProp,
} from "plgg";
import {
  type Draft,
  draft,
} from "plgg-cms/content/Editing/model/Draft";
import {
  type Revision,
  revision,
} from "plgg-cms/content/Editing/model/Revision";
import { asDraftStatus } from "plgg-cms/content/Editing/model/DraftStatus";

/** A nullable TEXT column → Option (SQL NULL → None). */
const asOptionalText = (
  v: unknown,
): Result<Option<SoftStr>, InvalidError> =>
  matchOption<
    unknown,
    Result<Option<SoftStr>, InvalidError>
  >(
    () => ok(none()),
    (s: unknown) => {
      const r = asSoftStr(s);
      return isErr(r) ? r : ok(some(r.content));
    },
  )(fromNullable(v));

/** Decode a `drafts` row into a {@link Draft}. */
export const asDraftRow = (
  row: unknown,
): Result<Draft, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("id", asNum),
      forProp("content_path", asSoftStr),
      forProp("status", asDraftStatus),
      forProp(
        "base_revision_hash",
        asOptionalText,
      ),
      forProp("created_by", asSoftStr),
      forProp("created_at", asNum),
      forProp("updated_at", asNum),
    ),
    mapResult((r) =>
      draft({
        id: r.id,
        contentPath: r.content_path,
        status: r.status,
        baseRevisionHash: r.base_revision_hash,
        createdBy: r.created_by,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }),
    ),
  );

/** Decode a `revisions` row into a {@link Revision}. */
export const asRevisionRow = (
  row: unknown,
): Result<Revision, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("id", asNum),
      forProp("draft_id", asNum),
      forProp("ordinal", asNum),
      forProp("body", asSoftStr),
      forProp("created_at", asNum),
    ),
    mapResult((r) =>
      revision({
        id: r.id,
        draftId: r.draft_id,
        ordinal: r.ordinal,
        body: r.body,
        createdAt: r.created_at,
      }),
    ),
  );

/** Decode an `id` projection (from an INSERT … RETURNING id). */
export const asIdRow = (
  row: unknown,
): Result<{ id: number }, InvalidError> =>
  cast(row, asRawObj, forProp("id", asNum));
