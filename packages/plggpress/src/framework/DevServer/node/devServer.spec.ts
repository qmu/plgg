import {
  mkdtemp,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isOk } from "plgg";
import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { startDevServer } from "plggpress/framework/DevServer/node/devServer";
import { RELOAD_PATH } from "plggpress/framework/DevServer/model/DevChannel";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const configPath = join(
  here,
  "fixtures",
  "dev.config.ts",
);

const DECODER = new TextDecoder();

// A live SSE frame outcome: whether the needle arrived, and
// whether the stream ended (a dropped channel).
type FrameOutcome = Readonly<{
  found: boolean;
  ended: boolean;
}>;

// Pull the reload stream until a chunk carries `needle` or the
// stream ends. Bounded so a missed frame fails fast rather
// than hanging the suite.
const readUntil = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  needle: string,
): Promise<FrameOutcome> => {
  for (let i = 0; i < 50; i++) {
    const chunk = await reader.read();
    if (chunk.done) {
      return { found: false, ended: true };
    }
    if (
      DECODER.decode(chunk.value).includes(needle)
    ) {
      return { found: true, ended: false };
    }
  }
  return { found: false, ended: false };
};

test("dev server: connect the channel, edit a source file, and observe an in-place reload", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-devserver-"),
  );
  const contentDir = join(root, "content");
  await mkdir(contentDir, { recursive: true });
  const page = join(contentDir, "index.md");
  await writeFile(
    page,
    "# Home\n\nOriginal body.\n",
    "utf8",
  );

  const started = await startDevServer({
    contentDir,
    configPath,
    base: "/",
    // a real dir plus a missing path: the missing one is
    // simply not watched (never a throw).
    watch: [
      contentDir,
      join(root, "does-not-exist"),
    ],
    port: 0,
  });
  if (!isOk(started)) {
    return check(false, toBe(true));
  }
  const handle = started.content;

  try {
    // 1. the initial page: rendered content + injected client
    const first = await fetch(`${handle.url}/`);
    const firstHtml = await first.text();

    // 2. open the plggpress-owned reload channel
    const sse = await fetch(
      `${handle.url}${RELOAD_PATH}`,
    );
    const ctype =
      sse.headers.get("content-type") ?? "";
    const body = sse.body;
    if (body === null) {
      return check("no-sse-body", toBe("has-body"));
    }
    const reader = body.getReader();
    const prelude = await readUntil(
      reader,
      "connected",
    );

    // 3. edit the source file → the watcher pushes a reload
    await writeFile(
      page,
      "# Home\n\nEdited body.\n",
      "utf8",
    );
    const reload = await readUntil(
      reader,
      "data: reload",
    );

    // 4. the page now reflects the edit (same render path
    //    re-reads the file), while the channel stayed open.
    const second = await fetch(`${handle.url}/`);
    const secondHtml = await second.text();

    return all([
      check(first.status, toBe(200)),
      check(firstHtml, toContain("Original body")),
      // the dev-only reload client is injected on the page
      check(firstHtml, toContain("EventSource")),
      check(ctype, toContain("text/event-stream")),
      // the channel is live from the first frame
      check(prelude.found, toBe(true)),
      // the edit pushed a reload frame …
      check(reload.found, toBe(true)),
      // … WITHOUT dropping the channel
      check(reload.ended, toBe(false)),
      // and the page hot-reloads to the edited content
      check(secondHtml, toContain("Edited body")),
    ]);
  } finally {
    await handle.close();
  }
});

test("dev server: a bad config path fails startup on the typed channel (no socket leaked)", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-devserver-bad-"),
  );
  const contentDir = join(root, "content");
  await mkdir(contentDir, { recursive: true });
  await writeFile(
    join(contentDir, "index.md"),
    "# x\n",
    "utf8",
  );
  const started = await startDevServer({
    contentDir,
    configPath: join(
      here,
      "fixtures",
      "missing.config.ts",
    ),
    base: "/",
    watch: [contentDir],
    port: 0,
  });
  return check(isOk(started), toBe(false));
});
