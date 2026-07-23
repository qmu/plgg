import {
  type Result,
  type Option,
  type InvalidError,
  ok,
  err,
  some,
  none,
  proc,
  matchResult,
} from "plgg";
import {
  type Db,
  sql,
  query,
  exec,
  decodeRow,
  decodeRows,
} from "plgg-sql";
import { type DraftStore } from "plgg-cms/content/Editing/model/DraftStore";
import { type Draft } from "plgg-cms/content/Editing/model/Draft";
import { type Revision } from "plgg-cms/content/Editing/model/Revision";
import {
  asDraftRow,
  asRevisionRow,
  asIdRow,
} from "plgg-cms/content/Editing/Sql/draftRows";

const firstDraft = (
  rows: ReadonlyArray<unknown>,
): Result<Option<Draft>, InvalidError> => {
  const head = rows[0];
  return head === undefined
    ? ok(none())
    : matchResult<
        Draft,
        InvalidError,
        Result<Option<Draft>, InvalidError>
      >(
        (e) => err(e),
        (d: Draft) => ok(some(d)),
      )(asDraftRow(head));
};

const firstRevision = (
  rows: ReadonlyArray<unknown>,
): Result<Option<Revision>, InvalidError> => {
  const head = rows[0];
  return head === undefined
    ? ok(none())
    : matchResult<
        Revision,
        InvalidError,
        Result<Option<Revision>, InvalidError>
      >(
        (e) => err(e),
        (r: Revision) => ok(some(r)),
      )(asRevisionRow(head));
};

/**
 * The {@link DraftStore} over a `Db` (the durable file from
 * {@link openDraftStore}). Every value is `sql`-bound (an
 * Option binds to NULL), every row caster-decoded, and `save*`
 * return the auto-assigned id via `RETURNING id`. Single
 * statements; the transactional draft+revision composition and
 * the ownership guard live in the usecases.
 */
export const sqlDraftStore = (
  db: Db,
): DraftStore => ({
  saveDraft: (d) =>
    proc(
      query(db)(
        sql`INSERT INTO drafts (content_path, status, base_revision_hash, created_by, created_at, updated_at) VALUES (${d.contentPath}, ${d.status}, ${d.baseRevisionHash}, ${d.createdBy}, ${d.createdAt}, ${d.updatedAt}) RETURNING id`,
      ),
      decodeRow(asIdRow),
      (r: { id: number }) => ok(r.id),
    ),
  findDraft: (id) =>
    proc(
      query(db)(
        sql`SELECT * FROM drafts WHERE id = ${id}`,
      ),
      firstDraft,
    ),
  listDrafts: (filter) =>
    proc(
      query(db)(
        sql`SELECT * FROM drafts WHERE (${filter.createdBy} IS NULL OR created_by = ${filter.createdBy}) AND (${filter.status} IS NULL OR status = ${filter.status}) ORDER BY updated_at DESC`,
      ),
      decodeRows(asDraftRow),
    ),
  updateStatus: (id, status, updatedAt) =>
    proc(
      exec(db)(
        sql`UPDATE drafts SET status = ${status}, updated_at = ${updatedAt} WHERE id = ${id}`,
      ),
      () => ok(null),
    ),
  saveRevision: (r) =>
    proc(
      query(db)(
        sql`INSERT INTO revisions (draft_id, ordinal, body, created_at) VALUES (${r.draftId}, ${r.ordinal}, ${r.body}, ${r.createdAt}) RETURNING id`,
      ),
      decodeRow(asIdRow),
      (row: { id: number }) => ok(row.id),
    ),
  latestRevision: (draftId) =>
    proc(
      query(db)(
        sql`SELECT * FROM revisions WHERE draft_id = ${draftId} ORDER BY ordinal DESC LIMIT 1`,
      ),
      firstRevision,
    ),
});
