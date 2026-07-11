/**
 * PoC 2's server — the static files PLUS the one session
 * seam that makes this PoC deliberately NOT static-only:
 *
 *   GET  /                 the page
 *   GET  /main.js          the bundled client
 *   GET  /index/fts.json   the shipped index
 *   GET  /api/health       { configured } — is a key set?
 *   POST /api/answer       question + retrieved chunks →
 *                          grounded, cited answer
 *
 * `OPENAI_API_KEY` lives ONLY in this process's env
 * (templated on plgg-cms's `agentWeb` seam): with no key
 * the answer route is an honest 404, mirroring "agent UI
 * hidden with no key"; the key itself is never echoed,
 * never bundled, never sent to the browser. Node
 * built-ins only for serving, in `entrypoints/` per the
 * vendor boundary; files are read per request so a
 * host-side rebuild is picked up on refresh.
 *
 * Run: `npm run serve` (after `npm run build`). Default
 * port 5173; the poc2-agent workload maps host 5185 onto
 * it for the `plgg-poc2.qmu.dev` tunnel route.
 */
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { matchResult, pipe } from "plgg";
import { generateAnswer } from "../answer.ts";
import {
  type AnswerRequest,
  asAnswerRequest,
} from "../protocol.ts";

const ROOT = process.cwd();
const PORT = Number(process.env["PORT"] ?? 5173);
const BODY_LIMIT = 1024 * 1024;

const configured = (): boolean =>
  (process.env["OPENAI_API_KEY"] ?? "") !== "";

/** The exact files this PoC serves — nothing else. */
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
  "/index/fts.json": {
    path: join("dist", "index", "fts.json"),
    type: "application/json",
  },
};

// This is a dev preview whose artifacts are rebuilt in
// place on every change; caching (the browser's OR
// Cloudflare's edge) would silently serve a stale page.
// Never cache.
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

/**
 * Collect the request body (bounded), imperative by
 * nature — the node stream API is the irreducible seam.
 */
const readBody = (
  req: IncomingMessage,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const parts: Array<Buffer> = [];
    let size = 0;
    req.on("data", (part: Buffer) => {
      size += part.length;
      if (size > BODY_LIMIT) {
        reject(
          new Error("request body too large"),
        );
        req.destroy();
        return;
      }
      parts.push(part);
    });
    req.on("end", () =>
      resolve(
        Buffer.concat(parts).toString("utf8"),
      ),
    );
    req.on("error", reject);
  });

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const handleAnswer = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  if (!configured()) {
    sendJson(res, 404, {
      error:
        "the agent is not configured — set OPENAI_API_KEY on the server",
    });
    return;
  }
  const raw = await readBody(req).catch(
    (): string => "",
  );
  await pipe(
    asAnswerRequest(parseJson(raw)),
    matchResult(
      async (): Promise<void> =>
        sendJson(res, 400, {
          error:
            "expected { question, chunks: [{ id, file, headingPath, text }] }",
        }),
      async (
        request: AnswerRequest,
      ): Promise<void> =>
        generateAnswer({
          question: request.question,
          chunks: request.chunks,
        }).then(
          matchResult(
            (e: Error): void =>
              sendJson(res, 502, {
                error: `the model call failed: ${e.message}`,
              }),
            (answer): void =>
              sendJson(res, 200, answer),
          ),
        ),
    ),
  );
};

createServer((req, res) => {
  const path =
    (req.url ?? "/").split("?")[0] ?? "/";
  if (
    req.method === "POST" &&
    path === "/api/answer"
  ) {
    void handleAnswer(req, res);
    return;
  }
  if (
    req.method === "GET" &&
    path === "/api/health"
  ) {
    sendJson(res, 200, {
      configured: configured(),
    });
    return;
  }
  const file = FILES[path];
  if (file === undefined) {
    res.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": NO_STORE,
    });
    res.end("not found");
    return;
  }
  try {
    res.writeHead(200, {
      "content-type": file.type,
      "cache-control": NO_STORE,
    });
    res.end(readFileSync(join(ROOT, file.path)));
  } catch {
    res.writeHead(404, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": NO_STORE,
    });
    res.end(
      `${file.path} missing — run \`npm run build\` first`,
    );
  }
}).listen(PORT, () =>
  console.log(
    `PoC 2 (reader-side browser agent) on http://localhost:${PORT} — agent ${configured() ? "configured" : "NOT configured (no OPENAI_API_KEY)"}`,
  ),
);
