/**
 * The wire contracts of the shell server's writable
 * seams, decoded as `unknown` on BOTH sides (the boundary
 * rule):
 *
 * - `POST /api/session` → {@link SessionGrant}: the
 *   short-lived Realtime key minted from the server-held
 *   standing `OPENAI_API_KEY`.
 * - `POST /api/edit` → {@link EditRequest} inward (the
 *   agent's GRANULAR tool call — path + a list of
 *   `{find, replace}` ops — validated before any path or
 *   apply logic runs) and {@link EditReply} outward (the
 *   new file text plus the diff segments the client
 *   renders, so preview and disk agree).
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
  chainResult,
  err,
  invalidError,
} from "plgg";
import {
  type EditOp,
  type DocSegment,
  keptSegment,
  changedSegment,
} from "./edit.ts";

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

/** One `{find, replace}` op off the wire → a domain {@link EditOp}. */
const asEditOp = (
  v: unknown,
): Result<EditOp, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("find", asSoftStr),
      forProp("replace", asSoftStr),
    ),
    mapResult((o): EditOp => ({
      find: o.find,
      replace: o.replace,
    })),
  );

export type EditRequest = Readonly<{
  path: SoftStr;
  edits: ReadonlyArray<EditOp>;
}>;

export const asEditRequest = (
  v: unknown,
): Result<EditRequest, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("path", asSoftStr),
      forProp("edits", asVecOf(asEditOp)),
    ),
    mapResult((o): EditRequest => ({
      path: o.path,
      edits: o.edits,
    })),
  );

/** One diff segment off the wire → a domain {@link DocSegment}. */
const asDocSegment = (
  v: unknown,
): Result<DocSegment, InvalidError> =>
  pipe(
    cast(v, asObj, forProp("kind", asSoftStr)),
    chainResult(
      (o): Result<DocSegment, InvalidError> =>
        o.kind === "kept"
          ? pipe(
              cast(
                v,
                asObj,
                forProp("text", asSoftStr),
              ),
              mapResult((k): DocSegment =>
                keptSegment(k.text),
              ),
            )
          : o.kind === "changed"
            ? pipe(
                cast(
                  v,
                  asObj,
                  forProp("before", asSoftStr),
                  forProp("after", asSoftStr),
                ),
                mapResult((c): DocSegment =>
                  changedSegment(
                    c.before,
                    c.after,
                  ),
                ),
              )
            : err(
                invalidError({
                  message: `unknown diff segment kind "${o.kind}"`,
                }),
              ),
    ),
  );

export type EditReply = Readonly<{
  path: SoftStr;
  text: SoftStr;
  segments: ReadonlyArray<DocSegment>;
}>;

export const asEditReply = (
  v: unknown,
): Result<EditReply, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("path", asSoftStr),
      forProp("text", asSoftStr),
      forProp("segments", asVecOf(asDocSegment)),
    ),
    mapResult((o): EditReply => ({
      path: o.path,
      text: o.text,
      segments: o.segments,
    })),
  );
