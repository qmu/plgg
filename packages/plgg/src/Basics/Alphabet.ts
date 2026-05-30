import {
  Result,
  InvalidError,
  Refinable,
  Castable,
  Box,
  ok,
  err,
  isBoxWithTag,
  isSoftStr,
  box,
} from "plgg/index";

/**
 * A variant with both a tag and content that must be an alphabetic string.
 * Alphabetic strings contain only letters (uppercase or lowercase), no numbers or special characters.
 */
export type Alphabet = Box<"Alphabet", string>;

/**
 * Validates that a string value contains only alphabetic characters.
 * Shared validation logic for type guards and construction.
 */
const qualify = (
  value: unknown,
): value is string => {
  if (!isSoftStr(value) || value.length === 0) {
    return false;
  }
  // Check alphabetic pattern:
  // - Only uppercase and lowercase letters
  // - No numbers, spaces, or special characters
  const alphabetPattern = /^[a-zA-Z]+$/;
  return alphabetPattern.test(value);
};

/**
 * Type guard to check if a value is an Alphabet.
 */
const is = (value: unknown): value is Alphabet =>
  isBoxWithTag("Alphabet")(value) &&
  qualify(value.content);

/**
 * Refinable instance for Alphabet type guards.
 */
export const alphabetRefinable: Refinable<Alphabet> =
  {
    is,
  };
/**
 * Exported type guard function for Alphabet values.
 */
export const { is: isAlphabet } =
  alphabetRefinable;

export const asAlphabet = (
  value: unknown,
): Result<Alphabet, InvalidError> =>
  is(value)
    ? ok(value)
    : qualify(value)
      ? ok(box("Alphabet")(value))
      : err(
          new InvalidError({
            message:
              "Value is not an Alphabet (tag-content pair with valid alphabetic string)",
          }),
        );

/**
 * Castable instance for Alphabet safe casting.
 */
export const alphabetCastable: Castable<Alphabet> =
  {
    as: asAlphabet,
  };
