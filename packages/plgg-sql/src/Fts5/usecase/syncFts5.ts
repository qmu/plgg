import {
  type Result,
  type InvalidError,
  invalidError,
  match,
  ok,
  err,
} from "plgg";
import {
  type Sql,
  sql,
  identSql,
} from "plgg-sql/Sql/model/Sql";
import { type SqlIdent } from "plgg-sql/Sql/model/SqlIdent";
import {
  type Fts5Table,
  type Fts5Column,
  normalContent$,
  contentlessContent$,
  externalContent$,
} from "plgg-sql/Fts5/model/Fts5Table";

/**
 * The `'rebuild'` command: `INSERT INTO t(t) VALUES('rebuild')`
 * — FTS5's re-derive-the-index-from-source lever (the D4
 * "derived, rebuildable" guarantee). Zero params; the FTS5
 * column named after the table and the `'rebuild'` literal
 * are both trusted. Run through `execScript`/`run`.
 */
export const fts5Rebuild = (
  table: SqlIdent,
): Sql =>
  sql`INSERT INTO ${identSql(table)}(${identSql(table)}) VALUES('rebuild')`;

// Comma-join fragments (non-empty by the model invariant).
const commaJoin = (
  frags: ReadonlyArray<Sql>,
): Sql =>
  frags.reduce((acc, f) => sql`${acc}, ${f}`);

const colList = (
  cols: ReadonlyArray<Fts5Column>,
): Sql =>
  commaJoin(cols.map((c) => sql`${identSql(c.name)}`));

// `new.col` / `old.col` reference lists for the trigger bodies.
const refList = (
  ref: Sql,
  cols: ReadonlyArray<Fts5Column>,
): Sql =>
  commaJoin(
    cols.map((c) => sql`${ref}${identSql(c.name)}`),
  );

// The three external-content sync triggers (SQLite FTS5's
// canonical AI/AD/AU set): insert mirrors new rows; delete
// and update emit the FTS5 `'delete'` command for the old
// row (external-content tables cannot delete by content, so
// the old values must be supplied). Each is ONE statement
// with embedded semicolons inside BEGIN…END — run through
// `execScript` (trusted DDL), never a prepared `run`.
const triggersFor = (
  fts: SqlIdent,
  src: SqlIdent,
  rowid: SqlIdent,
  cols: ReadonlyArray<Fts5Column>,
): ReadonlyArray<Sql> => {
  const newRefs = sql`new.`;
  const oldRefs = sql`old.`;
  const ai = sql`CREATE TRIGGER ${identSql(fts)}_ai AFTER INSERT ON ${identSql(src)} BEGIN INSERT INTO ${identSql(fts)}(rowid, ${colList(cols)}) VALUES (new.${identSql(rowid)}, ${refList(newRefs, cols)}); END`;
  const ad = sql`CREATE TRIGGER ${identSql(fts)}_ad AFTER DELETE ON ${identSql(src)} BEGIN INSERT INTO ${identSql(fts)}(${identSql(fts)}, rowid, ${colList(cols)}) VALUES ('delete', old.${identSql(rowid)}, ${refList(oldRefs, cols)}); END`;
  const au = sql`CREATE TRIGGER ${identSql(fts)}_au AFTER UPDATE ON ${identSql(src)} BEGIN INSERT INTO ${identSql(fts)}(${identSql(fts)}, rowid, ${colList(cols)}) VALUES ('delete', old.${identSql(rowid)}, ${refList(oldRefs, cols)}); INSERT INTO ${identSql(fts)}(rowid, ${colList(cols)}) VALUES (new.${identSql(rowid)}, ${refList(newRefs, cols)}); END`;
  return [ai, ad, au];
};

/**
 * The external-content sync triggers for a spec, or an `Err`
 * if the table is not `ExternalContent` (Normal/Contentless
 * tables keep their index another way — a direct write or
 * `fts5Rebuild` — so triggers would be meaningless there).
 * The trigger contract assumes the source table carries a
 * column named like each FTS column plus the `content_rowid`
 * key — the standard FTS5 external-content shape.
 */
export const fts5SyncTriggers = (
  spec: Fts5Table,
): Result<ReadonlyArray<Sql>, InvalidError> =>
  match(spec.content)(
    [
      externalContent$(),
      (
        e,
      ): Result<
        ReadonlyArray<Sql>,
        InvalidError
      > =>
        ok(
          triggersFor(
            spec.name,
            e.content.table,
            e.content.rowid,
            spec.columns,
          ),
        ),
    ],
    [
      normalContent$(),
      (): Result<
        ReadonlyArray<Sql>,
        InvalidError
      > =>
        err(
          invalidError({
            message:
              "fts5SyncTriggers requires ExternalContent (Normal tables index on write)",
          }),
        ),
    ],
    [
      contentlessContent$(),
      (): Result<
        ReadonlyArray<Sql>,
        InvalidError
      > =>
        err(
          invalidError({
            message:
              "fts5SyncTriggers requires ExternalContent (Contentless tables rebuild)",
          }),
        ),
    ],
  );
