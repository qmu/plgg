import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
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
import { none, isOk } from "plgg";
import { type SiteConfig } from "plgg-press/SiteConfig/model/SiteConfig";
import { type PressOptions } from "plgg-press/Press/model/PressOptions";
import { build } from "plgg-press/build";
import {
  type DevHandle,
  dev as _dev,
  createDevHandle,
  decorateDevHtml,
  isAllowedHost,
  devPort,
  devUrl,
  watchContent,
} from "plgg-press/dev";

// Touch the public `dev` export so the barrel re-export
// stays exercised without binding a real port here.
void _dev;

// Count non-overlapping occurrences of a needle.
const occurrences = (
  haystack: string,
  needle: string,
): number => haystack.split(needle).length - 1;

const config: SiteConfig = {
  title: "Dev Fixture",
  description: "d",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  home: none(),
  dev: { allowedHosts: ["press.example"] },
};

// A minimal link-free corpus so the dev render path and a
// production build() share inputs without a broken-link
// failure.
const writeCorpus = async (): Promise<string> => {
  const root = await mkdtemp(
    join(tmpdir(), "plgg-press-dev-"),
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
    "# Guide\n\nProse.\n",
    "utf8",
  );
  return contentDir;
};

const optsFor = (
  contentDir: string,
  devRun: boolean,
): PressOptions => ({
  contentDir,
  outDir: join(contentDir, "..", "out"),
  assetsDir: join(contentDir, "public"),
  config,
  base: "/",
  dev: devRun,
  allowedHosts: config.dev.allowedHosts,
});

const handleFor = async (
  contentDir: string,
): Promise<DevHandle> => {
  const result = await createDevHandle(
    optsFor(contentDir, true),
  );
  if (!isOk(result)) {
    throw new Error(
      "dev handle setup failed",
    );
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
      toContain("EventSource('/__press_reload')"),
    ),
    check(
      occurrences(out, "EventSource"),
      toBe(1),
    ),
    // appended INSIDE the body, just before the close tag
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
  const allow = isAllowedHost(["press.example"]);
  return all([
    check(allow("localhost:5181"), toBe(true)),
    check(allow("127.0.0.1"), toBe(true)),
    check(allow("press.example"), toBe(true)),
    check(
      allow("press.example:443"),
      toBe(true),
    ),
    check(allow("evil.test"), toBe(false)),
    check(
      allow("plgg-guide.qmu.dev"),
      toBe(false),
    ),
  ]);
});

test("dev handler renders the shared page WITH exactly one injected live-reload script", async () => {
  const handle = await handleFor(
    await writeCorpus(),
  );
  const res = await handle.fetch(
    new Request("http://localhost/"),
  );
  const body = await res.text();
  return all([
    check(res.status, toBe(200)),
    check(occurrences(body, "<script"), toBe(1)),
    check(
      occurrences(body, "EventSource"),
      toBe(1),
    ),
    check(
      body,
      toContain("EventSource('/__press_reload')"),
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
    new Request("http://press.example/guide"),
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
      "http://localhost/__press_reload",
    ),
  );
  if (res.body === null) {
    throw new Error("SSE body missing");
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  // prelude opens the stream
  await reader.read();
  // the open stream is a registered client
  const connected = handle.clients.size;
  await handle.rebuild();
  const next = await reader.read();
  const frame = decoder.decode(
    next.value ?? new Uint8Array(),
  );
  // disconnecting drops it from the registry
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

test("PRODUCTION build() render path emits NO <script> and NO EventSource; dev path emits exactly one", async () => {
  const opts = optsFor(
    await writeCorpus(),
    false,
  );
  const report = await build(opts);
  if (!isOk(report)) {
    throw new Error("build failed");
  }
  // What build() actually wrote: the shared render path
  // with NO dev seam.
  const prod = await readFile(
    join(opts.outDir, "index.html"),
    "utf8",
  );
  // The SAME render path under dev(): the only difference
  // is the string-appended live-reload script.
  const handle = await handleFor(opts.contentDir);
  const devPage = await (
    await handle.fetch(
      new Request("http://localhost/"),
    )
  ).text();
  return all([
    check(occurrences(prod, "<script"), toBe(0)),
    check(
      occurrences(prod, "EventSource"),
      toBe(0),
    ),
    check(
      occurrences(devPage, "<script"),
      toBe(1),
    ),
    check(
      occurrences(devPage, "EventSource"),
      toBe(1),
    ),
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
    join(tmpdir(), "plgg-press-watch-"),
  );
  await writeFile(
    join(dir, "a.md"),
    "x",
    "utf8",
  );
  // mutation seam: count callback fires from the watcher
  let fired = 0;
  const watcher = watchContent(
    dir,
    (): Promise<void> => {
      fired += 1;
      return Promise.resolve();
    },
  );
  await writeFile(
    join(dir, "a.md"),
    "y",
    "utf8",
  );
  await new Promise((resolve) =>
    setTimeout(resolve, 300),
  );
  watcher.close();
  return check(fired >= 1, toBe(true));
});
