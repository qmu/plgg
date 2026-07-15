/**
 * PoC 4c's SHELL server — PoC 4's two-process shell (the
 * session page + the /docs proxy onto the internal
 * plggpress dev server) carrying PoC 4b's GRANULAR write
 * seam, plus the one thing neither had: an INJECTING
 * proxy.
 *
 *   GET  /                the shell page (NO dev
 *                         live-reload script — by design;
 *                         it would tear down the WebRTC
 *                         session on the agent's own edit)
 *   GET  /main.js         the bundled shell client
 *   GET  /index/fts.json  the corpus copy's FTS index,
 *                         built in-process and REBUILT
 *                         after every landed edit
 *   GET  /api/health      { configured } — is a key set?
 *   POST /api/session     mint a SHORT-LIVED Realtime key
 *                         (plgg-kit, GA client_secrets)
 *   POST /api/edit        the confined write seam: GRANULAR
 *                         {path, edits:[{find,replace}]}
 *                         land here, atomically, inside
 *                         content/ only
 *   GET  /api/doc?path=   the confined RAW-markdown read
 *                         seam (the model's context is the
 *                         real file bytes)
 *   GET  /docs/__poc4c/patch.js
 *                         the INJECTED client — served by
 *                         the shell, not the dev server,
 *                         and intercepted BEFORE the proxy
 *                         so the upstream never sees it
 *   *    /docs/* and /__plgg_reload
 *                         proxy to the INTERNAL plggpress
 *                         dev server. HTML responses are
 *                         buffered and rewritten (the
 *                         injection); everything else —
 *                         above all the SSE reload stream
 *                         — streams through raw
 *
 * Defense-in-depth on the write path, unchanged from
 * PoC 4/4b: the pure `resolveEditPath` guard (the ONE
 * authoritative authorization) runs first, then this fs
 * boundary adds realpath containment (symlink escape). The
 * apply is 4b's pure `applyEdits` (only the located spans
 * change, never a whole-file rewrite) and the write is
 * temp+rename, so the dev server's watcher can never read
 * a torn file.
 */
import {
  createServer,
  request as httpRequest,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import {
  readFileSync,
  realpathSync,
  globSync,
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
import {
  type EditOp,
  type EditError,
  type EditPathError,
  REALTIME_MODEL,
  resolveEditPath,
  applyEdits,
  diffSegments,
  asEditRequest,
} from "../poc4b.ts";
import {
  injectPatchClient,
  isHtmlResponse,
  PATCH_SCRIPT_PATH,
} from "../inject.ts";

const ROOT = process.cwd();
const CONTENT = join(ROOT, "content");
const PORT = Number(process.env["PORT"] ?? 5173);
/** Where the internal plggpress dev server listens. */
const DOC_PORT = Number(
  process.env["DOC_PORT"] ?? 5175,
);
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
 * PoC 3 wiring): `None` without an operator key, so the
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

// The serve process's one mutable slot: the current index,
// replaced wholesale after every landed edit so
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
  [PATCH_SCRIPT_PATH]: {
    path: join("dist", "patch.js"),
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
    // Byte accumulation is the irreducible imperative seam
    // of node:http; the cap is enforced as bytes arrive,
    // not after.
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

/**
 * Land the edit and answer with the same diff the client
 * will animate — computed from the SAME ops the applier
 * just used, so the rendered page and the file cannot
 * disagree about what changed.
 */
const commitEdit = async (
  res: ServerResponse,
  rel: SoftStr,
  target: SoftStr,
  before: SoftStr,
  edits: ReadonlyArray<EditOp>,
  newText: SoftStr,
): Promise<void> => {
  try {
    // Atomic write (temp + rename, the plgg-cms exportFs
    // pattern): the dev server's watcher can never read a
    // torn file mid-write.
    const tmp = `${target}.tmp`;
    await writeFile(tmp, newText, "utf8");
    await rename(tmp, target);
    index = buildIndexNow();
    return pipe(
      diffSegments(before, edits),
      matchResult(
        async (e: EditError): Promise<void> =>
          sendJson(res, 422, {
            error: `couldn't diff the edit to ${rel} — ${e.message}`,
          }),
        async (segments): Promise<void> =>
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
 * The guarded RAW-markdown read seam (`GET /api/doc?path=`)
 * — the model's open-document context is served from HERE
 * (the real file bytes it quotes its `find` from) through
 * the SAME guard + realpath containment as the write seam.
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
 * The INJECTING /docs proxy                         *
 * ------------------------------------------------ */

/**
 * Stream one request through to the internal plggpress dev
 * server.
 *
 * The split here is the PoC's plumbing crux. HTML is
 * BUFFERED so the injection can rewrite it — a page is
 * small and arrives at once, so buffering costs nothing.
 * Everything else is piped RAW, and that is not an
 * optimization: `/__plgg_reload` is an endless SSE stream,
 * and buffering it would mean the injected client never
 * receives a frame — the very frames it exists to
 * arbitrate.
 */
const proxyDocs = (
  req: IncomingMessage,
  res: ServerResponse,
  upstreamPath: string,
): void => {
  const upstream = httpRequest(
    {
      host: "127.0.0.1",
      port: DOC_PORT,
      path: upstreamPath,
      method: req.method,
      headers: {
        ...req.headers,
        // The dev server's allowlist admits loopback
        // hosts; the public tunnel host stays on THIS
        // server.
        host: `localhost:${DOC_PORT}`,
        // Identity only: a buffered rewrite cannot splice
        // into a compressed body, and the dev server has
        // nothing to gain from encoding a loopback hop.
        "accept-encoding": "identity",
      },
    },
    (answer) => {
      const type = String(
        answer.headers["content-type"] ?? "",
      );
      if (!isHtmlResponse(type)) {
        res.writeHead(
          answer.statusCode ?? 502,
          answer.headers,
        );
        answer.pipe(res);
        return;
      }
      // Buffer the page, then splice our client in place
      // of the dev server's reload script.
      const chunks: Array<Buffer> = [];
      answer.on("data", (chunk: Buffer) =>
        chunks.push(chunk),
      );
      answer.on("end", () => {
        const body = injectPatchClient(
          Buffer.concat(chunks).toString("utf8"),
        );
        res.writeHead(answer.statusCode ?? 502, {
          ...answer.headers,
          // The rewrite changed the length, and the
          // upstream's value would truncate the page.
          "content-length":
            Buffer.byteLength(body),
          "cache-control": NO_STORE,
        });
        res.end(body);
      });
      answer.on("error", () => res.end());
    },
  );
  upstream.on("error", () => {
    sendText(
      res,
      502,
      "the internal doc server is not answering — is `npm run dev:docs` running?",
    );
  });
  req.pipe(upstream);
};

/** `/docs/foo` → the dev server's `/foo`. */
const upstreamPathOf = (
  path: string,
): string | undefined =>
  path === "/__plgg_reload"
    ? path
    : path === "/docs" || path === "/docs/"
      ? "/"
      : path.startsWith("/docs/")
        ? path.slice("/docs".length)
        : undefined;

/* ------------------------------------------------ *
 * The server                                        *
 * ------------------------------------------------ */

const sendFile = (
  res: ServerResponse,
  file: Readonly<{ path: string; type: string }>,
): void => {
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
};

createServer((req, res) => {
  const path =
    (req.url ?? "/").split("?")[0] ?? "/";
  // The injected bundle lives under /docs/ so it is
  // same-origin with the proxied page, but it is OURS:
  // intercept it BEFORE the proxy, or it would be
  // forwarded to a dev server that has never heard of it.
  const shellFile = FILES[path];
  if (
    req.method === "GET" &&
    shellFile !== undefined
  ) {
    sendFile(res, shellFile);
    return;
  }
  const upstreamPath = upstreamPathOf(path);
  if (upstreamPath !== undefined) {
    proxyDocs(req, res, upstreamPath);
    return;
  }
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
  sendText(res, 404, "not found");
}).listen(PORT, () =>
  console.log(
    `PoC 4c (watchable edits on the real rendered site) shell on http://localhost:${PORT} — docs proxied from :${DOC_PORT} with the patch client injected, assistant ${matchOption(
      () => "NOT configured (no OPENAI_API_KEY)",
      () => "configured",
    )(MINTER)}`,
  ),
);
