import {
  type SoftStr,
  type Result,
  type InvalidError,
  cast,
  asObj,
  forProp,
  asSoftStr,
  asVecOf,
  pipe,
  mapResult,
} from "plgg";
import { type EditOp } from "plggpress/framework/DevServer/usecase/editDoc";

// The wire contract of the dev server's live-edit bridge —
// decoded as `unknown` at the boundary (the boundary rule)
// rather than trusted. Carried from PoC 4b's proven
// `asEditRequest` shape: the POST body is
// `{ path, edits: [{find, replace}] }`, validated before any
// path-authorization or apply logic runs.

/**
 * The dev-only live-edit route: a POST here patches the open
 * markdown source on disk and pushes a reload. Absolute (not
 * base-prefixed): the dev server mounts it at the process
 * root, like the reload channel.
 */
export const PATCH_PATH: SoftStr =
  "/__plggpress_patch";

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
    mapResult(
      (o): EditOp => ({
        find: o.find,
        replace: o.replace,
      }),
    ),
  );

/** A decoded live-edit request: which `*.md`, and the ops to apply. */
export type PatchRequest = Readonly<{
  path: SoftStr;
  edits: ReadonlyArray<EditOp>;
}>;

/**
 * Decode a patch POST body: `{ path, edits }` where each edit
 * is a `{find, replace}`. A missing field or a wrong type is
 * an {@link InvalidError} the handler answers with a 400 —
 * the boundary is a checked cast, not a defensive branch.
 */
export const asPatchRequest = (
  v: unknown,
): Result<PatchRequest, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("path", asSoftStr),
      forProp("edits", asVecOf(asEditOp)),
    ),
    mapResult(
      (o): PatchRequest => ({
        path: o.path,
        edits: o.edits,
      }),
    ),
  );
