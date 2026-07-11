/**
 * Static server for the built portal — the deliberately
 * featureless host the PoC-fleet compose runs. It serves
 * exactly one artifact (`dist/site/index.html`, the SSG
 * output of `build.ts`) on `PORT` (default 5173; the
 * poc-portal workload maps host 5183 onto it for the
 * `plgg-poc.qmu.dev` tunnel route).
 *
 * Vendor note: node built-ins only, and this file lives in
 * `entrypoints/` per the vendor-boundary policy. No watch,
 * no rebuild — the portal is static data; re-run
 * `npm run build` after editing `src/pocs.ts`.
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

const PAGE = join(
  ROOT,
  "dist",
  "site",
  "index.html",
);

createServer((req, res) => {
  const path =
    (req.url ?? "/").split("?")[0] ?? "/";
  if (path !== "/" && path !== "/index.html") {
    res.writeHead(404, {
      "content-type":
        "text/plain; charset=utf-8",
    });
    res.end(
      "not found — the portal serves only /",
    );
    return;
  }
  try {
    res.writeHead(200, {
      "content-type":
        "text/html; charset=utf-8",
    });
    res.end(readFileSync(PAGE));
  } catch {
    res.writeHead(404, {
      "content-type":
        "text/plain; charset=utf-8",
    });
    res.end(
      "dist/site/index.html missing — run `npm run build` first",
    );
  }
}).listen(PORT, () =>
  console.log(
    `PoC portal on http://localhost:${PORT}`,
  ),
);
