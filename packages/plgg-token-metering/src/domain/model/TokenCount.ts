import {
  Box,
  Result,
  InvalidError,
  invalidError,
  ok,
  err,
  box,
  isBoxWithTag,
  isNum,
} from "plgg";

/**
 * A number of LLM tokens.
 *
 * Branded rather than a bare `number` because this package traffics in three
 * quantities that share the `number` representation and break silently when
 * mixed: a token count, a USD amount, and a per-million-token rate. A count
 * only becomes an amount by passing through a price (see `estimateCost`), so
 * the brand is what stops `tokens + dollars` from type-checking.
 *
 * Invariant: a non-negative integer. Tokens are not divisible and a negative
 * count has no meaning, so the caster rejects both rather than letting a
 * fractional count reach a price multiplication.
 */
export type TokenCount = Box<
  "TokenCount",
  number
>;

const qualify = (
  value: unknown,
): value is number =>
  isNum(value) &&
  Number.isInteger(value) &&
  value >= 0;

const is = (
  value: unknown,
): value is TokenCount =>
  isBoxWithTag("TokenCount")(value) &&
  qualify(value.content);

/**
 * Type guard for {@link TokenCount}.
 */
export const isTokenCount = is;

/**
 * Casts an unknown value to a {@link TokenCount}, rejecting negatives and
 * fractions.
 */
export const asTokenCount = (
  value: unknown,
): Result<TokenCount, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("TokenCount")(value))
      : err(
          invalidError({
            message:
              "Value is not a TokenCount (non-negative integer)",
          }),
        );

/**
 * A {@link TokenCount} of zero — the identity for {@link addTokens} and the
 * usage default for a bucket a request never touched.
 */
export const zeroTokens: TokenCount =
  box("TokenCount")(0);

/**
 * Constructs a count from a number this package just computed.
 *
 * Total, and deliberately NOT a `Result`, unlike {@link asTokenCount}: the
 * input is the output of arithmetic owned by this package (a merge-loop part
 * count, `round(rate × chars) + overhead`, a band inversion), never data from
 * outside, so there is no external failure to report to a caller. The invariant
 * is forced here — truncated toward zero and clamped at zero — so the one place
 * a computed count could violate it is this line, rather than every call site
 * carrying a dead error branch. Untrusted input must use {@link asTokenCount}.
 */
export const countOf = (
  value: number,
): TokenCount =>
  box("TokenCount")(
    Math.max(Math.trunc(value), 0),
  );

/**
 * Reads the underlying count. Named rather than a bare `.content` read so call
 * sites say what they are doing when a brand is deliberately dropped.
 */
export const tokenCountValue = (
  count: TokenCount,
): number => count.content;

/**
 * Adds two counts. Total = sum of parts is the only arithmetic this package
 * does on counts; everything else goes through a price.
 */
export const addTokens =
  (left: TokenCount) =>
  (right: TokenCount): TokenCount =>
    box("TokenCount")(
      left.content + right.content,
    );
