import {
  type SoftStr,
  type Num,
  type Option,
  matchOption,
} from "plgg";
import {
  type Sql,
  sql,
  identSql,
} from "plgg-sql/Sql/model/Sql";
import { type SqlIdent } from "plgg-sql/Sql/model/SqlIdent";

/**
 * A `<table> MATCH ?` fragment with the query string BOUND
 * as a parameter (injection-safe by construction — user text
 * never reaches SQL). The table name rides in as an
 * `identSql` fragment. FTS5 still parses the bound string
 * with its own query grammar, so a raw user string can throw
 * an fts5 *syntax* error at runtime — sanitize hostile input
 * through {@link fts5Phrase} first; a developer-authored
 * advanced query may be passed directly (a slip surfaces as a
 * `SqlError` on the `Result` channel, never a throw).
 *
 * ```ts
 * sql`SELECT * FROM ${identSql(docs)} WHERE ${fts5Match(docs)(fts5Phrase(input))}`
 * ```
 */
export const fts5Match =
  (table: SqlIdent) =>
  (query: SoftStr): Sql =>
    sql`${identSql(table)} MATCH ${query}`;

// Join bm25 weight params as `, ?, ?, …` (each weight bound),
// seeded empty so no-weights renders nothing.
const weightFrags = (
  weights: ReadonlyArray<Num>,
): Sql =>
  weights.reduce(
    (acc, w) => sql`${acc}, ${w}`,
    sql``,
  );

/**
 * A `bm25(<table>[, ?, …])` ranking expression — lower is
 * more relevant, so consumers `ORDER BY` it ascending.
 * Optional per-column `weights` are BOUND as parameters
 * (`Some([...])`), so `bm25(t, 1.0, 0.5)` is expressed
 * without any value reaching SQL text; `None` is the
 * unweighted `bm25(t)`.
 */
export const bm25Rank = (
  table: SqlIdent,
  weights: Option<ReadonlyArray<Num>>,
): Sql =>
  matchOption(
    (): Sql => sql`bm25(${identSql(table)})`,
    (ws: ReadonlyArray<Num>): Sql =>
      sql`bm25(${identSql(table)}${weightFrags(ws)})`,
  )(weights);

/**
 * Turn arbitrary user text into a crash-safe FTS5 query
 * string: split on whitespace and wrap each token in a double
 * -quoted phrase (embedded `"` doubled), so metacharacters a
 * visitor might type (`"`, `(`, `*`, `AND`, unbalanced
 * quotes) become literal phrase text instead of an fts5
 * syntax error. Multiple tokens become space-separated
 * phrases (an implicit AND). Empty/whitespace-only input
 * yields `""` — a valid query that matches nothing rather
 * than throwing. Verified against the real engine in the spec.
 *
 * Bind the result through {@link fts5Match}; a developer who
 * wants FTS5's operators keeps authoring the query string
 * directly and binding it — this is the sanitizer for the
 * always-on search box, not a required funnel.
 */
export const fts5Phrase = (
  userInput: SoftStr,
): SoftStr => {
  const tokens = userInput
    .split(/\s+/)
    .filter((t) => t.length > 0);
  return tokens.length === 0
    ? '""'
    : tokens
        .map((t) => `"${t.replace(/"/g, '""')}"`)
        .join(" ");
};
