import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  invalidError,
  fromNullable,
  matchOption,
  chainResult,
  mapResult,
  ok,
  err,
  some,
  none,
  pipe,
} from "plgg";

/** The closed set of orderable columns (MicroCMS-style). */
export type OrderKey = "updated_at" | "title";

/** Sort direction. */
export type OrderDir = "asc" | "desc";

/**
 * A validated list-endpoint query. Every field is BOUNDED
 * or drawn from a CLOSED set — the parse rejects garbage
 * (a non-numeric `limit`, an unknown `orderBy`) rather than
 * silently clamping, so a broken caller learns of its bug.
 * `q` is free text (sanitized downstream by `fts5Phrase`).
 */
export type ListQuery = Readonly<{
  limit: number;
  offset: number;
  orderBy: OrderKey;
  orderDir: OrderDir;
  q: Option<SoftStr>;
}>;

/** Default page size when `limit` is absent. */
export const defaultLimit = 20;
/** Hard ceiling on `limit` (an oversized page is an error). */
export const maxLimit = 100;

/** The untrusted query-parameter bag (all values strings). */
export type QueryParams = Readonly<
  Record<string, string>
>;

const parseIntIn =
  (
    field: SoftStr,
    lo: number,
    hi: number,
  ) =>
  (raw: SoftStr): Result<number, InvalidError> => {
    const n = Number(raw);
    return Number.isInteger(n) &&
      n >= lo &&
      n <= hi
      ? ok(n)
      : err(
          invalidError({
            message: `${field} must be an integer in [${lo}, ${hi}], got ${JSON.stringify(raw)}`,
          }),
        );
  };

const withDefault =
  <T>(fallback: T) =>
  (
    parse: (
      raw: SoftStr,
    ) => Result<T, InvalidError>,
  ) =>
  (
    o: Option<SoftStr>,
  ): Result<T, InvalidError> =>
    matchOption<
      SoftStr,
      Result<T, InvalidError>
    >(() => ok(fallback), parse)(o);

const parseOrderKey = (
  raw: SoftStr,
): Result<OrderKey, InvalidError> =>
  raw === "updated_at" || raw === "title"
    ? ok(raw)
    : err(
        invalidError({
          message: `orderBy must be 'updated_at'|'title', got ${JSON.stringify(raw)}`,
        }),
      );

const parseOrderDir = (
  raw: SoftStr,
): Result<OrderDir, InvalidError> =>
  raw === "asc" || raw === "desc"
    ? ok(raw)
    : err(
        invalidError({
          message: `order must be 'asc'|'desc', got ${JSON.stringify(raw)}`,
        }),
      );

const at = (
  params: QueryParams,
  key: SoftStr,
): Option<SoftStr> => fromNullable(params[key]);

const parseQ = (
  o: Option<SoftStr>,
): Option<SoftStr> =>
  matchOption<SoftStr, Option<SoftStr>>(
    () => none(),
    (s: SoftStr) =>
      s.trim().length === 0 ? none() : some(s),
  )(o);

/**
 * Parses an untrusted {@link QueryParams} bag into a
 * validated {@link ListQuery}. Absent fields take defaults;
 * a present-but-invalid field is an `Err` (never a silent
 * clamp on a garbage type). Total.
 */
export const asListQuery = (
  params: QueryParams,
): Result<ListQuery, InvalidError> =>
  pipe(
    at(params, "limit"),
    withDefault(defaultLimit)(
      parseIntIn("limit", 1, maxLimit),
    ),
    chainResult((limit: number) =>
      pipe(
        at(params, "offset"),
        withDefault(0)(
          parseIntIn("offset", 0, Number.MAX_SAFE_INTEGER),
        ),
        chainResult((offset: number) =>
          pipe(
            at(params, "orderBy"),
            withDefault<OrderKey>("updated_at")(
              parseOrderKey,
            ),
            chainResult((orderBy: OrderKey) =>
              pipe(
                at(params, "order"),
                withDefault<OrderDir>("desc")(
                  parseOrderDir,
                ),
                mapResult(
                  (
                    orderDir: OrderDir,
                  ): ListQuery => ({
                    limit,
                    offset,
                    orderBy,
                    orderDir,
                    q: parseQ(at(params, "q")),
                  }),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
