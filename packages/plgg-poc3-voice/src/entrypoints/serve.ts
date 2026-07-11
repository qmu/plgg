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
  type Result,
  type SoftStr,
  ok,
  err,
  some,
  none,
  matchOption,
  matchResult,
  pipe,
  cast,
  asRawObj,
  asSoftStr,
  asNum,
  forProp,
} from "plgg";

const ROOT = process.cwd();
const PORT = Number(process.env["PORT"] ?? 5173);

const keyOption = (): Option<string> => {
  const key = process.env["OPENAI_API_KEY"] ?? "";
  return key === "" ? none() : some(key);
};

/**
 * Mint via the GA endpoint. NOTE (measured live,
 * 2026-07-12): the pre-GA `/v1/realtime/sessions`
 * endpoint plg-kit's `realtimeKeyMinter` targets now
 * answers 404 "Invalid URL", and the GA reply
 * carries `value`/`expires_at` at the TOP level (no
 * `client_secret` wrapper), so plgg-kit's minter AND
 * its `asEphemeralKey` are both stale — filed as a
 * production follow-up ticket; this PoC mints directly
 * in its entrypoint (the vendor seam) meanwhile.
 */
const MINT_URL =
  "https://api.openai.com/v1/realtime/client_secrets";

const mintGrant = async (
  apiKey: SoftStr,
): Promise<
  Result<
    Readonly<{
      value: SoftStr;
      expiresAt: number;
    }>,
    SoftStr
  >
> => {
  try {
    const res = await fetch(MINT_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
        },
      }),
    });
    if (!res.ok) {
      return err(
        `realtime mint HTTP ${res.status}`,
      );
    }
    const body: unknown = await res.json();
    return pipe(
      cast(
        body,
        asRawObj,
        forProp("value", asSoftStr),
        forProp("expires_at", asNum),
      ),
      matchResult(
        (): Result<
          Readonly<{
            value: SoftStr;
            expiresAt: number;
          }>,
          SoftStr
        > =>
          err("malformed realtime mint response"),
        (grant: {
          value: SoftStr;
          expires_at: number;
        }): Result<
          Readonly<{
            value: SoftStr;
            expiresAt: number;
          }>,
          SoftStr
        > =>
          ok({
            value: grant.value,
            expiresAt: grant.expires_at,
          }),
      ),
    );
  } catch (cause) {
    return err(
      cause instanceof Error
        ? cause.message
        : String(cause),
    );
  }
};

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
    keyOption(),
    matchOption(
      async (): Promise<void> =>
        sendJson(res, 404, {
          error:
            "the assistant is not configured — set OPENAI_API_KEY on the server",
        }),
      async (apiKey: string): Promise<void> =>
        mintGrant(apiKey).then(
          matchResult(
            (reason: SoftStr): void =>
              sendJson(res, 502, {
                error: `could not mint a realtime key: ${reason}`,
              }),
            (grant: {
              value: SoftStr;
              expiresAt: number;
            }): void => sendJson(res, 200, grant),
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
      )(keyOption()),
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
    )(keyOption())}`,
  ),
);
