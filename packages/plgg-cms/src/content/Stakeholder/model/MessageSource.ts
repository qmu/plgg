import {
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * How a {@link Message} entered the store: the `web`
 * submission surface, the `voice` agent transcript (ticket
 * 25), or an `admin` console write. A closed set folded with
 * {@link matchMessageSource} — the provenance is durable, not
 * inferred.
 */
export type MessageSource = "web" | "voice" | "admin";

/** Validate an unknown into a {@link MessageSource}. */
export const asMessageSource = (
  v: unknown,
): Result<MessageSource, InvalidError> =>
  isSoftStr(v) &&
  (v === "web" || v === "voice" || v === "admin")
    ? ok(v)
    : err(
        invalidError({
          message:
            'a message source must be "web", "voice", or "admin"',
        }),
      );

/** Exhaustive fold over a {@link MessageSource}. */
export const matchMessageSource =
  <R>(
    onWeb: () => R,
    onVoice: () => R,
    onAdmin: () => R,
  ) =>
  (source: MessageSource): R =>
    source === "web"
      ? onWeb()
      : source === "voice"
        ? onVoice()
        : onAdmin();
