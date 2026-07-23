import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  access,
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
import { PATCH_PATH } from "plggpress/framework/DevServer/model/PatchProtocol";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const configPath = join(
  here,
  "fixtures",
  "dev.config.ts",
);

const DECODER = new TextDecoder();

// Pull the reload stream until a chunk carries `needle`, or
// the stream ends. Bounded so a missed frame fails fast.
const reloadArrives = async (
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{ found: boolean; ended: boolean }> => {
  for (let i = 0; i < 50; i++) {
    const chunk = await reader.read();
    if (chunk.done) {
      return { found: false, ended: true };
    }
    if (
      DECODER.decode(chunk.value).includes(
        "data: reload",
      )
    ) {
      return { found: true, ended: false };
    }
  }
  return { found: false, ended: false };
};

const postPatch = (
  url: string,
  body: unknown,
): Promise<Response> =>
  fetch(`${url}${PATCH_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body:
      typeof body === "string"
        ? body
        : JSON.stringify(body),
  });

// Whether a file exists (for the "nothing written outside the
// content dir" assertion).
const exists = (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  );

test("live-edit bridge: a patch edits the source on disk, hot-reloads the page, and keeps the channel connected", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-patch-"),
  );
  const contentDir = join(root, "content");
  await mkdir(contentDir, { recursive: true });
  const pageFile = join(contentDir, "index.md");
  await writeFile(
    pageFile,
    "# Home\n\nOriginal body.\n",
    "utf8",
  );

  const started = await startDevServer({
    contentDir,
    configPath,
    base: "/",
    watch: [contentDir],
    port: 0,
  });
  if (!isOk(started)) {
    return check(false, toBe(true));
  }
  const handle = started.content;

  try {
    // open the plggpress-owned reload channel
    const sse = await fetch(
      `${handle.url}${RELOAD_PATH}`,
    );
    const body = sse.body;
    if (body === null) {
      return check("no-sse-body", toBe("has-body"));
    }
    const reader = body.getReader();
    // drain the prelude so the next frame is the reload
    await reader.read();

    // POST a granular patch against the open document
    const applied = await postPatch(handle.url, {
      path: "index.md",
      edits: [
        {
          find: "Original body",
          replace: "Patched body",
        },
      ],
    });
    const appliedJson: unknown =
      await applied.json();

    // the write pushed a reload without dropping the channel
    const reload = await reloadArrives(reader);

    // the source on disk now carries the edit …
    const onDisk = await readFile(
      pageFile,
      "utf8",
    );
    // … and the page hot-reloads to show it
    const rendered = await (
      await fetch(`${handle.url}/`)
    ).text();

    // a batch of follow-up misuse cases, one live server:
    const notJson = await postPatch(
      handle.url,
      "{ not json",
    );
    const badShape = await postPatch(handle.url, {
      nope: true,
    });
    const missing = await postPatch(handle.url, {
      path: "ghost.md",
      edits: [{ find: "x", replace: "y" }],
    });
    const unapplicable = await postPatch(
      handle.url,
      {
        path: "index.md",
        edits: [
          { find: "not-present", replace: "z" },
        ],
      },
    );

    return all([
      check(applied.status, toBe(200)),
      check(
        typeof appliedJson === "object" &&
          appliedJson !== null &&
          "applied" in appliedJson &&
          appliedJson.applied === true,
        toBe(true),
      ),
      check(reload.found, toBe(true)),
      check(reload.ended, toBe(false)),
      check(onDisk, toContain("Patched body")),
      check(rendered, toContain("Patched body")),
      check(notJson.status, toBe(400)),
      check(badShape.status, toBe(400)),
      check(missing.status, toBe(404)),
      check(unapplicable.status, toBe(422)),
    ]);
  } finally {
    await handle.close();
  }
});

test("live-edit bridge: a patch targeting a path outside the content dir is rejected and writes nothing", async () => {
  const root = await mkdtemp(
    join(tmpdir(), "plggpress-patch-esc-"),
  );
  const contentDir = join(root, "content");
  await mkdir(contentDir, { recursive: true });
  await writeFile(
    join(contentDir, "index.md"),
    "# Home\n",
    "utf8",
  );

  const started = await startDevServer({
    contentDir,
    configPath,
    base: "/",
    watch: [contentDir],
    port: 0,
  });
  if (!isOk(started)) {
    return check(false, toBe(true));
  }
  const handle = started.content;

  try {
    const escaped = await postPatch(handle.url, {
      path: "../escape.md",
      edits: [{ find: "a", replace: "b" }],
    });
    // the traversal target must never have been created
    const leaked = await exists(
      join(root, "escape.md"),
    );
    return all([
      check(escaped.status, toBe(400)),
      check(leaked, toBe(false)),
    ]);
  } finally {
    await handle.close();
  }
});
