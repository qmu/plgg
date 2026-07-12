/**
 * PoC 3's server — the static files PLUS the one
 * key-bearing seam:
 *
 *   GET  /                 the page
 *   GET  /main.js          the bundled client
 *   GET  /index/fts.json   the shipped EN index
 *   GET  /index/ja-fts.json  the shipped JA index
 *   GET  /api/health       { configured } — is a key set?
 *   POST /api/session      mint a SHORT-LIVED Realtime
 *                          key (GA client_secrets
 *                          endpoint) from the
 *                          server-held OPENAI_API_KEY
 *
 * With no key the mint route is an honest 404 (the
 * plgg-cms agentWeb contract); the standing key is never
 * echoed, never bundled, never sent to the browser — the
 * browser only ever holds the ephemeral grant. Node
 * built-ins for serving, in `entrypoints/` per the
 * vendor boundary; files are read per request so a
 * host-side rebuild is picked up on refresh.
 *
 * Run: `npm run serve` (after `npm run build`). Default
 * port 5173; the poc3-voice workload maps host 5186 onto
 * it for the `plgg-poc3.qmu.dev` tunnel route.
 */
import {
  createServer,
  type ServerResponse,
} from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type Option,
  type Defect,
  some,
  none,
  matchOption,
  matchResult,
  pipe,
} from "plgg";
import {
  type EphemeralKey,
  type KeyMinter,
  minterFromConfig,
} from "plgg-kit";

const ROOT = process.cwd();
const PORT = Number(process.env["PORT"] ?? 5173);

const keyOption = (): Option<string> => {
  const key = process.env["OPENAI_API_KEY"] ?? "";
  return key === "" ? none() : some(key);
};

/**
 * The mint seam is plgg-kit's `minterFromConfig` (the
 * same wiring plgg-cms's agentWeb uses): `None` without
 * an operator key, so the route stays an honest 404. The
 * local duplicate minter this entrypoint carried while
 * plgg-kit still targeted the retired pre-GA
 * `/v1/realtime/sessions` endpoint is gone — plgg-kit
 * now mints via the GA `client_secrets` endpoint and
 * decodes the top-level `value`/`expires_at` reply.
 */
const MINTER: Option<KeyMinter> =
  minterFromConfig({
    apiKey: keyOption(),
    model: "gpt-realtime",
    endpoint:
      "https://api.openai.com/v1/realtime/client_secrets",
  });

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
  "/index/ja-fts.json": {
    path: join("dist", "index", "ja-fts.json"),
    type: "application/json",
  },
};

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
    `PoC 3 (writer-side voice assistant) on http://localhost:${PORT} — assistant ${matchOption(
      () => "NOT configured (no OPENAI_API_KEY)",
      () => "configured",
    )(MINTER)}`,
  ),
);
