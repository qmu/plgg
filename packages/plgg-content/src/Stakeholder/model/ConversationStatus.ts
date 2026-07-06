import {
  Result,
  InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * The lifecycle state of a stakeholder {@link Conversation}.
 * A closed set folded with {@link matchConversationStatus};
 * legal transitions are {@link transitionStatus} — this is
 * PRIMARY data (D4), so an illegal move is a typed `Err`, not
 * a silently-written row.
 */
export type ConversationStatus =
  | "open"
  | "addressed"
  | "closed";

/** Validate an unknown into a {@link ConversationStatus}. */
export const asConversationStatus = (
  v: unknown,
): Result<ConversationStatus, InvalidError> =>
  isSoftStr(v) &&
  (v === "open" ||
    v === "addressed" ||
    v === "closed")
    ? ok(v)
    : err(
        invalidError({
          message:
            'a conversation status must be "open", "addressed", or "closed"',
        }),
      );

/** Exhaustive fold over a {@link ConversationStatus}. */
export const matchConversationStatus =
  <R>(
    onOpen: () => R,
    onAddressed: () => R,
    onClosed: () => R,
  ) =>
  (status: ConversationStatus): R =>
    status === "open"
      ? onOpen()
      : status === "addressed"
        ? onAddressed()
        : onClosed();

/**
 * The lifecycle state machine as data: `open → addressed`,
 * `addressed → open`, `open|addressed → closed`, and
 * `closed → open` (reopen). Anything else — including a
 * same-state no-op — is an illegal transition and a typed
 * `Err`. Callers thread the result, so an illegal move can
 * never reach a `saveConversation`.
 */
export const transitionStatus = (
  from: ConversationStatus,
  to: ConversationStatus,
): Result<ConversationStatus, InvalidError> =>
  (from === "open" && to === "addressed") ||
  (from === "addressed" && to === "open") ||
  (from === "open" && to === "closed") ||
  (from === "addressed" && to === "closed") ||
  (from === "closed" && to === "open")
    ? ok(to)
    : err(
        invalidError({
          message: `illegal conversation status transition: ${from} -> ${to}`,
        }),
      );
