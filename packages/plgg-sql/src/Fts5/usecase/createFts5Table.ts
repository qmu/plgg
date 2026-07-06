import { match, matchOption } from "plgg";
import {
  type Sql,
  sql,
  identSql,
} from "plgg-sql/Sql/model/Sql";
import {
  type Fts5Table,
  type Fts5Column,
  type Fts5Content,
  type Fts5Tokenizer,
  normalContent$,
  contentlessContent$,
  externalContent$,
} from "plgg-sql/Fts5/model/Fts5Table";

// One column: its identifier, optionally `UNINDEXED`. Names
// ride in as `identSql` fragments (zero params, brand-safe).
const columnFrag = (col: Fts5Column): Sql =>
  col.unindexed
    ? sql`${identSql(col.name)} UNINDEXED`
    : sql`${identSql(col.name)}`;

// Comma-join a non-empty list of fragments (the model
// guarantees at least one column, so the seedless reduce is
// safe). Each splice carries no params.
const commaJoin = (
  frags: ReadonlyArray<Sql>,
): Sql =>
  frags.reduce((acc, f) => sql`${acc}, ${f}`);

// The `content=` clause per mode, prefixed with `, ` so it
// appends after the columns. Contentless renders `content=''`;
// external names its source table + rowid as quoted string
// literals (the identifiers splice inside the quotes, and the
// SqlIdent grammar forbids `'`, so no quote can break out).
const contentClause = (c: Fts5Content): Sql =>
  match(c)(
    [normalContent$(), (): Sql => sql``],
    [
      contentlessContent$(),
      (): Sql => sql`, content=''`,
    ],
    [
      externalContent$(),
      (e): Sql =>
        sql`, content='${identSql(e.content.table)}', content_rowid='${identSql(e.content.rowid)}'`,
    ],
  );

// The `tokenize=` clause. A Record over the closed tokenizer
// union is exhaustive by construction — adding a tokenizer
// without its clause is a `tsc` error. Each value is a fully
// static, trusted template (zero params, no dynamic splice).
const TOKENIZE: Record<Fts5Tokenizer, Sql> = {
  unicode61: sql`, tokenize = 'unicode61'`,
  porter: sql`, tokenize = 'porter'`,
  trigram: sql`, tokenize = 'trigram'`,
  ascii: sql`, tokenize = 'ascii'`,
};

/**
 * Render an {@link Fts5Table} spec as a
 * `CREATE VIRTUAL TABLE … USING fts5(…)` statement — a
 * zero-parameter {@link Sql} (all names ride in through
 * `identSql`, all options are trusted closed-union literals),
 * so it is safe to `execScript` or emit as a migration body.
 * Deterministic: the same spec always renders the same text.
 */
export const createFts5Table = (
  table: Fts5Table,
): Sql =>
  sql`CREATE VIRTUAL TABLE ${identSql(table.name)} USING fts5(${commaJoin(
    table.columns.map(columnFrag),
  )}${contentClause(table.content)}${matchOption(
    (): Sql => sql``,
    (t: Fts5Tokenizer): Sql => TOKENIZE[t],
  )(table.tokenizer)})`;
