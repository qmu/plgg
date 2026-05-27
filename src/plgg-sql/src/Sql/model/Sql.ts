import {
  Box,
  SoftStr,
  Num,
  Bool,
  Option,
  box,
  some,
  isOption,
  isBoxWithTag,
  fromNullable,
  matchOption,
  pipe,
} from "plgg";

/**
 * A concrete value that may be bound as a SQL parameter. Always *present* — SQL
 * `NULL` is not modeled here as a raw `null` but as the absence of a value
 * (`Option`'s `None`), keeping this union free of `null`/`undefined` in line
 * with the plgg discipline (cf. `plgg-web`'s `Option<Uint8Array>` body).
 */
export type SqlValue = SoftStr | Num | Bool;

/**
 * One bound parameter: `Some(value)` for a concrete value, `None` for SQL
 * `NULL`. The `null` itself only ever materializes at the driver seam.
 */
export type SqlParam = Option<SqlValue>;

/**
 * A piece of parameterized SQL: the `text` with positional `?` placeholders and
 * the ordered `params` (each a {@link SqlParam}) they bind to. Modeled as a plgg
 * `Box` so the {@link sql} builder can tell an interpolated *fragment* (splice
 * it) from an interpolated *value* (bind it) — discriminated by the `"Sql"` tag.
 */
export type Sql = Box<
  "Sql",
  { text: SoftStr; params: ReadonlyArray<SqlParam> }
>;

/**
 * What a single interpolation may be: a concrete value, an already-optional
 * value (`None` → SQL `NULL`), or a nested {@link Sql} fragment to splice.
 */
export type Interpolation = SqlValue | SqlParam | Sql;

/**
 * Type guard for {@link Sql} values, used by {@link sql} to decide splice-vs-bind.
 */
export const isSql = (value: unknown): value is Sql =>
  isBoxWithTag("Sql")(value);

/**
 * The text a single interpolation contributes: a spliced fragment's own text,
 * or a `?` placeholder for a bound value (present or `NULL`).
 */
const placeholderText = (
  value: Interpolation,
): SoftStr => (isSql(value) ? value.content.text : "?");

/**
 * The params a single interpolation contributes: a spliced fragment's params, a
 * passed-through {@link SqlParam}, or a concrete value lifted into `Some`.
 */
const placeholderParams = (
  value: Interpolation,
): ReadonlyArray<SqlParam> =>
  isSql(value)
    ? value.content.params
    : isOption(value)
      ? [value]
      : [some(value)];

/**
 * Safe SQL string builder, used as a tagged template:
 *
 * ```ts
 * sql`SELECT * FROM users WHERE id = ${id} AND active = ${true}`
 * // text: "SELECT * FROM users WHERE id = ? AND active = ?", params: [Some(id), Some(true)]
 * ```
 *
 * The static template chunks are trusted, developer-authored text. Each
 * interpolation is handled by value:
 * - a nested {@link Sql} fragment is **spliced** (its `text` and `params` are
 *   merged in place) — this is how reusable/conditional clauses compose safely;
 * - an `Option` value is **bound** as-is (`None` → SQL `NULL`);
 * - any other value is **bound** as a `?` placeholder, lifted into `Some`.
 *
 * User values therefore never reach the SQL string — injection-safe by
 * construction. The trailing static chunk (which has no interpolation after it)
 * is recovered via `fromNullable`, so no raw `undefined` is handled.
 */
export const sql = (
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<Interpolation>
): Sql =>
  box("Sql")({
    text: strings
      .map((chunk, i) =>
        pipe(
          fromNullable(values[i]),
          matchOption(
            () => chunk,
            (value: Interpolation) =>
              chunk + placeholderText(value),
          ),
        ),
      )
      .join(""),
    params: values.flatMap((value) =>
      placeholderParams(value),
    ),
  });
