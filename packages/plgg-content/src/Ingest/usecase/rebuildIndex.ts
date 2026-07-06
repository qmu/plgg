import {
  type SoftStr,
  type InvalidError,
  type PromisedResult,
  type Defect,
  proc,
  ok,
  err,
  matchResult,
} from "plgg";
import {
  type Db,
  type SqlError,
  type Sql,
  sql,
  exec,
} from "plgg-sql";
import {
  type IndexInput,
  indexDocument,
} from "plgg-content/Ingest/usecase/indexDocument";

type RebuildError = SqlError | InvalidError | Defect;

/** A full-rebuild report: rows (re)indexed and stale rows pruned. */
export type RebuildReport = Readonly<{
  indexed: number;
  pruned: number;
}>;

/** Ingests every input in order (sequential fold, short-circuiting). */
const ingestAll = (
  db: Db,
  inputs: ReadonlyArray<IndexInput>,
): PromisedResult<null, RebuildError> =>
  inputs.reduce<
    PromisedResult<null, RebuildError>
  >(
    (acc, input: IndexInput) =>
      acc.then(
        matchResult<
          null,
          RebuildError,
          PromisedResult<null, RebuildError>
        >(
          (e: RebuildError) =>
            Promise.resolve(err(e)),
          () =>
            proc(indexDocument(db)(input), () =>
              ok(null),
            ),
        ),
      ),
    Promise.resolve(ok(null)),
  );

const commaValues = (
  paths: ReadonlyArray<SoftStr>,
): Sql =>
  paths.reduce(
    (acc: Sql, p: SoftStr, i: number) =>
      i === 0 ? sql`${p}` : sql`${acc}, ${p}`,
    sql``,
  );

/**
 * Removes documents whose `path` is no longer in the corpus
 * (D4: the index tracks git exactly). Empty corpus ⇒ prune
 * all. Returns the number pruned.
 */
const pruneMissing = (
  db: Db,
  keep: ReadonlyArray<SoftStr>,
): PromisedResult<
  number,
  SqlError | Defect
> =>
  proc(
    exec(db)(
      keep.length === 0
        ? sql`DELETE FROM documents`
        : sql`DELETE FROM documents WHERE path NOT IN (${commaValues(keep)})`,
    ),
    (r) => ok(Number(r.changes)),
  );

/**
 * Full, idempotent rebuild (D4's PRIMARY operation): ingest
 * the whole corpus, then prune documents no longer present.
 * A dropped DB → `openIndex` → `rebuildIndex` yields an
 * identical index (the recoverability contract). All writes
 * ride the per-document transactions; re-running on an
 * unchanged corpus writes nothing.
 */
export const rebuildIndex =
  (db: Db) =>
  (
    inputs: ReadonlyArray<IndexInput>,
  ): PromisedResult<
    RebuildReport,
    RebuildError
  > =>
    proc(
      ingestAll(db, inputs),
      () =>
        pruneMissing(
          db,
          inputs.map((i) => i.path),
        ),
      (pruned: number) =>
        ok({ indexed: inputs.length, pruned }),
    );

/**
 * The single-file incremental removal path (`syncDocument`'s
 * delete case); re-indexing one file is just
 * {@link indexDocument}. Idempotent — removing an absent
 * path is a no-op.
 */
export const removeDocument =
  (db: Db) =>
  (
    path: SoftStr,
  ): PromisedResult<null, SqlError | Defect> =>
    proc(
      exec(db)(
        sql`DELETE FROM documents WHERE path = ${path}`,
      ),
      () => ok(null),
    );
