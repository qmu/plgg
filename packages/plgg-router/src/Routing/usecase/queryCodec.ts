import {
  Dict,
  Option,
  SoftStr,
  some,
  none,
  pipe,
  getOr,
  matchOption,
} from "plgg";

/**
 * A reversible mapping for ONE query field (nuqs's `parseAsX` + default). It
 * `decode`s a raw token — `none()` when the key is absent — into a typed value,
 * and `encode`s a value back into a token, returning `none()` to mean **omit**
 * (the value equals the field default, so it is left out of the URL → clean,
 * round-tripping URLs). Decoding is **total**: an absent or malformed token
 * yields the field default, it never throws (mirrors {@link parseQuery}'s
 * tolerance, as a `Result`/`Option` instead of an exception).
 */
export type FieldCodec<T> = Readonly<{
  decode: (token: Option<SoftStr>) => T;
  encode: (value: T) => Option<SoftStr>;
}>;

/**
 * A reversible mapping between a typed value `T` and a query {@link Dict},
 * composed from {@link FieldCodec}s. `encode`/`decode` are identity on
 * non-default values. Because the no-cast house rule makes a generic
 * record-of-codecs auto-composer impossible to type without an `as`, a
 * `QueryCodec` is assembled by an explicit, fully-typed object literal over the
 * field codecs and {@link writeField} (see the spec / the example app).
 */
export type QueryCodec<T> = Readonly<{
  decode: (query: Dict<string, SoftStr>) => T;
  encode: (value: T) => Dict<string, SoftStr>;
}>;

/** A string field; omitted from the URL when it equals `fallback`. */
export const queryStr = (
  fallback: SoftStr,
): FieldCodec<SoftStr> => ({
  decode: getOr(fallback),
  encode: (value) =>
    value === fallback ? none() : some(value),
});

/**
 * An integer field. The token is parsed with `Number` (the casters refine, they
 * do not parse strings), falling back on a missing or non-integer token.
 */
export const queryInt = (
  fallback: number,
): FieldCodec<number> => ({
  decode: (token) =>
    pipe(
      token,
      matchOption(
        () => fallback,
        (raw: SoftStr) => {
          const parsed = Number(raw);
          return Number.isInteger(parsed)
            ? parsed
            : fallback;
        },
      ),
    ),
  encode: (value) =>
    value === fallback
      ? none()
      : some(`${value}`),
});

/** A boolean field: `"true"` is true, anything else is false. */
export const queryBool = (
  fallback: boolean,
): FieldCodec<boolean> => ({
  decode: (token) =>
    pipe(
      token,
      matchOption(
        () => fallback,
        (raw: SoftStr) => raw === "true",
      ),
    ),
  encode: (value) =>
    value === fallback
      ? none()
      : some(value ? "true" : "false"),
});

/**
 * An enum field over a literal union. A `const` type parameter infers the union
 * from `values` (so `queryEnum(["all", "active"], "all")` is `FieldCodec<"all" |
 * "active">` with no `as const`). An unknown token falls back.
 */
export const queryEnum = <
  const T extends SoftStr,
>(
  values: ReadonlyArray<T>,
  fallback: T,
): FieldCodec<T> => ({
  // direct matchOption call (not `pipe`): pipe's NonNeverFn constraint rejects a
  // bare generic return `T`.
  decode: (token) =>
    matchOption(
      () => fallback,
      (raw: SoftStr) =>
        values.find((value) => value === raw) ??
        fallback,
    )(token),
  encode: (value) =>
    value === fallback ? none() : some(value),
});

/**
 * Turns one encoded field into a `Dict` fragment for `QueryCodec.encode`:
 * `some(value)` → `{ [key]: value }`, `none()` → `{}` (omitted). Spread the
 * fragments together to build the full query dict, e.g.
 * `{ ...writeField("q", q.encode(v.q)), ...writeField("p", p.encode(v.p)) }`.
 */
export const writeField = (
  key: SoftStr,
  encoded: Option<SoftStr>,
): Dict<string, SoftStr> =>
  pipe(
    encoded,
    matchOption(
      (): Dict<string, SoftStr> => ({}),
      (
        value: SoftStr,
      ): Dict<string, SoftStr> => ({
        [key]: value,
      }),
    ),
  );
