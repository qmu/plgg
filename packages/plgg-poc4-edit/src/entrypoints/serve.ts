/**
 * PoC 4's SHELL server — the session-bearing page plus
 * the two writable seams and the /docs proxy:
 *
 *   GET  /                the shell page (NO dev
 *                         live-reload script — by design;
 *                         see the iframe-isolation note)
 *   GET  /main.js         the bundled client
 *   GET  /index/fts.json  the corpus copy's FTS index,
 *                         built in-process and REBUILT
 *                         after every landed edit
 *   GET  /api/health      { configured } — is a key set?
 *   POST /api/session     mint a SHORT-LIVED Realtime key
 *                         (plgg-kit, GA client_secrets)
 *   POST /api/edit        the confined write seam: agent
 *                         edits land here, atomically,
 *                         inside content/ only
 *   *    /docs/* and /__plgg_reload
 *                         streamed proxy to the INTERNAL
 *                         plggpress dev server, so the
 *                         iframe (and its SSE reload
 *                         stream) stays same-origin
 *                         behind the single tunnel host
 *
 * Defense-in-depth on the write path: the pure
 * `resolveEditPath` guard (the ONE authoritative
 * authorization) runs first, then this fs boundary adds
 * the realpath-containment layer (symlink escape) — no
 * single loose check exposes the host filesystem. The
 * write itself is temp+rename (the plgg-cms exportFs
 * pattern) so the hot-reload watcher never reads a torn
 * file.
 *
 * The shell page must NEVER be served by the dev server:
 * plgg-bundle decorates every dev HTML response with a
 * location.reload() script, which would tear down the
 * WebRTC session on the agent's own edit.
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
import { resolveEditPath } from "../edit.ts";
import { asEditRequest } from "../protocol.ts";

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
 * directory an (already lexically-safe) path lands in
 * must REALLY live under content/ once symlinks resolve.
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
                  "the edit body is not JSON — send {path, content}",
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
                          refusal,
                        ): Promise<void> =>
                          sendJson(res, 400, {
                            error: `couldn't write ${request.path} — ${refusal.message}`,
                          }),
                        (
                          rel: SoftStr,
                        ): Promise<void> =>
                          writeEdit(
                            res,
                            rel,
                            request.content,
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
  content: SoftStr,
): Promise<void> => {
  const target = join(CONTENT, rel);
  try {
    mkdirSync(dirname(target), {
      recursive: true,
    });
    if (!insideContentRoot(target)) {
      sendJson(res, 400, {
        error: `couldn't write ${rel} — it resolves outside the content root`,
      });
      return;
    }
    // Atomic write (temp + rename, the plgg-cms
    // exportFs pattern): the dev server's watcher can
    // never read a torn file mid-write.
    const tmp = `${target}.tmp`;
    await writeFile(tmp, content, "utf8");
    await rename(tmp, target);
    index = buildIndexNow();
    sendJson(res, 200, { path: rel });
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

/* ------------------------------------------------ *
 * The /docs proxy (iframe + SSE reload stream)      *
 * ------------------------------------------------ */

/**
 * Stream one request through to the internal plggpress
 * dev server. Piped RAW both ways on purpose: the
 * `/__plgg_reload` SSE stream must not be buffered, or
 * the iframe never learns an edit landed.
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
      },
    },
    (answer) => {
      res.writeHead(
        answer.statusCode ?? 502,
        answer.headers,
      );
      answer.pipe(res);
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

createServer((req, res) => {
  const path =
    (req.url ?? "/").split("?")[0] ?? "/";
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
    `PoC 4 (agent file edits + hot reload) shell on http://localhost:${PORT} — docs proxied from :${DOC_PORT}, assistant ${matchOption(
      () => "NOT configured (no OPENAI_API_KEY)",
      () => "configured",
    )(MINTER)}`,
  ),
);
