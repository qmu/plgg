/**
 * The wire contracts of the shell server's read seams,
 * decoded as `unknown` at the boundary (the boundary rule):
 *
 * - `POST /api/session` → {@link SessionGrant}: the
 *   short-lived Realtime key minted from the server-held
 *   standing `OPENAI_API_KEY` (voice bonus).
 * - `GET  /index/pages.json` → {@link PagesIndex}: the
 *   sorted corpus-relative path list the client turns into
 *   the sample site (tags derived in pages.ts).
 */
import {
  type Obj,
  type SoftStr,
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

export type PagesIndex = Readonly<{
  paths: ReadonlyArray<SoftStr>;
}>;

export const asPagesIndex = (
  v: unknown,
): Result<PagesIndex, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("paths", asVecOf(asSoftStr)),
    ),
    mapResult((o): PagesIndex => ({
      paths: o.paths,
    })),
  );
