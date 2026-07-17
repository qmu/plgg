import {
  Result,
  ok,
  err,
  defineVariant,
  match,
} from "plgg";
import { ModelCard } from "plgg-token-metering/domain/model/ModelCard";
import { BpeVocabulary } from "plgg-token-metering/domain/model/BpeVocabulary";
import {
  MeteringError,
  methodMismatchError,
} from "plgg-token-metering/domain/model/MeteringError";
import { modelIdValue } from "plgg-token-metering/domain/model/ModelId";

/**
 * A counter for a family whose vocabulary the provider publishes: the caller
 * supplies the loaded vocabulary, and content tokens are reproduced exactly.
 */
const ExactBpe = defineVariant(
  "ExactBpeCounter",
)<{
  card: ModelCard;
  vocabulary: BpeVocabulary;
}>();

export type ExactBpeCounter = ReturnType<
  typeof ExactBpe.make
>;

/**
 * A counter for a family whose tokenizer is unpublished: the card's fitted
 * per-class rates predict the count, and the measured band travels with it.
 */
const Estimator = defineVariant(
  "EstimatorCounter",
)<{
  card: ModelCard;
}>();

export type EstimatorCounter = ReturnType<
  typeof Estimator.make
>;

/**
 * What `countTokens` counts with.
 *
 * The two constructors below are the enforcement point for the article's method
 * selection: a card declares which method its family was measured with, and a
 * counter of the other kind cannot be built for it. There is no way to hand
 * Claude a vocabulary and receive an "exact" count, because no such measurement
 * exists.
 */
export type TokenCounter =
  ExactBpeCounter | EstimatorCounter;

/**
 * Builds an exact-BPE counter for a card whose family publishes its vocabulary.
 * Fails with `MethodMismatchError` for an estimator family.
 */
export const exactBpeCounter = ({
  card,
  vocabulary,
}: {
  card: ModelCard;
  vocabulary: BpeVocabulary;
}): Result<TokenCounter, MeteringError> =>
  card.countingMethod === "exact-bpe"
    ? ok(ExactBpe.make({ card, vocabulary }))
    : err(
        methodMismatchError({
          message:
            "This model's tokenizer is not published, so no exact self-count exists; build an estimatorCounter instead",
          model: modelIdValue(card.model),
        }),
      );

/**
 * Builds a calibrated-estimator counter. Fails with `MethodMismatchError` for
 * an exact family — whose vocabulary IS published, so estimating it would
 * discard a count that can be reproduced exactly.
 */
export const estimatorCounter = ({
  card,
}: {
  card: ModelCard;
}): Result<TokenCounter, MeteringError> =>
  card.countingMethod === "calibrated-estimator"
    ? ok(Estimator.make({ card }))
    : err(
        methodMismatchError({
          message:
            "This model publishes its vocabulary, so it is counted exactly; build an exactBpeCounter with the loaded vocabulary instead",
          model: modelIdValue(card.model),
        }),
      );

/**
 * Pattern matcher for the {@link ExactBpeCounter} variant.
 */
export const exactBpeCounter$ = ExactBpe.pattern;

/**
 * Pattern matcher for the {@link EstimatorCounter} variant.
 */
export const estimatorCounter$ =
  Estimator.pattern;

/**
 * The card a counter was built from.
 */
export const counterCard = (
  counter: TokenCounter,
): ModelCard =>
  match(counter)(
    [
      exactBpeCounter$(),
      (value: ExactBpeCounter): ModelCard =>
        value.content.card,
    ],
    [
      estimatorCounter$(),
      (value: EstimatorCounter): ModelCard =>
        value.content.card,
    ],
  );
