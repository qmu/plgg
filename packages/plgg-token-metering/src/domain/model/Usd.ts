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
 * An amount of money in US dollars.
 *
 * Branded so it cannot be added to a `TokenCount` or to a `UsdPerMTok` rate:
 * the three are all `number` underneath and all appear together in every cost
 * calculation here.
 *
 * NOT rounded to cents. A single request's cost is routinely a fraction of a
 * cent (the article's whole 30-sample probe run cost $0.0280), so rounding at
 * this level would quantize most values to zero. Rounding is a presentation and
 * invoicing concern for the consumer, applied once over an aggregate.
 */
export type UsdAmount = Box<"UsdAmount", number>;

const qualifyAmount = (
  value: unknown,
): value is number =>
  isNum(value) &&
  Number.isFinite(value) &&
  value >= 0;

const isAmount = (
  value: unknown,
): value is UsdAmount =>
  isBoxWithTag("UsdAmount")(value) &&
  qualifyAmount(value.content);

/**
 * Type guard for {@link UsdAmount}.
 */
export const isUsdAmount = isAmount;

/**
 * Casts an unknown value to a {@link UsdAmount}. Rejects negatives: this
 * package prices usage, and negative usage does not occur — a credit or refund
 * is the consumer's ledger concern, not a token count's.
 */
export const asUsdAmount = (
  value: unknown,
): Result<UsdAmount, InvalidError> =>
  isAmount(value)
    ? ok(value)
    : qualifyAmount(value)
      ? ok(box("UsdAmount")(value))
      : err(
          invalidError({
            message:
              "Value is not a UsdAmount (non-negative finite number)",
          }),
        );

/**
 * A {@link UsdAmount} of zero — an untouched cost bucket.
 */
export const zeroUsd: UsdAmount =
  box("UsdAmount")(0);

/**
 * Reads the underlying amount.
 */
export const usdAmountValue = (
  amount: UsdAmount,
): number => amount.content;

/**
 * Adds two amounts.
 */
export const addUsd =
  (left: UsdAmount) =>
  (right: UsdAmount): UsdAmount =>
    box("UsdAmount")(
      left.content + right.content,
    );

/**
 * A published price: US dollars per 1,000,000 tokens — the unit every provider
 * catalogs in, kept in that unit rather than normalized to per-token so a rate
 * can be compared against its published source without arithmetic.
 */
export type UsdPerMTok = Box<
  "UsdPerMTok",
  number
>;

const qualifyRate = (
  value: unknown,
): value is number =>
  isNum(value) &&
  Number.isFinite(value) &&
  value >= 0;

const isRate = (
  value: unknown,
): value is UsdPerMTok =>
  isBoxWithTag("UsdPerMTok")(value) &&
  qualifyRate(value.content);

/**
 * Type guard for {@link UsdPerMTok}.
 */
export const isUsdPerMTok = isRate;

/**
 * Casts an unknown value to a {@link UsdPerMTok}.
 */
export const asUsdPerMTok = (
  value: unknown,
): Result<UsdPerMTok, InvalidError> =>
  isRate(value)
    ? ok(value)
    : qualifyRate(value)
      ? ok(box("UsdPerMTok")(value))
      : err(
          invalidError({
            message:
              "Value is not a UsdPerMTok (non-negative finite number)",
          }),
        );

/**
 * Constructs a rate from a number this package owns — a price-table literal
 * read from a published catalog.
 *
 * Total, for the same reason as `countOf`: the input is a reviewed literal, not
 * caller data, so the invariant is forced (a negative or non-finite rate
 * becomes 0) rather than reported. Untrusted input must use
 * {@link asUsdPerMTok}.
 */
export const perMTok = (
  value: number,
): UsdPerMTok =>
  box("UsdPerMTok")(
    Number.isFinite(value) && value > 0
      ? value
      : 0,
  );

/**
 * Reads the underlying rate.
 */
export const usdPerMTokValue = (
  rate: UsdPerMTok,
): number => rate.content;

/**
 * Prices a token count at a per-MTok rate — the ONLY conversion from a count to
 * an amount, and the reason the two are separate brands.
 */
export const priceTokens =
  (rate: UsdPerMTok) =>
  (tokens: TokenCountLike): UsdAmount =>
    box("UsdAmount")(
      (tokens * rate.content) / 1_000_000,
    );

/**
 * The raw count `priceTokens` multiplies. Kept local (rather than importing
 * `TokenCount`) so the money module does not depend on the counting module;
 * the caller unwraps its brand at the one call site that crosses.
 */
type TokenCountLike = number;
