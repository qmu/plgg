import {
  type Option,
  type SoftStr,
  matchOption,
} from "plgg";

/**
 * The optimistic-concurrency verdict for a draft's base
 * revision: `clean` if the git source is still what it was when
 * the draft opened, `conflict` if it moved underneath.
 */
export type BaseCheck = "clean" | "conflict";

/**
 * Compare a draft's captured base hash (ticket 16's
 * `content_hash` at open, `None` for a page that did not exist)
 * against the CURRENT source hash (`None` if no file is there
 * now):
 * - both `None` — a new page still has no file → `clean`;
 * - `Some(b)` vs `Some(c)` — unchanged iff `b === c`;
 * - `None` base but a file appeared, or `Some` base but the
 *   file vanished/changed → `conflict`.
 * Pure; the publish usecase re-runs this immediately before an
 * atomic write and aborts on `conflict` (no write).
 */
export const checkBase = (
  base: Option<SoftStr>,
  current: Option<SoftStr>,
): BaseCheck =>
  matchOption<SoftStr, BaseCheck>(
    () =>
      matchOption<SoftStr, BaseCheck>(
        () => "clean",
        () => "conflict",
      )(current),
    (b: SoftStr) =>
      matchOption<SoftStr, BaseCheck>(
        () => "conflict",
        (c: SoftStr) =>
          b === c ? "clean" : "conflict",
      )(current),
  )(base);
