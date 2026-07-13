/**
 * The wire contracts of the shell server's read seams,
 * decoded as `unknown` at the boundary (the boundary rule):
 *
 * - `POST /api/session` → {@link SessionGrant}: the
 *   short-lived Realtime key (voice bonus).
 * - `GET  /index/pages.json` → {@link PagesIndex}: the
 *   classified page list (path + tags + links), built
 *   server-side by classify.ts and navigated client-side.
 */
import {
  type Obj,
  type Result,
  type InvalidError,
  cast,
  asObj,
  forProp,
  asSoftStr,
  asNum,
  asVecOf,
  pipe,
  mapResult,
} from "plgg";
import { type Page } from "./classify.ts";

export type SessionGrant = Obj<{
  value: string;
  expiresAt: number;
}>;

export const asSessionGrant = (
  v: unknown,
): Result<SessionGrant, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("value", asSoftStr),
    forProp("expiresAt", asNum),
  );

const asPage = (
  v: unknown,
): Result<Page, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("path", asSoftStr),
      forProp("tags", asVecOf(asSoftStr)),
      forProp("links", asVecOf(asSoftStr)),
    ),
    mapResult((o): Page => ({
      path: o.path,
      tags: o.tags,
      links: o.links,
    })),
  );

export type PagesIndex = Readonly<{
  pages: ReadonlyArray<Page>;
}>;

export const asPagesIndex = (
  v: unknown,
): Result<PagesIndex, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("pages", asVecOf(asPage)),
    ),
    mapResult((o): PagesIndex => ({
      pages: o.pages,
    })),
  );
