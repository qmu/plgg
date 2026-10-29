import { test } from "node:test";
import assert from "node:assert/strict";
import { waitUntilReady } from "./pollReady.ts";
import type { Fetcher } from "./pollReady.ts";

const instantSleep = async (
  _ms: number,
): Promise<void> => {};

test("resolves true once the fetcher reports 200", async () => {
  let calls = 0;
  const fetcher: Fetcher = async () => {
    calls += 1;
    return { status: calls < 3 ? 503 : 200 };
  };
  const ready = await waitUntilReady(
    "http://example.invalid/",
    { timeoutMs: 1000, intervalMs: 1 },
    fetcher,
    instantSleep,
  );
  assert.equal(ready, true);
  assert.equal(calls, 3);
});

test("a throwing fetcher (connection refused) counts as not-ready, not an error", async () => {
  let calls = 0;
  const fetcher: Fetcher = async () => {
    calls += 1;
    if (calls < 2) throw new Error("ECONNREFUSED");
    return { status: 200 };
  };
  const ready = await waitUntilReady(
    "http://example.invalid/",
    { timeoutMs: 1000, intervalMs: 1 },
    fetcher,
    instantSleep,
  );
  assert.equal(ready, true);
  assert.equal(calls, 2);
});

test("gives up once the deadline passes", async () => {
  const fetcher: Fetcher = async () => ({
    status: 503,
  });
  const ready = await waitUntilReady(
    "http://example.invalid/",
    { timeoutMs: 20, intervalMs: 5 },
    fetcher,
    instantSleep,
  );
  assert.equal(ready, false);
});

test("a non-200 status never counts as ready", async () => {
  const fetcher: Fetcher = async () => ({
    status: 404,
  });
  const ready = await waitUntilReady(
    "http://example.invalid/",
    { timeoutMs: 20, intervalMs: 5 },
    fetcher,
    instantSleep,
  );
  assert.equal(ready, false);
});

test("real timer sleeper actually waits between retries", async () => {
  let calls = 0;
  const started = Date.now();
  const fetcher: Fetcher = async () => {
    calls += 1;
    return { status: calls < 2 ? 503 : 200 };
  };
  const ready = await waitUntilReady(
    "http://example.invalid/",
    { timeoutMs: 1000, intervalMs: 30 },
    fetcher,
  );
  assert.equal(ready, true);
  assert.ok(Date.now() - started >= 30);
});
