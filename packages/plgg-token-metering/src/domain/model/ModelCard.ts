import { SoftStr } from "plgg";
import { ModelId } from "plgg-token-metering/domain/model/ModelId";
import { CountingMethod } from "plgg-token-metering/domain/model/Accuracy";
import { Calibration } from "plgg-token-metering/domain/model/Calibration";

/**
 * One measured model: what it is, how its tokens are counted, and the fitted
 * calibration behind every number produced for it.
 *
 * A card exists only for a model whose counting was ACTUALLY MEASURED against
 * the provider's API. That is the difference between a `ModelId` (a wire
 * spelling anyone can write) and a card (a claim backed by a run), and it is
 * why `countTokens` takes a counter built from a card rather than a bare id.
 */
export type ModelCard = Readonly<{
  /** The family key: `anthropic-claude`, `openai-gpt`, … */
  family: SoftStr;
  /** Human-facing family label used in tables. */
  familyName: SoftStr;
  /** The model the ground truth was measured against. */
  model: ModelId;
  countingMethod: CountingMethod;
  /** Where the vocabulary comes from, or why no exact count exists. */
  vocabularyNote: SoftStr;
  /** The provider's own documentation for its counting. */
  source: SoftStr;
  /** ISO date the source was verified. */
  lastVerified: SoftStr;
  calibration: Calibration;
  /** ISO instant of the run that fitted the calibration. */
  measuredAt: SoftStr;
  /** The pinned sample manifest the accuracy is stated over. */
  samplesVersion: SoftStr;
  /** The published report carrying the full error table. */
  report: SoftStr;
}>;

/**
 * Constructs a {@link ModelCard}. Total: every field is required, so a card
 * cannot exist without its provenance.
 */
export const modelCard = (content: {
  family: SoftStr;
  familyName: SoftStr;
  model: ModelId;
  countingMethod: CountingMethod;
  vocabularyNote: SoftStr;
  source: SoftStr;
  lastVerified: SoftStr;
  calibration: Calibration;
  measuredAt: SoftStr;
  samplesVersion: SoftStr;
  report: SoftStr;
}): ModelCard => content;
