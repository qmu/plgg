/**
 * PoC 5's SHELL server — one process. It serves the
 * session page and the read seams:
 *
 *   GET  /                 the shell page (no-store)
 *   GET  /main.js          the bundled client
 *   GET  /index/pages.json the sorted corpus-relative path
 *                          list the client turns into the
 *                          sample site (tags derived
 *                          client-side)
 *   GET  /api/health       { configured } — is a key set?
 *   POST /api/session      mint a SHORT-LIVED Realtime key
 *                          (plgg-kit, GA client_secrets) —
 *                          the voice bonus
 *
 * There is NO write seam: PoC 5's central configuration is
 * client state the sample site renders live (a deliberate
 * sacrificial-PoC bound — the durable-core question is the
 * typed model + the agent's manipulation of it, both
 * proven without persistence). The corpus copy is only a
 * source of page PATHS to classify and exclude.
 */
import {
  createServer,
  type ServerResponse,
} from "node:http";
import {
  readFileSync,
  globSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import {
  type SoftStr,
  type Defect,
  type Option,
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
import { REALTIME_MODEL } from "../agent.ts";

const ROOT = process.cwd();
const CONTENT = join(ROOT, "content");
const PORT = Number(process.env["PORT"] ?? 5173);

if (!existsSync(CONTENT)) {
  console.error(
    "content/ is missing — run `npm run seed-content` first (it seeds the sample-site copy of packages/guide).",
  );
  process.exit(1);
}

const keyOption = (): Option<string> => {
  const key = process.env["OPENAI_API_KEY"] ?? "";
  return key === "" ? none() : some(key);
};

const MINTER: Option<KeyMinter> =
  minterFromConfig({
    apiKey: keyOption(),
    model: REALTIME_MODEL,
    endpoint:
      "https://api.openai.com/v1/realtime/client_secrets",
  });

/** The sorted corpus-relative markdown path list. */
const pagePaths = (): ReadonlyArray<SoftStr> =>
  globSync("**/*.md", { cwd: CONTENT }).sort();

console.log(
  `pages: ${pagePaths().length} markdown files under content/`,
);

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
  if (
    req.method === "GET" &&
    path === "/index/pages.json"
  ) {
    sendJson(res, 200, { paths: pagePaths() });
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
    `PoC 5 (central configuration generation) shell on http://localhost:${PORT} — assistant ${matchOption(
      () => "NOT configured (no OPENAI_API_KEY)",
      () => "configured",
    )(MINTER)}`,
  ),
);
