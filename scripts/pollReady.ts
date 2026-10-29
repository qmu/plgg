/**
 * Polls an HTTP URL until it answers 200, or a timeout elapses.
 *
 * Backs scripts/gate-workload-startup.sh: `docker compose up -d --build`
 * exiting 0 only proves the image built and a process started, not that
 * guide's dev-entrypoint (npm installs + sibling builds, all AFTER the
 * bind mount goes live) or the example server ever finish booting. The
 * fetcher and sleeper are injected so the retry/timeout logic has a spec
 * that needs neither a real server nor real wall-clock waits.
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export type PollOptions = Readonly<{
  timeoutMs: number;
  intervalMs: number;
}>;

export type Fetcher = (
  url: string,
) => Promise<Readonly<{ status: number }>>;

export type Sleeper = (ms: number) => Promise<void>;

const defaultSleep: Sleeper = (ms) =>
  new Promise((done) => setTimeout(done, ms));

/**
 * Retries `fetcher(url)` on `intervalMs` spacing until it reports HTTP
 * 200 or `timeoutMs` elapses. A fetch that throws — connection refused,
 * the normal state while a container is still booting — counts as
 * not-ready rather than as an error.
 */
export const waitUntilReady = async (
  url: string,
  options: PollOptions,
  fetcher: Fetcher,
  sleep: Sleeper = defaultSleep,
): Promise<boolean> => {
  const deadline = Date.now() + options.timeoutMs;
  for (;;) {
    const status = await fetcher(url).then(
      (r) => r.status,
      () => undefined,
    );
    if (status === 200) return true;
    if (Date.now() >= deadline) return false;
    await sleep(options.intervalMs);
  }
};

const fetchStatus: Fetcher = async (url) => {
  const response = await fetch(url);
  return { status: response.status };
};

const parsePositiveInt = (
  raw: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0
    ? parsed
    : fallback;
};

const main = async (): Promise<void> => {
  const [, , url, timeoutArg, intervalArg] =
    process.argv;
  if (url === undefined) {
    process.stderr.write(
      "usage: pollReady.ts <url> <timeoutMs> [intervalMs]\n",
    );
    process.exitCode = 2;
    return;
  }
  const ready = await waitUntilReady(
    url,
    {
      timeoutMs: parsePositiveInt(timeoutArg, 60000),
      intervalMs: parsePositiveInt(intervalArg, 2000),
    },
    fetchStatus,
  );
  process.stdout.write(
    ready
      ? `ready: ${url}\n`
      : `timed out waiting for ${url}\n`,
  );
  process.exitCode = ready ? 0 : 1;
};

// Run the CLI only when invoked directly, never when a spec imports the
// helpers above (node --test loads this module and would otherwise poll
// a real URL as a side effect of importing it).
const invoked = process.argv[1];
if (
  invoked !== undefined &&
  fileURLToPath(import.meta.url) === resolve(invoked)
) {
  void main();
}
