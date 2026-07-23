import { SoftStr } from "plgg";
import { ModelId } from "plgg-token-metering/domain/model/ModelId";
import { UsdAmount } from "plgg-token-metering/domain/model/Usd";
import { PriceProvenance } from "plgg-token-metering/domain/model/ModelPrices";

/**
 * The cost of one request, decomposed by billing bucket.
 *
 * The breakdown is kept rather than summed away: the buckets bill at different
 * rates, so a single total cannot be re-derived into its parts, and a consumer
 * reconciling against an invoice needs the parts. `total` is the sum of the
 * four, carried alongside rather than instead of them.
 *
 * `prices` travels with the numbers so a stored cost records which price table
 * produced it — a cost computed last month against a since-changed rate stays
 * explainable.
 */
export type CostBreakdown = Readonly<{
  model: ModelId;
  input: UsdAmount;
  output: UsdAmount;
  cacheWrite: UsdAmount;
  cacheRead: UsdAmount;
  total: UsdAmount;
  prices: PriceProvenance;
}>;

/**
 * A pre-run cost interval.
 *
 * NOT a billing figure, and shaped so it cannot quietly become one — there is
 * no single amount to read off. Output tokens cannot be counted before a run
 * (the model decides when to stop), and for Claude and Gemini the input count
 * is itself an estimate outside the ±5% target. A projection is for quota
 * admission and budget headroom; the amount that is billed comes from
 * `estimateCost` over the response's actual usage.
 *
 * - `low`: the count band's lower bound, and zero output — the model may stop
 *   immediately.
 * - `point`: the point count, and the caller's expected output.
 * - `high`: the count band's upper bound, and the request's max-tokens ceiling
 *   — the hard cap the provider enforces.
 */
export type CostProjection = Readonly<{
  low: CostBreakdown;
  point: CostBreakdown;
  high: CostBreakdown;
  /** How the interval was derived, for the record a consumer stores. */
  basis: ProjectionBasis;
}>;

/**
 * The stated derivation behind a {@link CostProjection}.
 */
export type ProjectionBasis = Readonly<{
  /** The counting method the input estimate used. */
  countingMethod: SoftStr;
  /** The measurement the input band came from. */
  accuracySource: SoftStr;
  /** Why `high` is what it is. */
  outputCeilingNote: SoftStr;
}>;
