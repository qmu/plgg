import {
  Result,
  InvalidError,
  invalidError,
  ok,
  err,
} from "plgg";

/**
 * The three content classes the accuracy of this package is stated over.
 *
 * The class is a REQUIRED input to counting, not a guess this package makes.
 * The published measurement fits one tokens-per-character rate per class and
 * reports one error band per class, so every number this package returns is
 * conditioned on knowing which class the text is. Classifying text
 * automatically was not part of the measured instrument, so a built-in
 * classifier would fold an unmeasured error into a number that carries a
 * measured band — the caller, who knows whether it is sending Japanese prose or
 * a code diff, declares it instead.
 *
 * Text outside these three classes (base64 blobs, dense Unicode art, mixed
 * prose-and-code documents) is unvalidated: the bands do not cover it. See the
 * README's scope section.
 */
export type TextClass =
  "english" | "japanese" | "code";

/**
 * Every {@link TextClass}, in the order the article's tables use.
 */
export const TEXT_CLASSES: ReadonlyArray<TextClass> =
  ["english", "japanese", "code"];

const qualify = (
  value: unknown,
): value is TextClass =>
  value === "english" ||
  value === "japanese" ||
  value === "code";

/**
 * Type guard for {@link TextClass}.
 */
export const isTextClass = qualify;

/**
 * Casts an unknown value to a {@link TextClass}.
 */
export const asTextClass = (
  value: unknown,
): Result<TextClass, InvalidError> =>
  qualify(value)
    ? ok(value)
    : err(
        invalidError({
          message:
            "Value is not a TextClass (english | japanese | code)",
        }),
      );

/**
 * A value held per class. A total map, so a lookup cannot miss.
 */
export type ByTextClass<T> = Readonly<
  Record<TextClass, T>
>;
