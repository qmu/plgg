import {
  InvalidError,
  SoftStr,
  defineVariant,
} from "plgg";

/**
 * A price this package needs but was not given.
 *
 * Returned instead of substituting a rate. The cache buckets have no published
 * rate in the source catalog and the Workers AI Qwen model has no published
 * output rate, so pricing those buckets is a failure with a name rather than a
 * plausible-looking number. Raised only for a bucket whose usage is non-zero:
 * a request that wrote nothing to the cache needs no cache-write rate.
 */
const MissingPrice = defineVariant(
  "MissingPriceError",
)<{
  message: SoftStr;
  /** The model whose table lacks the rate. */
  model: SoftStr;
  /** The billing bucket with no rate: input | output | cacheWrite | cacheRead. */
  bucket: SoftStr;
}>();

export type MissingPriceError = ReturnType<
  typeof MissingPrice.make
>;

/**
 * Constructs a {@link MissingPriceError}.
 */
export const missingPriceError = (content: {
  message: SoftStr;
  model: SoftStr;
  bucket: SoftStr;
}): MissingPriceError =>
  MissingPrice.make(content);

/**
 * A counter was built for a model whose card declares the other counting
 * method — an exact-BPE counter for Claude, or an estimator for a family whose
 * vocabulary is published.
 *
 * The measurement fitted one method per family, so using the other one silently
 * would produce a number with no measured band behind it.
 */
const MethodMismatch = defineVariant(
  "MethodMismatchError",
)<{
  message: SoftStr;
  model: SoftStr;
}>();

export type MethodMismatchError = ReturnType<
  typeof MethodMismatch.make
>;

/**
 * Constructs a {@link MethodMismatchError}.
 */
export const methodMismatchError = (content: {
  message: SoftStr;
  model: SoftStr;
}): MethodMismatchError =>
  MethodMismatch.make(content);

/**
 * A model that this package has no measured card for.
 *
 * The registry holds the four models the article actually measured. A model in
 * the same family is NOT covered by its sibling's calibration: the article's
 * scope states that other models in a family may use other tokenizers and must
 * be re-validated before the calibration is reused. Returning this error is how
 * that scope boundary is enforced at runtime rather than described in prose.
 */
const UnknownModel = defineVariant(
  "UnknownModelError",
)<{
  message: SoftStr;
  model: SoftStr;
}>();

export type UnknownModelError = ReturnType<
  typeof UnknownModel.make
>;

/**
 * Constructs an {@link UnknownModelError}.
 */
export const unknownModelError = (content: {
  message: SoftStr;
  model: SoftStr;
}): UnknownModelError =>
  UnknownModel.make(content);

/**
 * A published vocabulary file that could not be read as its declared format.
 */
const VocabularyParse = defineVariant(
  "VocabularyParseError",
)<{
  message: SoftStr;
}>();

export type VocabularyParseError = ReturnType<
  typeof VocabularyParse.make
>;

/**
 * Constructs a {@link VocabularyParseError}.
 */
export const vocabularyParseError = (content: {
  message: SoftStr;
}): VocabularyParseError =>
  VocabularyParse.make(content);

/**
 * This package's error vocabulary: plgg's {@link InvalidError} for value
 * construction, widened with the four failures specific to counting and
 * pricing. Every one is a value returned through `Result` — nothing here
 * throws.
 */
export type MeteringError =
  | InvalidError
  | MissingPriceError
  | MethodMismatchError
  | UnknownModelError
  | VocabularyParseError;

/**
 * Pattern matcher for the {@link MissingPriceError} variant.
 */
export const missingPriceError$ =
  MissingPrice.pattern;

/**
 * Pattern matcher for the {@link MethodMismatchError} variant.
 */
export const methodMismatchError$ =
  MethodMismatch.pattern;

/**
 * Pattern matcher for the {@link UnknownModelError} variant.
 */
export const unknownModelError$ =
  UnknownModel.pattern;

/**
 * Pattern matcher for the {@link VocabularyParseError} variant.
 */
export const vocabularyParseError$ =
  VocabularyParse.pattern;

/**
 * Type guard for the {@link MissingPriceError} variant.
 */
export const isMissingPriceError = (
  error: MeteringError,
): error is MissingPriceError =>
  MissingPrice.is(error);

/**
 * Type guard for the {@link MethodMismatchError} variant.
 */
export const isMethodMismatchError = (
  error: MeteringError,
): error is MethodMismatchError =>
  MethodMismatch.is(error);

/**
 * Type guard for the {@link UnknownModelError} variant.
 */
export const isUnknownModelError = (
  error: MeteringError,
): error is UnknownModelError =>
  UnknownModel.is(error);

/**
 * Type guard for the {@link VocabularyParseError} variant.
 */
export const isVocabularyParseError = (
  error: MeteringError,
): error is VocabularyParseError =>
  VocabularyParse.is(error);
