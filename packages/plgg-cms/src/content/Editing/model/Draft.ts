import {
  type Option,
  type Num,
  type SoftStr,
} from "plgg";
import { type DraftStatus } from "plgg-cms/content/Editing/model/DraftStatus";

/**
 * A guest edit-in-progress against the git content tree
 * (ticket 22, D4): authored content NOT yet in git, staged
 * DB-only until an admin exports it. `contentPath` is the
 * durable target article path. `baseRevisionHash` is ticket
 * 16's `content_hash` of the source at open — `None` for a NEW
 * page (no existing source) — and is re-checked at publish for
 * optimistic conflict detection. `createdBy` is the opaque
 * guest subject id (the ownership key). The current body lives
 * in the latest {@link Revision}, not here. Pure data.
 */
export type Draft = Readonly<{
  id: Num;
  contentPath: SoftStr;
  status: DraftStatus;
  baseRevisionHash: Option<SoftStr>;
  createdBy: SoftStr;
  createdAt: Num;
  updatedAt: Num;
}>;

/** Assemble a {@link Draft}. Performs nothing. */
export const draft = (d: Draft): Draft => d;
