import {
  Result,
  SoftStr,
  InvalidError,
  tryCatch,
} from "plgg/index";

/**
 * Maps a thrown value into an {@link InvalidError}, preserving the original
 * message when one is available.
 */
const asInvalid =
  (fallback: SoftStr) =>
  (error: unknown): InvalidError =>
    new InvalidError({
      message:
        error instanceof Error
          ? error.message
          : fallback,
    });

/**
 * Safe JSON decode: lifts the throwing `JSON.parse` into a `Result`, mapping a
 * parse failure to an {@link InvalidError}. A plgg combinator for request-body
 * parsing, replacing ad-hoc `try`/`catch`.
 */
export const decodeJson = (
  text: SoftStr,
): Result<unknown, InvalidError> =>
  tryCatch(
    (s: SoftStr): unknown => JSON.parse(s),
    asInvalid("invalid JSON"),
  )(text);

/**
 * Safe JSON encode: lifts the throwing `JSON.stringify` into a `Result`, so a
 * non-serializable value (cyclic structure, `BigInt`) becomes a typed failure
 * rather than an exception. The inverse companion of {@link decodeJson}.
 */
export const encodeJson = (
  value: unknown,
): Result<string, InvalidError> =>
  tryCatch(
    (v: unknown): string => JSON.stringify(v),
    asInvalid("value is not JSON-serializable"),
  )(value);
