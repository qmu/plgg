import {
  Result,
  InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * What a stakeholder {@link Conversation} is: a `request`
 * (an ask to address), a `comment` (feedback on content), or
 * a `thread` (an open discussion). A closed set folded with
 * {@link matchConversationKind}.
 */
export type ConversationKind =
  | "request"
  | "comment"
  | "thread";

/** Validate an unknown into a {@link ConversationKind}. */
export const asConversationKind = (
  v: unknown,
): Result<ConversationKind, InvalidError> =>
  isSoftStr(v) &&
  (v === "request" ||
    v === "comment" ||
    v === "thread")
    ? ok(v)
    : err(
        invalidError({
          message:
            'a conversation kind must be "request", "comment", or "thread"',
        }),
      );

/** Exhaustive fold over a {@link ConversationKind}. */
export const matchConversationKind =
  <R>(
    onRequest: () => R,
    onComment: () => R,
    onThread: () => R,
  ) =>
  (kind: ConversationKind): R =>
    kind === "request"
      ? onRequest()
      : kind === "comment"
        ? onComment()
        : onThread();
