/**
 * The wire contract of the ONE key-bearing seam
 * (`POST /api/session`): the server mints a short-lived
 * Realtime key from its standing `OPENAI_API_KEY` and
 * returns only this grant. The browser decodes it as
 * `unknown` — the boundary rule.
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
