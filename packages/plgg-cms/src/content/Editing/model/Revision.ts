import {
  type Num,
  type SoftStr,
} from "plgg";

/**
 * One IMMUTABLE snapshot of a {@link Draft}'s Markdown body —
 * appended on every autosave/mutation, never updated in place,
 * so the edit history is a durable append-only log (ticket 22).
 * `ordinal` is the 1-based revision number within the draft.
 * `body` is stored verbatim and is UNTRUSTED (validated at
 * publish, escaped by the reader). Pure data.
 */
export type Revision = Readonly<{
  id: Num;
  draftId: Num;
  ordinal: Num;
  body: SoftStr;
  createdAt: Num;
}>;

/** Assemble a {@link Revision}. Performs nothing. */
export const revision = (
  r: Revision,
): Revision => r;
