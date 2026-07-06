import {
  type Num,
  type SoftStr,
} from "plgg";
import { type AssetStatus } from "plgg-content/Media/model/AssetStatus";

/**
 * An uploaded media asset (ticket 23) — CONTENT-ADDRESSED: its
 * `hash` is the sha256 of its bytes, so identical uploads
 * dedupe to one asset. PRIMARY, DB-only staged data until an
 * admin exports it into the git assets tree (like a ticket-22
 * draft). `contentPath` is the durable target path in the
 * assets tree; `mime` is validated against the allowlist and
 * `size` against the cap BEFORE storing; `createdBy` is the
 * opaque uploader subject (the ownership key). Pure data — the
 * bytes live in the store, not here.
 */
export type Asset = Readonly<{
  id: Num;
  hash: SoftStr;
  contentPath: SoftStr;
  mime: SoftStr;
  size: Num;
  status: AssetStatus;
  createdBy: SoftStr;
  createdAt: Num;
  updatedAt: Num;
}>;

/** Assemble an {@link Asset}. Performs nothing. */
export const asset = (a: Asset): Asset => a;
