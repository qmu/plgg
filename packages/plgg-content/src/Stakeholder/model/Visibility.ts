import {
  Result,
  InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * Whether a {@link Conversation} feeds the RAG index (D4,
 * visibility-gated): `public` conversations project into the
 * derived index; `private` stay durable-only, never indexed.
 * A closed set folded with {@link matchVisibility}.
 */
export type Visibility = "public" | "private";

/** Validate an unknown into a {@link Visibility}. */
export const asVisibility = (
  v: unknown,
): Result<Visibility, InvalidError> =>
  isSoftStr(v) &&
  (v === "public" || v === "private")
    ? ok(v)
    : err(
        invalidError({
          message:
            'a visibility must be "public" or "private"',
        }),
      );

/** Exhaustive fold over a {@link Visibility}. */
export const matchVisibility =
  <R>(onPublic: () => R, onPrivate: () => R) =>
  (visibility: Visibility): R =>
    visibility === "public"
      ? onPublic()
      : onPrivate();

/** Only `public` conversations project into the RAG index. */
export const feedsRag = (
  visibility: Visibility,
): boolean => visibility === "public";
