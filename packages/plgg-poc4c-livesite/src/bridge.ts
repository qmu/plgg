/**
 * The wire contract ACROSS THE IFRAME BOUNDARY — the seam
 * that only exists because 4c's page is not its own.
 *
 * PoC 4b's shell rendered the preview, so "apply the edit
 * to the preview" was a reducer transition. Here the
 * rendered page lives in a proxied document the shell
 * cannot touch, so the same instruction has to become a
 * MESSAGE: shell → injected client (`PatchMessage`), and
 * the client's honest answer back (`PatchReport`).
 *
 * `postMessage` carries `unknown`, exactly like HTTP, so
 * both directions are decoded with casters at the
 * boundary (the boundary rule) rather than trusted. Both
 * ends are same-origin — the proxy is what makes the
 * iframe same-origin in the first place — but a decoder
 * is what keeps a stray message from any other script on
 * the page from driving this one.
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
  ok,
  err,
  invalidError,
} from "plgg";
import { type EditOp } from "./poc4b.ts";

/**
 * Tagged so a message from anything else on the real page
 * (the site's own scripts) can never be mistaken for one
 * of ours.
 */
export const CHANNEL = "poc4c";

/* ------------------------------------------------ *
 * Shell → injected client                           *
 * ------------------------------------------------ */

export type PatchMessage =
  /**
   * An edit is in flight. Sent BEFORE the `/api/edit`
   * request, because the write's reload frame can beat
   * the HTTP response back.
   */
  | Readonly<{ kind: "arm" }>
  /** The edit landed; here are the ops to animate. */
  | Readonly<{
      kind: "patch";
      ops: ReadonlyArray<EditOp>;
    }>
  /** The edit did not land — stand down. */
  | Readonly<{ kind: "drop" }>;

const asOp = (
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

export const asPatchMessage = (
  v: unknown,
): Result<PatchMessage, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("channel", asSoftStr),
      forProp("kind", asSoftStr),
    ),
    chainResult(
      (
        o: Obj<{ channel: string; kind: string }>,
      ): Result<PatchMessage, InvalidError> =>
        o.channel !== CHANNEL
          ? err(
              invalidError({
                message: `not a ${CHANNEL} message`,
              }),
            )
          : o.kind === "arm"
            ? ok<PatchMessage>({ kind: "arm" })
            : o.kind === "drop"
              ? ok<PatchMessage>({ kind: "drop" })
              : o.kind === "patch"
                ? pipe(
                    cast(
                      v,
                      asObj,
                      forProp(
                        "ops",
                        asVecOf(asOp),
                      ),
                    ),
                    mapResult(
                      (p): PatchMessage => ({
                        kind: "patch",
                        ops: p.ops,
                      }),
                    ),
                  )
                : err(
                    invalidError({
                      message: `unknown ${CHANNEL} message kind "${o.kind}"`,
                    }),
                  ),
    ),
  );

/** The envelope actually posted (tagged, JSON-safe). */
export const patchEnvelope = (
  message: PatchMessage,
): unknown => ({ channel: CHANNEL, ...message });

/* ------------------------------------------------ *
 * Injected client → shell                           *
 * ------------------------------------------------ */

/**
 * What became of the patch on the real page — the PoC's
 * actual measurement, reported back so the shell can show
 * the writer (and the developer judging it) whether the
 * change was watched or merely reloaded, and WHY.
 */
export type PatchReport =
  | Readonly<{ kind: "applied"; spans: number }>
  | Readonly<{
      kind: "unmapped";
      failure: SoftStr;
      reason: SoftStr;
    }>;

export const asPatchReport = (
  v: unknown,
): Result<PatchReport, InvalidError> =>
  pipe(
    cast(
      v,
      asObj,
      forProp("channel", asSoftStr),
      forProp("kind", asSoftStr),
    ),
    chainResult(
      (
        o: Obj<{ channel: string; kind: string }>,
      ): Result<PatchReport, InvalidError> =>
        o.channel !== CHANNEL
          ? err(
              invalidError({
                message: `not a ${CHANNEL} report`,
              }),
            )
          : o.kind === "applied"
            ? pipe(
                cast(
                  v,
                  asObj,
                  forProp("spans", asNum),
                ),
                mapResult(
                  (a): PatchReport => ({
                    kind: "applied",
                    spans: a.spans,
                  }),
                ),
              )
            : o.kind === "unmapped"
              ? pipe(
                  cast(
                    v,
                    asObj,
                    forProp(
                      "failure",
                      asSoftStr,
                    ),
                    forProp("reason", asSoftStr),
                  ),
                  mapResult(
                    (u): PatchReport => ({
                      kind: "unmapped",
                      failure: u.failure,
                      reason: u.reason,
                    }),
                  ),
                )
              : err(
                  invalidError({
                    message: `unknown ${CHANNEL} report kind "${o.kind}"`,
                  }),
                ),
    ),
  );

/** The envelope actually posted back (tagged, JSON-safe). */
export const reportEnvelope = (
  report: PatchReport,
): unknown => ({ channel: CHANNEL, ...report });
