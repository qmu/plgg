import {
  Option,
  Result,
  ok,
  err,
  some,
  matchOption,
  mapResult,
  chainResult,
  pipe,
} from "plgg";
import { ModelPrices } from "plgg-token-metering/domain/model/ModelPrices";
import { TokenUsage } from "plgg-token-metering/domain/model/TokenUsage";
import { CostBreakdown } from "plgg-token-metering/domain/model/Cost";
import {
  TokenCount,
  tokenCountValue,
} from "plgg-token-metering/domain/model/TokenCount";
import {
  UsdAmount,
  UsdPerMTok,
  addUsd,
  priceTokens,
  zeroUsd,
} from "plgg-token-metering/domain/model/Usd";
import {
  MeteringError,
  missingPriceError,
} from "plgg-token-metering/domain/model/MeteringError";
import { modelIdValue } from "plgg-token-metering/domain/model/ModelId";

/**
 * The billing buckets. Four rather than one number, because they bill at four
 * different rates — see {@link TokenUsage}.
 */
export type BucketName =
  "input" | "output" | "cacheWrite" | "cacheRead";

const BUCKETS: ReadonlyArray<BucketName> = [
  "input",
  "output",
  "cacheWrite",
  "cacheRead",
];

type PricedBuckets = Readonly<
  Record<BucketName, UsdAmount>
>;

const NOTHING_PRICED: PricedBuckets = {
  input: zeroUsd,
  output: zeroUsd,
  cacheWrite: zeroUsd,
  cacheRead: zeroUsd,
};

const tokensOf = (
  usage: TokenUsage,
  bucket: BucketName,
): TokenCount =>
  bucket === "input"
    ? usage.inputTokens
    : bucket === "output"
      ? usage.outputTokens
      : bucket === "cacheWrite"
        ? usage.cacheWriteTokens
        : usage.cacheReadTokens;

const rateOf = (
  prices: ModelPrices,
  bucket: BucketName,
): Option<UsdPerMTok> =>
  bucket === "input"
    ? some(prices.inputPerMTok)
    : bucket === "output"
      ? prices.outputPerMTok
      : bucket === "cacheWrite"
        ? prices.cacheWritePerMTok
        : prices.cacheReadPerMTok;

/**
 * Prices one bucket.
 *
 * The rule that keeps this package from inventing money: a rate is required
 * only for a bucket that was actually used. Zero tokens cost zero whether or
 * not a rate is known, so a request that touched no cache prices cleanly
 * against a table with no cache rates — which is every table shipped here. A
 * non-zero bucket with no rate is a `MissingPriceError`, never another bucket's
 * rate standing in.
 */
const priceBucket = (
  model: string,
  bucket: BucketName,
  tokens: TokenCount,
  rate: Option<UsdPerMTok>,
): Result<UsdAmount, MeteringError> =>
  tokenCountValue(tokens) === 0
    ? ok(zeroUsd)
    : pipe(
        rate,
        matchOption(
          (): Result<UsdAmount, MeteringError> =>
            err(
              missingPriceError({
                message: `No published ${bucket} rate for this model, but usage reports ${tokenCountValue(tokens)} ${bucket} tokens — refusing to substitute another bucket's rate`,
                model,
                bucket,
              }),
            ),
          (
            found: UsdPerMTok,
          ): Result<UsdAmount, MeteringError> =>
            ok(
              priceTokens(found)(
                tokenCountValue(tokens),
              ),
            ),
        ),
      );

const priceAll = (
  prices: ModelPrices,
  usage: TokenUsage,
): Result<PricedBuckets, MeteringError> =>
  BUCKETS.reduce(
    (
      acc: Result<PricedBuckets, MeteringError>,
      bucket: BucketName,
    ) =>
      pipe(
        acc,
        chainResult((priced: PricedBuckets) =>
          pipe(
            priceBucket(
              modelIdValue(prices.model),
              bucket,
              tokensOf(usage, bucket),
              rateOf(prices, bucket),
            ),
            mapResult(
              (
                amount: UsdAmount,
              ): PricedBuckets => ({
                ...priced,
                [bucket]: amount,
              }),
            ),
          ),
        ),
      ),
    ok(NOTHING_PRICED),
  );

const totalOf = (
  priced: PricedBuckets,
): UsdAmount =>
  BUCKETS.map((bucket) => priced[bucket]).reduce(
    (sum, amount) => addUsd(sum)(amount),
    zeroUsd,
  );

/**
 * Prices billed usage, keeping the breakdown.
 *
 * A pure function from usage to money: no principal, no aggregation, no
 * storage. Attributing usage to a principal and persisting it is the
 * consumer's responsibility (see README, Scope) — this package's job ends at
 * the number.
 *
 * The result keeps the four buckets separate because they bill at four rates
 * and a single total cannot be decomposed back into them; `total` is carried
 * alongside, not instead. The price provenance travels with the result, so a
 * stored cost records which table produced it.
 *
 * For POST-RUN accounting, where `usage` is the provider's own reported usage
 * field and the amount is therefore exact. For a pre-run interval — where
 * output tokens do not exist yet — use `projectCost`.
 */
export const estimateCost =
  (usage: TokenUsage) =>
  (
    prices: ModelPrices,
  ): Result<CostBreakdown, MeteringError> =>
    pipe(
      priceAll(prices, usage),
      mapResult(
        (
          priced: PricedBuckets,
        ): CostBreakdown => ({
          model: prices.model,
          input: priced.input,
          output: priced.output,
          cacheWrite: priced.cacheWrite,
          cacheRead: priced.cacheRead,
          total: totalOf(priced),
          prices: prices.provenance,
        }),
      ),
    );
