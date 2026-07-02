import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// The end-to-end hot-reload PoC (ticket 041500). It runs
// the REAL toolchain — `node bin/plgg-bundle.mjs dev` on a
// throwaway fixture app — then edits a *deep* source module
// mid-run and proves the served output changes with NO
// process restart, and that the SSE reload channel opens.
// This is the fidelity oracle for the whole chain: bin +
// loader-hook version propagation + module-runner re-import
// + node:http serve + fs.watch + SSE.

/** This spec's dir → the package's bin/plgg-bundle.mjs. */
const BIN = join(
  fileURLToPath(import.meta.url),
  "..",
  "..",
  "..",
  "..",
  "bin",
  "plgg-bundle.mjs",
);

/** A dev entry that renders a deep child's message as HTML. */
const ENTRY_SRC = [
  `import { message } from "./child.ts";`,
  `export default () =>`,
  `  (_request) =>`,
  `    Promise.resolve(`,
  `      new Response(`,
  '        `<html><body>${message()}</body></html>`,',
  `        { headers: { "content-type": "text/html" } },`,
  `      ),`,
  `    );`,
].join("\n");

/** The deep child module the edit targets. */
const childSrc = (word: string): string =>
  `export const message = () => "${word}";\n`;

/** A minimal dev-only bundle config for the fixture app. */
const configSrc = (root: string): string =>
  `export default ${JSON.stringify(
    {
      root,
      rootDir: ".",
      outDir: "dist",
      fileNamePattern: "[name].[format].js",
      entries: [],
      formats: ["es"],
      alias: { prefix: "fixture", srcRoot: "." },
      dev: {
        entry: "entry.ts",
        // Port 0 → ephemeral; the real port is read from
        // the server's ready line.
        port: 0,
        watch: [root],
        allowedHosts: [],
      },
    },
    null,
    2,
  )};\n`;

/** Lay down the fixture app in a fresh temp dir. */
const writeFixture = (): string => {
  const dir = mkdtempSync(
    join(tmpdir(), "plgg-dev-poc-"),
  );
  writeFileSync(
    join(dir, "child.ts"),
    childSrc("ALPHA"),
  );
  writeFileSync(
    join(dir, "entry.ts"),
    ENTRY_SRC,
  );
  writeFileSync(
    join(dir, "bundle.config.ts"),
    configSrc(dir),
  );
  return dir;
};

/** Sleep (test-only pacing for the watch/reload loop). */
const wait = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * Spawn `plgg-bundle dev` on the fixture and resolve the
 * served URL once the ready line is printed.
 */
const startDev = (
  dir: string,
): Promise<{
  proc: ChildProcess;
  url: string;
}> =>
  new Promise((resolve, reject) => {
    const proc = spawn(
      process.execPath,
      [BIN, "dev", "bundle.config.ts"],
      { cwd: dir },
    );
    let out = "";
    const onData = (chunk: Buffer): void => {
      out += chunk.toString();
      const m = out.match(
        /http:\/\/localhost:\d+\//,
      );
      if (m) {
        proc.stdout?.off("data", onData);
        resolve({ proc, url: m[0] });
      }
    };
    proc.stdout?.on("data", onData);
    proc.on("error", reject);
    setTimeout(
      () =>
        reject(
          new Error(
            `dev server did not start; output:\n${out}`,
          ),
        ),
      8000,
    );
  });

/** Fetch a URL's body text. */
const body = (url: string): Promise<string> =>
  fetch(url).then((r) => r.text());

/**
 * Poll `body(url)` until it contains `needle`, or throw on
 * timeout. Proves the served output actually changed after
 * the edit (not a fixed sleep guess).
 */
const pollFor = async (
  url: string,
  needle: string,
): Promise<boolean> => {
  const deadline = 6000;
  const step = 60;
  for (let waited = 0; waited < deadline; ) {
    if ((await body(url)).includes(needle)) {
      return true;
    }
    await wait(step);
    waited += step;
  }
  return false;
};

test("plgg-bundle dev hot-reloads a deep source edit with no restart", async () => {
  const dir = writeFixture();
  const { proc, url } = await startDev(dir);
  try {
    const first = await body(url);
    // Rewrite the DEEP child (not the entry) mid-run.
    writeFileSync(
      join(dir, "child.ts"),
      childSrc("BETA"),
    );
    const reloaded = await pollFor(url, "BETA");
    const stillAlive = proc.exitCode === null;
    return all([
      // Initial render came from the child module.
      check(
        first.includes("ALPHA"),
        toBe(true),
      ),
      // The dev server injected its live-reload client.
      check(
        first.includes("EventSource"),
        toBe(true),
      ),
      // The deep edit re-evaluated and is now served …
      check(reloaded, toBe(true)),
      // … by the SAME process (no restart).
      check(stillAlive, toBe(true)),
    ]);
  } finally {
    proc.kill();
  }
});

test("plgg-bundle dev opens an SSE reload channel", async () => {
  const dir = writeFixture();
  const { proc, url } = await startDev(dir);
  try {
    const res = await fetch(
      `${url}__plgg_reload`,
    );
    const contentType =
      res.headers.get("content-type") ?? "";
    // Read the opener frame, then release the stream.
    const reader = res.body?.getReader();
    const firstChunk = reader
      ? await reader.read()
      : { value: undefined };
    await reader?.cancel();
    const text = firstChunk.value
      ? new TextDecoder().decode(
          firstChunk.value,
        )
      : "";
    return all([
      check(
        contentType.includes(
          "text/event-stream",
        ),
        toBe(true),
      ),
      check(
        text.includes("connected"),
        toBe(true),
      ),
    ]);
  } finally {
    proc.kill();
  }
});
