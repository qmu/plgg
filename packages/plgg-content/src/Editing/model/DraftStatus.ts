import {
  Result,
  InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * The lifecycle of a guest {@link Draft} (ticket 22, D4): a
 * draft is authored content that does NOT yet exist in git, so
 * it is staged DB-only until an admin exports it. A closed set
 * folded with {@link matchDraftStatus}; legal moves are
 * {@link transitionDraftStatus}.
 *
 * - `draft` — being edited (autosaving revisions).
 * - `submitted` — the guest handed it to an admin for review.
 * - `exported` — published: written back to the git content
 *   tree (terminal).
 * - `conflicted` — an export found the base source changed
 *   underneath; needs the guest to re-edit.
 * - `discarded` — abandoned (terminal).
 */
export type DraftStatus =
  | "draft"
  | "submitted"
  | "exported"
  | "conflicted"
  | "discarded";

/** Validate an unknown into a {@link DraftStatus}. */
export const asDraftStatus = (
  v: unknown,
): Result<DraftStatus, InvalidError> =>
  isSoftStr(v) &&
  (v === "draft" ||
    v === "submitted" ||
    v === "exported" ||
    v === "conflicted" ||
    v === "discarded")
    ? ok(v)
    : err(
        invalidError({
          message:
            'a draft status must be "draft", "submitted", "exported", "conflicted", or "discarded"',
        }),
      );

/** Exhaustive fold over a {@link DraftStatus}. */
export const matchDraftStatus =
  <R>(
    onDraft: () => R,
    onSubmitted: () => R,
    onExported: () => R,
    onConflicted: () => R,
    onDiscarded: () => R,
  ) =>
  (status: DraftStatus): R =>
    status === "draft"
      ? onDraft()
      : status === "submitted"
        ? onSubmitted()
        : status === "exported"
          ? onExported()
          : status === "conflicted"
            ? onConflicted()
            : onDiscarded();

/**
 * The draft lifecycle state machine as data:
 * - `draft → submitted` (guest submits for review),
 * - `submitted → draft` (admin returns / guest revises),
 * - `submitted → exported` (admin publishes to git),
 * - `submitted → conflicted` (export found a changed base),
 * - `conflicted → draft` (guest re-edits after a conflict),
 * - `draft|submitted → discarded` (abandon).
 * `exported` and `discarded` are terminal. Anything else —
 * including a same-state no-op — is an illegal transition and
 * a typed `Err`, so an illegal move never reaches a save.
 */
export const transitionDraftStatus = (
  from: DraftStatus,
  to: DraftStatus,
): Result<DraftStatus, InvalidError> =>
  (from === "draft" && to === "submitted") ||
  (from === "submitted" && to === "draft") ||
  (from === "submitted" && to === "exported") ||
  (from === "submitted" && to === "conflicted") ||
  (from === "conflicted" && to === "draft") ||
  (from === "draft" && to === "discarded") ||
  (from === "submitted" && to === "discarded")
    ? ok(to)
    : err(
        invalidError({
          message: `illegal draft status transition: ${from} -> ${to}`,
        }),
      );
