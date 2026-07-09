import {
  type Result,
  type InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * Who authored a {@link Message}: an `admin` publisher, an
 * invited `guest` stakeholder, or the `agent` (the voice
 * agent writing a transcript, ticket 25). A closed set folded
 * with {@link matchAuthorKind}.
 */
export type AuthorKind = "admin" | "guest" | "agent";

/** Validate an unknown into an {@link AuthorKind}. */
export const asAuthorKind = (
  v: unknown,
): Result<AuthorKind, InvalidError> =>
  isSoftStr(v) &&
  (v === "admin" ||
    v === "guest" ||
    v === "agent")
    ? ok(v)
    : err(
        invalidError({
          message:
            'an author kind must be "admin", "guest", or "agent"',
        }),
      );

/** Exhaustive fold over an {@link AuthorKind}. */
export const matchAuthorKind =
  <R>(
    onAdmin: () => R,
    onGuest: () => R,
    onAgent: () => R,
  ) =>
  (kind: AuthorKind): R =>
    kind === "admin"
      ? onAdmin()
      : kind === "guest"
        ? onGuest()
        : onAgent();
