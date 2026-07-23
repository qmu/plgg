import {
  Option,
  Result,
  ok,
  err,
  fromNullable,
  matchOption,
  pipe,
} from "plgg";
import { ModelCard } from "plgg-token-metering/domain/model/ModelCard";
import {
  ModelId,
  modelIdValue,
} from "plgg-token-metering/domain/model/ModelId";
import { ModelPrices } from "plgg-token-metering/domain/model/ModelPrices";
import {
  MeteringError,
  unknownModelError,
} from "plgg-token-metering/domain/model/MeteringError";
import {
  CARDS,
  PRICES,
} from "plgg-token-metering/domain/usecase/measured";

/**
 * Every model this package holds a MEASURED card for.
 *
 * Four models, one per provider family. The article validated one
 * representative model per family and states the scope explicitly: other models
 * in a family may use other tokenizers and MUST be re-validated before the
 * calibration is reused. So `claude-opus-4-8` is deliberately absent even
 * though `claude-sonnet-5` is here, and `gpt-5.4` is absent even though
 * `gpt-5.5` is here.
 *
 * Silently reusing a sibling's calibration is the mistake this registry exists
 * to prevent: `cardFor` returns `UnknownModelError` instead, which turns a
 * scope boundary from a sentence in a report into a runtime answer.
 */
export const measuredCards: ReadonlyArray<ModelCard> =
  CARDS;

/**
 * The shipped price table, one entry per measured model.
 */
export const measuredPrices: ReadonlyArray<ModelPrices> =
  PRICES;

const findCard = (
  model: ModelId,
): Option<ModelCard> =>
  fromNullable(
    CARDS.find(
      (card) =>
        modelIdValue(card.model) ===
        modelIdValue(model),
    ),
  );

const findPrices = (
  model: ModelId,
): Option<ModelPrices> =>
  fromNullable(
    PRICES.find(
      (entry) =>
        modelIdValue(entry.model) ===
        modelIdValue(model),
    ),
  );

/**
 * The measured card for a model, or `UnknownModelError` if this package never
 * measured it.
 */
export const cardFor = (
  model: ModelId,
): Result<ModelCard, MeteringError> =>
  pipe(
    findCard(model),
    matchOption(
      (): Result<ModelCard, MeteringError> =>
        err(
          unknownModelError({
            message:
              "No measured calibration for this model. A sibling model's calibration is not transferable: the tokenizer may differ and must be re-validated against the provider's API first. See the report's scope section.",
            model: modelIdValue(model),
          }),
        ),
      (
        card: ModelCard,
      ): Result<ModelCard, MeteringError> =>
        ok(card),
    ),
  );

/**
 * The price entry for a model, or `UnknownModelError`.
 *
 * A returned entry does NOT promise every rate. Cache rates are `none` for
 * every model here and the Qwen output rate is `none`, because no source
 * publishes them — see `ModelPrices`. Supply your own `ModelPrices` (with its
 * own provenance) to price a bucket this table cannot.
 */
export const pricesFor = (
  model: ModelId,
): Result<ModelPrices, MeteringError> =>
  pipe(
    findPrices(model),
    matchOption(
      (): Result<ModelPrices, MeteringError> =>
        err(
          unknownModelError({
            message:
              "No price entry for this model in the shipped table. Supply a ModelPrices of your own, recording where its rates came from.",
            model: modelIdValue(model),
          }),
        ),
      (
        entry: ModelPrices,
      ): Result<ModelPrices, MeteringError> =>
        ok(entry),
    ),
  );
