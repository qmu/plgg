/**
 * CSR dev server — the in-house replacement for `vite`
 * (`npm run serve`). Vite's dev server is not something a
 * minimal bundler should grow, so this is a tiny static
 * `node:http` server with rebuild-on-change: no vite, no
 * new dependency, no native binding.
 *
 * It serves the CSR entry (`index.html`, whose module
 * script points at `/main.js`) and the bundled client
 * (`dist/main.js`), and rebuilds the bundle whenever `src`
 * changes by re-running the canonical `npm run build` (the
 * in-house app bundler) — so there is no second build
 * path to keep in sync.
 *
 * Exit strategy (vendor-neutrality): this depends only on
 * Node built-ins, so it has nothing to migrate off. It is
 * deliberately featureless (no HMR, no transform) — a
 * full reload picks up each rebuild. If a richer dev loop
 * is ever wanted, it can grow here without reintroducing a
 * bundler/dev-server dependency.
 *
 * Run: `npm run serve` (PORT overridable, default 5173).
 */
import { createServer } from "node:http";
import { readFileSync, watch } from "node:fs";
import { join, extname } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const PORT = Number(process.env.PORT ?? 5173);

/** Content types for the two assets this server serves. */
const CONTENT_TYPE: Readonly<
  Record<string, string>
> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

/**
 * Rebuild the client bundle through the canonical npm
 * entry (the in-house app bundler), so the dev server and
 * a plain `npm run build` produce the identical artifact.
 */
const rebuild = (): void => {
  const r = spawnSync("npm", ["run", "build"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  console.log(
    r.status === 0
      ? "built dist/main.js"
      : `build failed:\n${r.stdout ?? ""}${
          r.stderr ?? ""
        }`,
  );
};

/**
 * Map a request path to the file it serves: `/` →
 * `index.html`, `/main.js` → the built bundle. Anything
 * else is absent (`undefined` → 404).
 */
const fileFor = (
  path: string,
): string | undefined =>
  path === "/" || path === ""
    ? "index.html"
    : path === "/main.js"
      ? "dist/main.js"
      : undefined;

rebuild();

// fs.watch debounce: a single save can emit several
// events, so coalesce them onto one rebuild. An
// imperative timer handle is the irreducible seam here.
let pending:
  | ReturnType<typeof setTimeout>
  | undefined;
watch(
  join(ROOT, "src"),
  { recursive: true },
  () => {
    clearTimeout(pending);
    pending = setTimeout(rebuild, 100);
  },
);

createServer((req, res) => {
  const path =
    (req.url ?? "/").split("?")[0] ?? "/";
  const file = fileFor(path);
  if (file === undefined) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  try {
    res.writeHead(200, {
      "content-type":
        CONTENT_TYPE[extname(file)] ??
        "application/octet-stream",
    });
    res.end(readFileSync(join(ROOT, file)));
  } catch {
    res.writeHead(404);
    res.end(`${file} — run \`npm run build\``);
  }
}).listen(PORT, () =>
  console.log(
    `CSR dev server on http://localhost:${PORT}`,
  ),
);
