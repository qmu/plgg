import {
  Box,
  Result,
  InvalidError,
  invalidError,
  ok,
  err,
  box,
  isBoxWithTag,
  isSoftStr,
} from "plgg";

/**
 * A provider's API model identifier, exactly as the provider spells it
 * (`claude-sonnet-5`, `gpt-5.5`, `@cf/qwen/qwen2.5-coder-32b-instruct`).
 *
 * Branded so a model id cannot be passed where a family id, a sample id, or any
 * other string is expected. It is NOT a closed union of the four validated ids:
 * a provider can publish a new model at any time, and this type is the wire
 * spelling, not a claim that the model has been measured. That claim belongs to
 * `ModelCard` — the registry is the only place a model id is bound to a
 * calibration, and `countTokens` reaches a calibration only through a card.
 */
export type ModelId = Box<"ModelId", string>;

const qualify = (
  value: unknown,
): value is string =>
  isSoftStr(value) && value.trim().length > 0;

const is = (value: unknown): value is ModelId =>
  isBoxWithTag("ModelId")(value) &&
  qualify(value.content);

/**
 * Type guard for {@link ModelId}.
 */
export const isModelId = is;

/**
 * Casts an unknown value to a {@link ModelId}.
 */
export const asModelId = (
  value: unknown,
): Result<ModelId, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("ModelId")(value))
      : err(
          invalidError({
            message:
              "Value is not a ModelId (non-blank string)",
          }),
        );

/**
 * The identifier a model id falls back to when constructed from a blank
 * string — loud, and obviously not a real model, so it surfaces in the first
 * lookup rather than propagating as an empty string.
 */
const UNSPECIFIED = "unspecified-model";

/**
 * Constructs an id from a string this package owns — a registry literal, a
 * value already read out of another id.
 *
 * Total, and deliberately NOT a `Result`, for the same reason as `countOf`: the
 * input is a literal under review here, not data from outside, so a blank would
 * be a transcription bug rather than a runtime condition a caller could handle.
 * The invariant is forced (blank becomes {@link UNSPECIFIED}) so it holds by
 * construction. Untrusted input must use {@link asModelId}.
 */
export const modelId = (value: string): ModelId =>
  box("ModelId")(
    value.trim().length > 0
      ? value.trim()
      : UNSPECIFIED,
  );

/**
 * Reads the underlying identifier.
 */
export const modelIdValue = (
  id: ModelId,
): string => id.content;

/**
 * Structural equality for two ids.
 */
export const sameModelId =
  (left: ModelId) =>
  (right: ModelId): boolean =>
    left.content === right.content;
