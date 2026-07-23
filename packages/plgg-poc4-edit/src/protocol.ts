/**
 * The wire contracts of the shell server's two writable
 * seams, decoded as `unknown` on BOTH sides (the
 * boundary rule):
 *
 * - `POST /api/session` → {@link SessionGrant}: the
 *   short-lived Realtime key minted from the server-held
 *   standing `OPENAI_API_KEY`.
 * - `POST /api/edit` → {@link EditRequest} inward (the
 *   agent's tool call, validated before any path logic
 *   runs) and {@link EditReply} outward (which file
 *   landed).
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

export type EditRequest = Obj<{
  path: string;
  content: string;
}>;

export const asEditRequest = (
  v: unknown,
): Result<EditRequest, InvalidError> =>
  cast(
    v,
    asObj,
    forProp("path", asSoftStr),
    forProp("content", asSoftStr),
  );

export type EditReply = Obj<{
  path: string;
}>;

export const asEditReply = (
  v: unknown,
): Result<EditReply, InvalidError> =>
  cast(v, asObj, forProp("path", asSoftStr));
