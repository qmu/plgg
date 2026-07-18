import {
  Option,
  Result,
  InvalidError,
  invalidError,
  ok,
  err,
  none,
  isSoftStr,
  SoftStr,
} from "plgg";
import { ModelId } from "plgg-token-metering/domain/model/ModelId";
import { UsdPerMTok } from "plgg-token-metering/domain/model/Usd";

/**
 * Where a price came from and when it was read.
 *
 * Required, not optional. A price table is perishable: on 2026-07-17 a
 * recency check on the source registry caught a GPT-5.5 input price that was
 * 5× stale ($25 against a published $5). A rate with no recorded origin cannot
 * be re-checked against its source, so this package refuses to hold one.
 */
export type PriceProvenance = Readonly<{
  /** The document the rates were read from. */
  source: SoftStr;
  /** ISO date the rates were read and verified against that document. */
  retrievedAt: SoftStr;
  /** What the source does and does not publish. */
  note: SoftStr;
}>;

/**
 * Constructs a {@link PriceProvenance}.
 */
export const priceProvenance = ({
  source,
  retrievedAt,
  note,
}: {
  source: SoftStr;
  retrievedAt: SoftStr;
  note: SoftStr;
}): Result<PriceProvenance, InvalidError> =>
  !isSoftStr(source) ||
  source.trim().length === 0 ||
  !isSoftStr(retrievedAt) ||
  retrievedAt.trim().length === 0
    ? err(
        invalidError({
          message:
            "PriceProvenance requires a source and a retrievedAt date",
        }),
      )
    : ok({ source, retrievedAt, note });

/**
 * The per-bucket rates for one model.
 *
 * Every rate but `inputPerMTok` is an {@link Option}, and the absences are real
 * rather than defensive:
 *
 * - `outputPerMTok` is `none` for the Workers AI Qwen model, which the
 *   foundation-models catalog does not list at all (its input rate comes from
 *   the token-metering run's own family card).
 * - `cacheWritePerMTok` / `cacheReadPerMTok` are `none` for EVERY model shipped
 *   here: the catalog publishes input and output rates only. The research
 *   article records that cache writes bill above the base input rate and cache
 *   reads at a fraction of it, and that each provider publishes its own
 *   multipliers — but it does not carry those multipliers, so this package has
 *   no measured value to hold.
 *
 * A missing rate is `none`, never a substituted one. Pricing cache tokens at
 * the input rate would silently invent a number; `estimateCost` returns
 * `missingPrice` instead, and only for a bucket the usage actually touched.
 */
export type ModelPrices = Readonly<{
  model: ModelId;
  inputPerMTok: UsdPerMTok;
  outputPerMTok: Option<UsdPerMTok>;
  cacheWritePerMTok: Option<UsdPerMTok>;
  cacheReadPerMTok: Option<UsdPerMTok>;
  provenance: PriceProvenance;
}>;

/**
 * Constructs a {@link ModelPrices}. Absent rates default to `none` — the
 * honest default, since a rate this package was not given is a rate it does not
 * know.
 */
export const modelPrices = ({
  model,
  inputPerMTok,
  outputPerMTok = none(),
  cacheWritePerMTok = none(),
  cacheReadPerMTok = none(),
  provenance,
}: {
  model: ModelId;
  inputPerMTok: UsdPerMTok;
  outputPerMTok?: Option<UsdPerMTok>;
  cacheWritePerMTok?: Option<UsdPerMTok>;
  cacheReadPerMTok?: Option<UsdPerMTok>;
  provenance: PriceProvenance;
}): ModelPrices => ({
  model,
  inputPerMTok,
  outputPerMTok,
  cacheWritePerMTok,
  cacheReadPerMTok,
  provenance,
});
