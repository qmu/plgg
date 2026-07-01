import {
  mkdtemp,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { ok, isOk } from "plgg";
import {
  type Handler,
  type Context,
  type Web,
  htmlResponse,
  javascriptResponse,
} from "plgg-server";
import { type SoftStr } from "plgg";
import { type AppOptions } from "plggmatic/App/model/AppOptions";
import { buildRouter } from "plggmatic/Routing/usecase/buildRouter";
import {
  type DevHandle,
  type DevSpec,
  dev as _dev,
  createDevHandle,
  decorateDevHtml,
  isAllowedHost,
  devPort,
  devUrl,
  watchContent,
} from "plggmatic/Dev/usecase/dev";

// Touch the public `dev` export so the barrel re-export
// stays exercised without binding a real port here.
void _dev;

// Count non-overlapping occurrences of a needle.
const occurrences = (
  haystack: string,
  needle: string,
): number => haystack.split(needle).length - 1;

// The "/guide" route answers NON-HTML so the dev
// decoration's non-html passthrough branch is exercised;
// every other route is HTML and gets the live-reload seam.
const echo: Handler = (c: Context) =>
  Promise.resolve(
    ok(
      c.req.path === "/guide"
        ? javascriptResponse(
            "export const x = 1;",
          )
        : htmlResponse(
            "<html><body><main>path:" +
              c.req.path +
              "</main></body></html>",
          ),
    ),
  );
const spec: DevSpec = {
  router: (
    paths: ReadonlyArray<SoftStr>,
  ): Web => buildRouter(paths, echo),
};

const writeCorpus = async (): Promise<string> => {
  const root = await mkdtemp(
    join(tmpdir(), "plggmatic-dev-"),
  );
  const contentDir = join(root, "content");
  await mkdir(contentDir, { recursive: true });
  await writeFile(
    join(contentDir, "index.md"),
    "# Home\n",
    "utf8",
  );
  await writeFile(
    join(contentDir, "guide.md"),
    "# Guide\n",
    "utf8",
  );
  return contentDir;
};

const optsFor = (
  contentDir: string,
): AppOptions => ({
  contentDir,
  outDir: join(contentDir, "..", "out"),
  assetsDir: join(contentDir, "public"),
  base: "/",
  dev: true,
  allowedHosts: ["dev.example"],
});

const handleFor = async (
  contentDir: string,
): Promise<DevHandle> => {
  const result = await createDevHandle(
    optsFor(contentDir),
    spec,
  );
  if (!isOk(result)) {
    throw new Error("dev handle setup failed");
  }
  return result.content;
};

test("decorateDevHtml injects exactly one live-reload script before </body>", () => {
  const page =
    "<html><body><main>hi</main></body></html>";
  const out = decorateDevHtml(page);
  return all([
    check(occurrences(out, "<script"), toBe(1)),
    check(
      out,
      toContain(
        "EventSource('/__plggmatic_reload')",
      ),
    ),
    check(
      out,
      toContain("</script></body>"),
    ),
  ]);
});

test("decorateDevHtml appends when the document has no </body>", () =>
  all([
    check(
      occurrences(
        decorateDevHtml("<main>x</main>"),
        "<script",
      ),
      toBe(1),
    ),
    check(
      decorateDevHtml("<main>x</main>"),
      toContain("<main>x</main><script"),
    ),
  ]));

test("isAllowedHost accepts localhost + configured hosts (port-insensitive), rejects others", () => {
  const allow = isAllowedHost(["dev.example"]);
  return all([
    check(allow("localhost:5181"), toBe(true)),
    check(allow("127.0.0.1"), toBe(true)),
    check(allow("dev.example"), toBe(true)),
    check(allow("dev.example:443"), toBe(true)),
    check(allow("evil.test"), toBe(false)),
  ]);
});

test("dev handler serves the live router WITH exactly one injected live-reload script", async () => {
  const handle = await handleFor(
    await writeCorpus(),
  );
  const res = await handle.fetch(
    new Request("http://localhost/"),
  );
  const body = await res.text();
  return all([
    check(res.status, toBe(200)),
    check(body, toContain("path:/")),
    check(
      occurrences(body, "EventSource"),
      toBe(1),
    ),
    check(
      body,
      toContain(
        "EventSource('/__plggmatic_reload')",
      ),
    ),
  ]);
});

test("dev handler passes a NON-HTML router response through undecorated", async () => {
  const handle = await handleFor(
    await writeCorpus(),
  );
  const res = await handle.fetch(
    new Request("http://localhost/guide"),
  );
  const body = await res.text();
  return all([
    check(res.status, toBe(200)),
    check(
      res.headers.get("content-type") ?? "",
      toContain("javascript"),
    ),
    // a non-HTML answer gets NO live-reload script
    check(
      occurrences(body, "EventSource"),
      toBe(0),
    ),
  ]);
});

test("dev handler answers 403 for a Host outside the allowlist, 200 for an allowed one", async () => {
  const handle = await handleFor(
    await writeCorpus(),
  );
  const denied = await handle.fetch(
    new Request("http://evil.test/"),
  );
  const allowed = await handle.fetch(
    new Request("http://dev.example/guide"),
  );
  return all([
    check(denied.status, toBe(403)),
    check(allowed.status, toBe(200)),
  ]);
});

test("dev SSE endpoint streams text/event-stream and pushes reload after a rebuild", async () => {
  const handle = await handleFor(
    await writeCorpus(),
  );
  const res = await handle.fetch(
    new Request(
      "http://localhost/__plggmatic_reload",
    ),
  );
  if (res.body === null) {
    throw new Error("SSE body missing");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  // prelude opens the stream
  await reader.read();
  const connected = handle.clients.size;
  await handle.rebuild();
  const next = await reader.read();
  const frame = decoder.decode(
    next.value ?? new Uint8Array(),
  );
  await reader.cancel();
  return all([
    check(res.status, toBe(200)),
    check(
      res.headers.get("content-type") ?? "",
      toContain("text/event-stream"),
    ),
    check(connected, toBe(1)),
    check(handle.clients.size, toBe(0)),
    check(frame, toContain("reload")),
  ]);
});

test("devPort honors PORT env and falls back on garbage", () => {
  const saved = process.env.PORT;
  process.env.PORT = "4321";
  const a = devPort();
  process.env.PORT = "not-a-number";
  const b = devPort();
  delete process.env.PORT;
  const c = devPort();
  if (saved !== undefined) {
    process.env.PORT = saved;
  }
  return all([
    check(a, toBe(4321)),
    check(b, toBe(5181)),
    check(c, toBe(5181)),
  ]);
});

test("devUrl formats a localhost dev URL", () =>
  check(
    devUrl(5181),
    toBe("http://localhost:5181/"),
  ));

test("watchContent fires a debounced onChange on a content write, then closes", async () => {
  const dir = await mkdtemp(
    join(tmpdir(), "plggmatic-watch-"),
  );
  await writeFile(join(dir, "a.md"), "x", "utf8");
  let fired = 0;
  const watcher = watchContent(
    dir,
    (): Promise<void> => {
      fired += 1;
      return Promise.resolve();
    },
  );
  await writeFile(join(dir, "a.md"), "y", "utf8");
  await new Promise((resolve) =>
    setTimeout(resolve, 300),
  );
  watcher.close();
  return check(fired >= 1, toBe(true));
});
