import {
  Box,
  SoftStr,
  Num,
  Bool,
  Option,
  box,
  some,
  none,
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
 * with the plgg discipline (cf. `plgg-server`'s `Option<Uint8Array>` body).
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
  {
    text: SoftStr;
    params: ReadonlyArray<SqlParam>;
  }
>;

/**
 * What a single interpolation may be: a concrete value, an already-optional
 * value (`None` → SQL `NULL`), or a nested {@link Sql} fragment to splice.
 */
export type Interpolation =
  | SqlValue
  | SqlParam
  | Sql;

/**
 * A module-private brand stamped on every {@link Sql} the {@link sql} builder
 * makes. `isSql` checks it, so a plain object shaped like an `Sql` box (e.g. one
 * parsed from attacker JSON: `{"__tag":"Sql","content":{"text":"…"}}`) cannot
 * masquerade as a fragment and get its `text` spliced into a query — the only
 * way to obtain the symbol is through this module's constructor.
 */
const SQL_BRAND = Symbol("plgg-sql/Sql");

/** The inner payload of an {@link Sql} box. */
type SqlContent = {
  text: SoftStr;
  params: ReadonlyArray<SqlParam>;
};

/**
 * The sole {@link Sql} constructor: a tagged box stamped with the private
 * {@link SQL_BRAND} (non-enumerable, so it never appears in JSON or a spread).
 */
const makeSql = (content: SqlContent): Sql =>
  Object.defineProperty(
    box("Sql")(content),
    SQL_BRAND,
    { value: true },
  );

/**
 * Type guard for {@link Sql} values, used by {@link sql} to decide splice-vs-bind.
 * Requires the private {@link SQL_BRAND} (not just the structural `"Sql"` tag),
 * so only genuine builder output passes — a forged box is rejected and bound as
 * a value, never spliced.
 */
export const isSql = (
  value: unknown,
): value is Sql =>
  typeof value === "object" &&
  value !== null &&
  SQL_BRAND in value &&
  isBoxWithTag("Sql")(value);

/**
 * The text a single interpolation contributes: a spliced fragment's own text,
 * or a `?` placeholder for a bound value (present or `NULL`).
 */
const placeholderText = (
  value: Interpolation,
): SoftStr =>
  isSql(value) ? value.content.text : "?";

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
 * construction. A nullish interpolation (only reachable through a type hole) is
 * normalized to `None` so it binds as SQL `NULL`: text and params both derive
 * from the same normalized values, so the placeholder count and the param count
 * can never diverge (the invariant a downstream driver relies on).
 */
export const sql = (
  strings: TemplateStringsArray,
  ...values: ReadonlyArray<Interpolation>
): Sql => {
  // a nullish interpolation → SQL NULL; a falsy-but-valid value (0/false/"") is
  // kept. `??` only catches null/undefined, so bound values are untouched.
  const normalized: ReadonlyArray<Interpolation> =
    values.map((value) => value ?? none());
  return makeSql({
    // strings.length === normalized.length + 1: each chunk but the last is
    // followed by exactly one interpolation → exactly one placeholder. The
    // trailing chunk (no interpolation) is the `None` arm.
    text: strings
      .map((chunk, i) =>
        pipe(
          fromNullable(normalized[i]),
          matchOption(
            () => chunk,
            (value: Interpolation) =>
              chunk + placeholderText(value),
          ),
        ),
      )
      .join(""),
    params: normalized.flatMap((value) =>
      placeholderParams(value),
    ),
  });
};
