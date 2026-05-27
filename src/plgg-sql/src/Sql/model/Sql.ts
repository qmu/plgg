import {
  Box,
  SoftStr,
  Num,
  Bool,
  box,
  isBoxWithTag,
} from "plgg";

/**
 * A value that may be bound as a SQL parameter — the primitives a placeholder
 * can carry, plus SQL `NULL`. User-supplied values are always of this type and
 * always travel in the `params` array, never spliced into the SQL text.
 */
export type SqlValue = SoftStr | Num | Bool | null;

/**
 * A piece of parameterized SQL: the `text` with positional `?` placeholders and
 * the ordered `params` they bind to. Modeled as a plgg `Box` so the {@link sql}
 * builder can tell an interpolated *fragment* (splice it) from an interpolated
 * *value* (bind it) — discriminated by the `"Sql"` tag, not a runtime guess.
 */
export type Sql = Box<
  "Sql",
  { text: SoftStr; params: ReadonlyArray<SqlValue> }
>;

/**
 * Type guard for {@link Sql} values, used by {@link sql} to decide splice-vs-bind.
 */
export const isSql = (value: unknown): value is Sql =>
  isBoxWithTag("Sql")(value);

/**
 * The text a single interpolation contributes: a spliced fragment's own text, a
 * `?` placeholder for a bound value, or nothing for the trailing static chunk
 * that has no interpolation after it.
 */
const placeholder = (
  value: SqlValue | Sql | undefined,
): SoftStr =>
  value === undefined
    ? ""
    : isSql(value)
      ? value.content.text
      : "?";

/**
 * Safe SQL string builder, used as a tagged template:
 *
 * ```ts
 * sql`SELECT * FROM users WHERE id = ${id} AND active = ${true}`
 * // -> { text: "SELECT * FROM users WHERE id = ? AND active = ?", params: [id, true] }
 * ```
 *
 * The static template chunks are trusted, developer-authored text. Each
 * interpolation is handled by value:
 * - a nested {@link Sql} fragment is **spliced** (its `text` and `params` are
 *   merged in place) — this is how reusable/conditional clauses compose safely;
 * - any other value is **bound** as a `?` placeholder pushed onto `params`.
 *
 * User values therefore never reach the SQL string — injection-safe by
 * construction.
 */
export const sql = (
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<SqlValue | Sql>
): Sql =>
  box("Sql")({
    text: strings
      .map((chunk, i) => chunk + placeholder(values[i]))
      .join(""),
    params: values.flatMap((value) =>
      isSql(value) ? value.content.params : [value],
    ),
  });
