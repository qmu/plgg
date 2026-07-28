import {
  readFileSync,
  realpathSync,
  mkdirSync,
} from "node:fs";
import { writeFile, rename } from "node:fs/promises";
import { join, dirname, sep } from "node:path";
import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  type PromisedResult,
  ok,
  some,
  none,
  pipe,
  tryCatch,
  matchOption,
  matchResult,
  invalidError,
} from "plgg";
import {
  type Handler,
  type Context,
  type HttpResponse,
  type HttpError,
  jsonResponse,
  statusOf,
} from "plggpress/framework";
import { type ReloadHub } from "plggpress/framework/DevServer/usecase/reloadHub";
import {
  type EditOp,
  type EditError,
  applyEdits,
} from "plggpress/framework/DevServer/usecase/editDoc";
import {
  type EditPathError,
  resolveEditPath,
} from "plggpress/framework/DevServer/usecase/editPath";
import {
  type PatchRequest,
  asPatchRequest,
} from "plggpress/framework/DevServer/model/PatchProtocol";

// The DEV-ONLY live-edit bridge, PROMOTED from PoC 4b's
// proven confined write seam (`plgg-poc4b-coedit`): a POST of
// `{path, edits}` patches the open markdown source on disk
// and pushes a reload down the plggpress-owned channel, so
// the rendered page hot-reloads in place while the SSE
// session stays connected. Defense-in-depth on the path: the
// pure `resolveEditPath` guard (lexical authorization) runs
// first, then this fs boundary adds a realpath-containment
// layer (symlink escape). The apply is the pure `applyEdits`
// (only the located spans change, never a whole-file
// rewrite), and the write is temp+rename so a reader never
// sees a torn file. Kept OFF the production `build` path — a
// static site has no writable seam.

// A rejection or an acceptance is always a normal HTTP
// response (a typed report body), never an `HttpError`: the
// handler answers every outcome on the `ok` channel.
const done = (
  res: HttpResponse,
): PromisedResult<HttpResponse, HttpError> =>
  Promise.resolve(ok(res));

const reject = (
  status: number,
  message: SoftStr,
): HttpResponse =>
  jsonResponse({ error: message }, statusOf(status));

const accepted = (path: SoftStr): HttpResponse =>
  jsonResponse(
    { path, applied: true },
    statusOf(200),
  );

const parseJson = (
  raw: SoftStr,
): Result<unknown, InvalidError> =>
  tryCatch(
    (t: SoftStr): unknown => JSON.parse(t),
    (cause): InvalidError =>
      invalidError({
        message: "body is not JSON",
        cause,
      }),
  )(raw);

/**
 * The fs-side containment layer OVER the pure guard: the
 * directory an (already lexically-safe) path lands in must
 * REALLY live under the content root once symlinks resolve.
 */
const insideContentRoot = (
  contentDir: SoftStr,
  target: SoftStr,
): boolean =>
  pipe(
    tryCatch(
      (dir: SoftStr): boolean => {
        const real = realpathSync(dir);
        const root = realpathSync(contentDir);
        return (
          real === root ||
          real.startsWith(root + sep)
        );
      },
      (cause): InvalidError =>
        invalidError({
          message: "realpath failed",
          cause,
        }),
    )(dirname(target)),
    matchResult(
      (): boolean => false,
      (inside: boolean): boolean => inside,
    ),
  );

const readCurrent = (
  target: SoftStr,
): Option<SoftStr> =>
  pipe(
    tryCatch(
      (t: SoftStr): SoftStr =>
        readFileSync(t, "utf8"),
      (cause): InvalidError =>
        invalidError({
          message: "read failed",
          cause,
        }),
    )(target),
    matchResult(
      (): Option<SoftStr> => none(),
      (t: SoftStr): Option<SoftStr> => some(t),
    ),
  );

// Write the new text atomically (temp + rename), push a
// reload, and answer. The watcher on the content dir also
// fires on this write; the reload is idempotent, so a double
// frame is harmless.
const commit = async (
  hub: ReloadHub,
  rel: SoftStr,
  target: SoftStr,
  newText: SoftStr,
): PromisedResult<HttpResponse, HttpError> => {
  try {
    mkdirSync(dirname(target), {
      recursive: true,
    });
    const tmp = `${target}.tmp`;
    await writeFile(tmp, newText, "utf8");
    await rename(tmp, target);
    hub.notify();
    return ok(accepted(rel));
  } catch (cause) {
    return ok(
      reject(
        500,
        `couldn't write ${rel} — ${
          cause instanceof Error
            ? cause.message
            : String(cause)
        }`,
      ),
    );
  }
};

const writePatch = (
  contentDir: SoftStr,
  hub: ReloadHub,
  rel: SoftStr,
  edits: ReadonlyArray<EditOp>,
): PromisedResult<HttpResponse, HttpError> => {
  const target = join(contentDir, rel);
  return !insideContentRoot(contentDir, target)
    ? done(
        reject(
          400,
          `couldn't patch ${rel} — it resolves outside the content root`,
        ),
      )
    : pipe(
        readCurrent(target),
        matchOption(
          (): PromisedResult<
            HttpResponse,
            HttpError
          > =>
            done(
              reject(
                404,
                `${rel} not found in the content root`,
              ),
            ),
          (
            text: SoftStr,
          ): PromisedResult<
            HttpResponse,
            HttpError
          > =>
            pipe(
              applyEdits(text, edits),
              matchResult(
                (
                  e: EditError,
                ): PromisedResult<
                  HttpResponse,
                  HttpError
                > =>
                  done(
                    reject(
                      422,
                      `couldn't apply the edit to ${rel} — ${e.message}`,
                    ),
                  ),
                (
                  newText: SoftStr,
                ): PromisedResult<
                  HttpResponse,
                  HttpError
                > =>
                  commit(hub, rel, target, newText),
              ),
            ),
        ),
      );
};

/**
 * The dev-server live-edit endpoint's handler: decode the
 * `{path, edits}` body, authorize the path (lexical + fs
 * containment), apply the granular edits to the source `*.md`,
 * write atomically, and push a reload. Every refusal is a
 * typed JSON report with a named reason and the right status
 * (400 shape/authz, 404 missing, 422 unapplicable edit, 500
 * write) — the boundary is checked, never a throw.
 */
export const patchWeb =
  (contentDir: SoftStr, hub: ReloadHub): Handler =>
  (
    c: Context,
  ): PromisedResult<HttpResponse, HttpError> =>
    pipe(
      parseJson(c.req.body),
      matchResult(
        (): PromisedResult<
          HttpResponse,
          HttpError
        > =>
          done(
            reject(
              400,
              "the patch body is not JSON — send {path, edits}",
            ),
          ),
        (
          json: unknown,
        ): PromisedResult<
          HttpResponse,
          HttpError
        > =>
          pipe(
            asPatchRequest(json),
            matchResult(
              (
                e: InvalidError,
              ): PromisedResult<
                HttpResponse,
                HttpError
              > =>
                done(
                  reject(
                    400,
                    `the patch body has an unexpected shape: ${e.content.message}`,
                  ),
                ),
              (
                request: PatchRequest,
              ): PromisedResult<
                HttpResponse,
                HttpError
              > =>
                pipe(
                  resolveEditPath(request.path),
                  matchResult(
                    (
                      refusal: EditPathError,
                    ): PromisedResult<
                      HttpResponse,
                      HttpError
                    > =>
                      done(
                        reject(
                          400,
                          `couldn't patch ${request.path} — ${refusal.message}`,
                        ),
                      ),
                    (
                      rel: SoftStr,
                    ): PromisedResult<
                      HttpResponse,
                      HttpError
                    > =>
                      writePatch(
                        contentDir,
                        hub,
                        rel,
                        request.edits,
                      ),
                  ),
                ),
            ),
          ),
      ),
    );
