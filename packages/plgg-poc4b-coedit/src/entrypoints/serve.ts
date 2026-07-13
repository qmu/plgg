/**
 * PoC 4b's SHELL server — one process (the reloading
 * plggpress iframe of PoC 4 is RETIRED; the preview is now
 * rendered by the client). It serves the session page and
 * the writable seams:
 *
 *   GET  /                the shell page (no-store)
 *   GET  /main.js         the bundled client
 *   GET  /index/fts.json  the corpus copy's FTS index,
 *                         built in-process and REBUILT
 *                         after every landed edit
 *   GET  /api/health      { configured } — is a key set?
 *   POST /api/session     mint a SHORT-LIVED Realtime key
 *                         (plgg-kit, GA client_secrets)
 *   POST /api/edit        the confined write seam: GRANULAR
 *                         {path, edits:[{find,replace}]}
 *                         land here, atomically, inside
 *                         content/ only, and the reply
 *                         carries the new text + the diff
 *                         segments the client renders (so
 *                         preview and disk agree)
 *   GET  /api/doc?path=   the confined RAW-markdown read
 *                         seam: the preview's and model's
 *                         document context is the real file
 *                         bytes, same guard as the write
 *
 * Defense-in-depth on the write path: the pure
 * `resolveEditPath` guard (the ONE authoritative
 * authorization) runs first, then this fs boundary adds
 * the realpath-containment layer (symlink escape). The
 * apply is the pure `applyEdits` (only the located spans
 * change, never a whole-file rewrite), and the write
 * itself is temp+rename so a reader never sees a torn file.
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  readFileSync,
  realpathSync,
  globSync,
  mkdirSync,
  existsSync,
} from "node:fs";
import {
  writeFile,
  rename,
} from "node:fs/promises";
import { join, dirname, sep } from "node:path";
import {
  type SoftStr,
  type Option,
  type Defect,
  type InvalidError,
  some,
  none,
  matchOption,
  matchResult,
  pipe,
  tryCatch,
  invalidError,
} from "plgg";
import {
  type EphemeralKey,
  type KeyMinter,
  minterFromConfig,
} from "plgg-kit";
import {
  type FtsIndex,
  chunkMarkdown,
  buildFtsIndex,
} from "../poc1.ts";
import { REALTIME_MODEL } from "../agent.ts";
import {
  type EditPathError,
  resolveEditPath,
} from "../editPath.ts";
import {
  type EditError,
  type EditOp,
  applyEdits,
  diffSegments,
} from "../edit.ts";
import { asEditRequest } from "../protocol.ts";

const ROOT = process.cwd();
const CONTENT = join(ROOT, "content");
const PORT = Number(process.env["PORT"] ?? 5173);
/** Edit bodies above this are refused (413). */
const EDIT_BODY_CAP = 1_000_000;

if (!existsSync(CONTENT)) {
  console.error(
    "content/ is missing — run `npm run seed-content` first (it seeds the agent-editable copy of packages/guide).",
  );
  process.exit(1);
}

const keyOption = (): Option<string> => {
  const key = process.env["OPENAI_API_KEY"] ?? "";
  return key === "" ? none() : some(key);
};

/**
 * The mint seam is plgg-kit's `minterFromConfig` (the
 * PoC 3/4 wiring): `None` without an operator key, so the
 * route stays an honest 404.
 */
const MINTER: Option<KeyMinter> =
  minterFromConfig({
    apiKey: keyOption(),
    model: REALTIME_MODEL,
    endpoint:
      "https://api.openai.com/v1/realtime/client_secrets",
  });

/* ------------------------------------------------ *
 * The in-process index over the corpus copy         *
 * ------------------------------------------------ */

const buildIndexNow = (): FtsIndex =>
  buildFtsIndex(
    globSync("**/*.md", { cwd: CONTENT })
      .sort()
      .flatMap((file) =>
        chunkMarkdown(
          file,
          readFileSync(
            join(CONTENT, file),
            "utf8",
          ),
        ),
      ),
  );

// The serve process's one mutable slot: the current
// index, replaced wholesale after every landed edit so
// GET /index/fts.json (and the browser's post-edit
// refetch) always reflects the disk.
let index: FtsIndex = buildIndexNow();
console.log(
  `index: ${index.chunks.length} chunks over the content/ copy`,
);

/* ------------------------------------------------ *
 * Plumbing                                          *
 * ------------------------------------------------ */

// Dev preview, rebuilt in place — never cache.
const NO_STORE = "no-store, must-revalidate";

const sendJson = (
  res: ServerResponse,
  status: number,
  body: unknown,
): void => {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": NO_STORE,
  });
  res.end(JSON.stringify(body));
};

const sendText = (
  res: ServerResponse,
  status: number,
  body: string,
): void => {
  res.writeHead(status, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": NO_STORE,
  });
  res.end(body);
};

/** The exact static files this shell serves. */
const FILES: Readonly<
  Record<
    string,
    Readonly<{ path: string; type: string }>
  >
> = {
  "/": {
    path: "index.html",
    type: "text/html; charset=utf-8",
  },
  "/main.js": {
    path: join("dist", "main.js"),
    type: "text/javascript; charset=utf-8",
  },
};

const handleSession = (
  res: ServerResponse,
): Promise<void> =>
  pipe(
    MINTER,
    matchOption(
      async (): Promise<void> =>
        sendJson(res, 404, {
          error:
            "the assistant is not configured — set OPENAI_API_KEY on the server",
        }),
      async (minter: KeyMinter): Promise<void> =>
        minter.mint().then(
          matchResult(
            (reason: Defect): void =>
              sendJson(res, 502, {
                error: `could not mint a realtime key: ${reason.content.message}`,
              }),
            (grant: EphemeralKey): void =>
              sendJson(res, 200, grant),
          ),
        ),
    ),
  );

/* ------------------------------------------------ *
 * The confined write seam                           *
 * ------------------------------------------------ */

/** Collect a request body, refusing oversized ones. */
const readBody = (
  req: IncomingMessage,
): Promise<Option<string>> =>
  new Promise((resolve) => {
    // Byte accumulation is the irreducible imperative
    // seam of node:http; the cap is enforced as bytes
    // arrive, not after.
    const parts: Array<Buffer> = [];
    let size = 0;
    req.on("data", (part: Buffer) => {
      size += part.length;
      if (size > EDIT_BODY_CAP) {
        resolve(none());
        req.destroy();
        return;
      }
      parts.push(part);
    });
    req.on("end", () =>
      resolve(
        some(
          Buffer.concat(parts).toString("utf8"),
        ),
      ),
    );
    req.on("error", () => resolve(none()));
  });

/**
 * The fs-side containment layer OVER the pure guard: the
 * directory an (already lexically-safe) path lands in must
 * REALLY live under content/ once symlinks resolve.
 */
const insideContentRoot = (
  target: SoftStr,
): boolean =>
  pipe(
    tryCatch(
      (dir: SoftStr): boolean => {
        const real = realpathSync(dir);
        const root = realpathSync(CONTENT);
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

const handleEdit = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  const body = await readBody(req);
  return pipe(
    body,
    matchOption(
      async (): Promise<void> =>
        sendJson(res, 413, {
          error: `the edit body exceeds ${EDIT_BODY_CAP} bytes`,
        }),
      async (raw: string): Promise<void> =>
        pipe(
          tryCatch(
            (t: string): unknown => JSON.parse(t),
            (cause): InvalidError =>
              invalidError({
                message: "body is not JSON",
                cause,
              }),
          )(raw),
          matchResult(
            async (): Promise<void> =>
              sendJson(res, 400, {
                error:
                  "the edit body is not JSON — send {path, edits}",
              }),
            async (
              json: unknown,
            ): Promise<void> =>
              pipe(
                asEditRequest(json),
                matchResult(
                  async (
                    e: InvalidError,
                  ): Promise<void> =>
                    sendJson(res, 400, {
                      error: `the edit body has an unexpected shape: ${e.content.message}`,
                    }),
                  async (
                    request,
                  ): Promise<void> =>
                    pipe(
                      resolveEditPath(
                        request.path,
                      ),
                      matchResult(
                        async (
                          refusal: EditPathError,
                        ): Promise<void> =>
                          sendJson(res, 400, {
                            error: `couldn't edit ${request.path} — ${refusal.message}`,
                          }),
                        (
                          rel: SoftStr,
                        ): Promise<void> =>
                          writeEdit(
                            res,
                            rel,
                            request.edits,
                          ),
                      ),
                    ),
                ),
              ),
          ),
        ),
    ),
  );
};

const writeEdit = async (
  res: ServerResponse,
  rel: SoftStr,
  edits: ReadonlyArray<EditOp>,
): Promise<void> => {
  const target = join(CONTENT, rel);
  if (!insideContentRoot(target)) {
    sendJson(res, 400, {
      error: `couldn't edit ${rel} — it resolves outside the content root`,
    });
    return;
  }
  const current = pipe(
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
  return pipe(
    current,
    matchOption(
      async (): Promise<void> =>
        sendText(
          res,
          404,
          `${rel} not found in the content root`,
        ),
      (text: SoftStr): Promise<void> =>
        pipe(
          applyEdits(text, edits),
          matchResult(
            async (e: EditError): Promise<void> =>
              // A find that is absent/ambiguous/empty or
              // overlapping edits — the model's own tool
              // misuse. 422: the request was well-formed
              // but the ops don't apply. The typed message
              // tells the model exactly how to retry.
              sendJson(res, 422, {
                error: `couldn't apply the edit to ${rel} — ${e.message}`,
              }),
            (newText: SoftStr): Promise<void> =>
              commitEdit(
                res,
                rel,
                target,
                text,
                edits,
                newText,
              ),
          ),
        ),
    ),
  );
};

const commitEdit = async (
  res: ServerResponse,
  rel: SoftStr,
  target: SoftStr,
  before: SoftStr,
  edits: ReadonlyArray<EditOp>,
  newText: SoftStr,
): Promise<void> => {
  try {
    mkdirSync(dirname(target), {
      recursive: true,
    });
    // Atomic write (temp + rename): a reader never sees a
    // torn file mid-write.
    const tmp = `${target}.tmp`;
    await writeFile(tmp, newText, "utf8");
    await rename(tmp, target);
    index = buildIndexNow();
    // The diff is computed from the SAME inputs the apply
    // used, so the segments the client renders match disk.
    pipe(
      diffSegments(before, edits),
      matchResult(
        (): void =>
          sendJson(res, 200, {
            path: rel,
            text: newText,
            segments: [
              { kind: "kept", text: newText },
            ],
          }),
        (segments): void =>
          sendJson(res, 200, {
            path: rel,
            text: newText,
            segments,
          }),
      ),
    );
  } catch (cause) {
    sendJson(res, 500, {
      error: `couldn't write ${rel} — ${
        cause instanceof Error
          ? cause.message
          : String(cause)
      }`,
    });
  }
};

/**
 * The guarded RAW-markdown read seam (`GET /api/doc?path=`).
 * The preview's document text AND the editing model's
 * open-document context are served from HERE — the real
 * file bytes — through the SAME `resolveEditPath` guard +
 * realpath containment as the write seam (defense-in-depth:
 * a read must not escape the content root either).
 */
const handleDoc = (
  rawUrl: string,
  res: ServerResponse,
): void => {
  const requested =
    new URL(
      rawUrl,
      "http://localhost",
    ).searchParams.get("path") ?? "";
  pipe(
    resolveEditPath(requested),
    matchResult(
      (refusal: EditPathError): void =>
        sendJson(res, 400, {
          error: `couldn't read ${requested} — ${refusal.message}`,
        }),
      (rel: SoftStr): void => {
        const target = join(CONTENT, rel);
        if (!insideContentRoot(target)) {
          sendJson(res, 400, {
            error: `couldn't read ${rel} — it resolves outside the content root`,
          });
          return;
        }
        try {
          res.writeHead(200, {
            "content-type":
              "text/markdown; charset=utf-8",
            "cache-control": NO_STORE,
          });
          res.end(readFileSync(target, "utf8"));
        } catch {
          sendText(
            res,
            404,
            `${rel} not found in the content root`,
          );
        }
      },
    ),
  );
};

/* ------------------------------------------------ *
 * The server                                        *
 * ------------------------------------------------ */

createServer((req, res) => {
  const path =
    (req.url ?? "/").split("?")[0] ?? "/";
  if (
    req.method === "POST" &&
    path === "/api/session"
  ) {
    void handleSession(res);
    return;
  }
  if (
    req.method === "POST" &&
    path === "/api/edit"
  ) {
    void handleEdit(req, res);
    return;
  }
  if (
    req.method === "GET" &&
    path === "/api/doc"
  ) {
    handleDoc(req.url ?? "", res);
    return;
  }
  if (
    req.method === "GET" &&
    path === "/api/health"
  ) {
    sendJson(res, 200, {
      configured: matchOption(
        () => false,
        () => true,
      )(MINTER),
    });
    return;
  }
  if (
    req.method === "GET" &&
    path === "/index/fts.json"
  ) {
    sendJson(res, 200, index);
    return;
  }
  const file = FILES[path];
  if (file === undefined) {
    sendText(res, 404, "not found");
    return;
  }
  try {
    res.writeHead(200, {
      "content-type": file.type,
      "cache-control": NO_STORE,
    });
    res.end(readFileSync(join(ROOT, file.path)));
  } catch {
    sendText(
      res,
      404,
      `${file.path} missing — run \`npm run build\` first`,
    );
  }
}).listen(PORT, () =>
  console.log(
    `PoC 4b (live co-editing preview) shell on http://localhost:${PORT} — assistant ${matchOption(
      () => "NOT configured (no OPENAI_API_KEY)",
      () => "configured",
    )(MINTER)}`,
  ),
);
