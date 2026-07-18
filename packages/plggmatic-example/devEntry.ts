import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

// The example's dev entry for `plgg-bundle dev`: the dev
// server re-imports this module on every watched edit, so
// the factory is the rebuild point — it re-runs the same
// CLI build `npm run build` uses (dist stays the one
// truth), then serves the package's root HTML and the
// fresh dist bundles. The dev server decorates the HTML
// with its live-reload client, so an edit under `src/`
// rebuilds here and reloads the browser.

const here = import.meta.dirname;

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const typeOf = (path: string): string => {
  const dot = path.lastIndexOf(".");
  const ext = dot === -1 ? "" : path.slice(dot);
  return contentTypes[ext] ?? "application/octet-stream";
};

const notFound = (): Response =>
  new Response("not found", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

const serveFile = async (path: string): Promise<Response> => {
  try {
    const body = await readFile(path);
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: { "content-type": typeOf(path) },
    });
  } catch {
    return notFound();
  }
};

export default (): ((request: Request) => Promise<Response>) => {
  // Rebuild on every (re-)entry — once at start, again per
  // watched edit.
  execFileSync(
    "node",
    ["node_modules/plgg-bundle/bin/plgg-bundle.mjs", "bundle.config.ts"],
    { cwd: here, stdio: "inherit" },
  );
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    // The historical /exhibit/ prefix stays routable.
    const raw = url.pathname.replace(/^\/exhibit\//, "/");
    const path = normalize(raw).replace(/^([/.])+/, "");
    if (path.includes("..")) {
      return notFound();
    }
    if (path === "" || path === "index.html") {
      return serveFile(join(here, "demo1.html"));
    }
    if (path.endsWith(".html")) {
      return serveFile(join(here, path));
    }
    return serveFile(join(here, "dist", path));
  };
};
