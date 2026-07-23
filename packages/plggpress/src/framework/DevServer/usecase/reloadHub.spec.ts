import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { makeReloadHub } from "plggpress/framework/DevServer/usecase/reloadHub";

const DECODER = new TextDecoder();

// The text of one yielded chunk (empty once the stream is done).
const text = (
  r: IteratorResult<Uint8Array>,
): string =>
  r.done === true ? "" : DECODER.decode(r.value);

test("a fresh subscription yields the connected prelude first", async () => {
  const hub = makeReloadHub();
  const it = hub
    .subscribe()
    [Symbol.asyncIterator]();
  return check(
    text(await it.next()),
    toContain("connected"),
  );
});

test("a notify buffered before the next pull is delivered on it", async () => {
  const hub = makeReloadHub();
  const it = hub
    .subscribe()
    [Symbol.asyncIterator]();
  await it.next(); // drain the prelude
  hub.notify(); // no pull waiting → buffered
  return check(
    text(await it.next()),
    toContain("data: reload"),
  );
});

test("a notify delivers to a pull already waiting", async () => {
  const hub = makeReloadHub();
  const it = hub
    .subscribe()
    [Symbol.asyncIterator]();
  await it.next(); // prelude
  const pending = it.next(); // waits on an empty buffer
  hub.notify(); // satisfies the waiting pull
  return check(
    text(await pending),
    toContain("data: reload"),
  );
});

test("connections tracks live subscribers and return() drops one", async () => {
  const hub = makeReloadHub();
  const it = hub
    .subscribe()
    [Symbol.asyncIterator]();
  await it.next(); // prelude
  const before = hub.connections();
  await it.return?.();
  return all([
    check(before, toBe(1)),
    check(hub.connections(), toBe(0)),
  ]);
});

test("close ends a waiting stream with done and drops it", async () => {
  const hub = makeReloadHub();
  const it = hub
    .subscribe()
    [Symbol.asyncIterator]();
  await it.next(); // prelude
  const pending = it.next(); // waiting
  hub.close();
  const ended = await pending;
  return all([
    check(ended.done === true, toBe(true)),
    check(hub.connections(), toBe(0)),
  ]);
});

test("a pull after close returns done", async () => {
  const hub = makeReloadHub();
  const it = hub
    .subscribe()
    [Symbol.asyncIterator]();
  await it.next(); // drain prelude, no pull left waiting
  hub.close(); // finishes a sink with no pending pull
  const ended = await it.next(); // empty buffer + closed → done
  return check(ended.done === true, toBe(true));
});

test("notify reaches every open subscriber at once", async () => {
  const hub = makeReloadHub();
  const a = hub.subscribe()[Symbol.asyncIterator]();
  const b = hub.subscribe()[Symbol.asyncIterator]();
  await a.next(); // preludes
  await b.next();
  hub.notify();
  return all([
    check(
      text(await a.next()),
      toContain("data: reload"),
    ),
    check(
      text(await b.next()),
      toContain("data: reload"),
    ),
    check(hub.connections(), toBe(2)),
  ]);
});
