import {
  type Result,
  type SoftStr,
  type InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * A dense embedding vector (ticket 24, D11). A plain array of
 * numbers — NOT a native vector type. Stored serialized in a
 * TEXT column on the ticket-16 `chunks` table and compared with
 * a plain-JS cosine (no sqlite-vec / native extension). An empty
 * vector means "not embedded" (graceful degradation without an
 * API key).
 */
export type Embedding = ReadonlyArray<number>;

/**
 * Serialize an {@link Embedding} for storage. JSON, not a raw
 * Float32 BLOB — the plgg-sql binder is text/num/bool only, and
 * JSON keeps the store runtime-neutral and inspectable at the
 * zero-dependency guide-corpus scale D11 targets.
 */
export const serializeEmbedding = (
  e: Embedding,
): SoftStr => JSON.stringify(e);

/**
 * Parse a stored embedding back to a vector, FAIL-CLOSED: a
 * non-string, non-JSON, non-array, or non-numeric payload is a
 * typed `Err`, never a throw and never a partial vector.
 */
export const deserializeEmbedding = (
  raw: unknown,
): Result<Embedding, InvalidError> => {
  if (!isSoftStr(raw)) {
    return err(
      invalidError({
        message: "an embedding must be text",
      }),
    );
  }
  return parseVector(raw);
};

const parseVector = (
  raw: SoftStr,
): Result<Embedding, InvalidError> => {
  const decoded = tryParse(raw);
  return decoded === PARSE_FAILED
    ? err(
        invalidError({
          message: "embedding is not valid JSON",
        }),
      )
    : !Array.isArray(decoded)
      ? err(
          invalidError({
            message: "embedding is not an array",
          }),
        )
      : decoded.every(
            (n) =>
              typeof n === "number" &&
              Number.isFinite(n),
          )
        ? ok(decoded)
        : err(
            invalidError({
              message:
                "embedding has non-numeric elements",
            }),
          );
};

const PARSE_FAILED: unique symbol = Symbol();

const tryParse = (
  raw: SoftStr,
): unknown | typeof PARSE_FAILED => {
  try {
    return JSON.parse(raw);
  } catch {
    return PARSE_FAILED;
  }
};
