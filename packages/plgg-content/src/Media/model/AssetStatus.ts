import {
  Result,
  InvalidError,
  ok,
  err,
  invalidError,
  isSoftStr,
} from "plgg";

/**
 * The lifecycle of a media {@link Asset} (ticket 23, the binary
 * counterpart to ticket 22's drafts): an uploaded asset is
 * staged DB-only until an admin exports it into the git assets
 * tree. A closed set folded with {@link matchAssetStatus};
 * legal moves are {@link transitionAssetStatus}.
 *
 * - `staged` — uploaded, held in the DB-only store, not yet in git.
 * - `exported` — written into the git-tracked assets tree (terminal).
 * - `discarded` — rejected/abandoned (terminal).
 */
export type AssetStatus =
  | "staged"
  | "exported"
  | "discarded";

/** Validate an unknown into an {@link AssetStatus}. */
export const asAssetStatus = (
  v: unknown,
): Result<AssetStatus, InvalidError> =>
  isSoftStr(v) &&
  (v === "staged" ||
    v === "exported" ||
    v === "discarded")
    ? ok(v)
    : err(
        invalidError({
          message:
            'an asset status must be "staged", "exported", or "discarded"',
        }),
      );

/** Exhaustive fold over an {@link AssetStatus}. */
export const matchAssetStatus =
  <R>(
    onStaged: () => R,
    onExported: () => R,
    onDiscarded: () => R,
  ) =>
  (status: AssetStatus): R =>
    status === "staged"
      ? onStaged()
      : status === "exported"
        ? onExported()
        : onDiscarded();

/**
 * The asset lifecycle state machine as data: `staged →
 * exported` (admin publishes to git) and `staged → discarded`
 * (reject). `exported` and `discarded` are terminal — any
 * other move (including a same-state no-op) is an illegal
 * transition and a typed `Err`, so an illegal move never
 * reaches a save.
 */
export const transitionAssetStatus = (
  from: AssetStatus,
  to: AssetStatus,
): Result<AssetStatus, InvalidError> =>
  (from === "staged" && to === "exported") ||
  (from === "staged" && to === "discarded")
    ? ok(to)
    : err(
        invalidError({
          message: `illegal asset status transition: ${from} -> ${to}`,
        }),
      );
