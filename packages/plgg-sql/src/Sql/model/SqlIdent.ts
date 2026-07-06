import {
  type Box,
  type Result,
  type InvalidError,
  invalidError,
  isSoftStr,
  refinedBrand,
} from "plgg";

/**
 * A SQL identifier (a table or column name) validated to the
 * safe unquoted grammar `[A-Za-z_][A-Za-z0-9_]*`. SQLite
 * cannot bind an identifier as a `?` parameter, so composing
 * DDL or a `<table> MATCH ?` clause from a *name* would
 * otherwise force raw string concatenation — the very hole
 * the private `SQL_BRAND` closed for values. `SqlIdent` is
 * the typed door: only a brand-validated identifier can be
 * turned into an {@link Sql} fragment (via `identSql`), and
 * nothing else reaches SQL text as an identifier.
 *
 * The grammar is deliberately conservative — a strict subset
 * of what SQLite would accept quoted — so no identifier ever
 * needs quoting and no reserved-word / metacharacter case
 * can slip through. A name that does not match is a boundary
 * `Err`, not a silently-quoted string.
 */
export type SqlIdent = Box<"SqlIdent", string>;

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

const qualify = (v: unknown): v is string =>
  isSoftStr(v) && IDENT.test(v);

const brand = refinedBrand<
  "SqlIdent",
  string,
  InvalidError
>(
  "SqlIdent",
  qualify,
  (v) =>
    invalidError({
      message: `Value is not a SqlIdent (safe [A-Za-z_][A-Za-z0-9_]* identifier): ${String(v)}`,
    }),
);

/** Type guard for a {@link SqlIdent}. */
export const isSqlIdent = brand.is;

/**
 * Cast an unknown value to a {@link SqlIdent}. Accepts a
 * string matching the safe identifier grammar; anything else
 * (empty, whitespace, quotes, semicolons, punctuation) is an
 * `Err` naming the offending value.
 */
export const asSqlIdent = (
  value: unknown,
): Result<SqlIdent, InvalidError> => brand.as(value);

/** The raw identifier string of a {@link SqlIdent}. */
export const sqlIdentString = (
  i: SqlIdent,
): string => brand.unwrap(i);
