/**
 * Static server for PoC 1 — serves the page, the bundled
 * client, and the built index assets on `PORT` (default
 * 5173; the poc1-search workload maps host 5184 onto it
 * for the `plgg-poc1.qmu.dev` tunnel route). Node
 * built-ins only, in `entrypoints/` per the vendor
 * boundary. Files are read per request, so a host-side
 * rebuild is picked up on refresh.
 *
 * Run: `npm run serve` (after `npm run build`).
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PORT = Number(
  process.env["PORT"] ?? 5173,
);

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
  "/index/embeddings.json": {
    path: join(
      "dist",
      "index",
      "embeddings.json",
    ),
    type: "application/json",
  },
  "/index/metrics.json": {
    path: join(
      "dist",
      "index",
      "metrics.json",
    ),
    type: "application/json",
  },
};

createServer((req, res) => {
  const path =
    (req.url ?? "/").split("?")[0] ?? "/";
  const file = FILES[path];
  if (file === undefined) {
    res.writeHead(404, {
      "content-type":
        "text/plain; charset=utf-8",
    });
    res.end("not found");
    return;
  }
  try {
    res.writeHead(200, {
      "content-type": file.type,
    });
    res.end(
      readFileSync(join(ROOT, file.path)),
    );
  } catch {
    res.writeHead(404, {
      "content-type":
        "text/plain; charset=utf-8",
    });
    res.end(
      `${file.path} missing — run \`npm run build\` first`,
    );
  }
}).listen(PORT, () =>
  console.log(
    `PoC 1 (browser search core) on http://localhost:${PORT}`,
  ),
);
