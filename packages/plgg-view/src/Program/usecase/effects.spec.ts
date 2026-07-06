// @plgg-test-environment dom
import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { some, none } from "plgg";
import {
  cmdNone,
  cmdBatch,
  cmdEffect,
} from "plgg-view/Program/model/Cmd";
import {
  subNone,
  subBatch,
  interval,
  windowEvent,
  custom,
} from "plgg-view/Program/model/Sub";
import {
  type SubEnv,
  runCmd,
  makeSubRuntime,
  browserSubEnv,
} from "plgg-view/Program/usecase/effects";

type Msg = string;

// Flush the microtask queue (a macrotask boundary) so pending effect `.then`
// dispatches have run.
const flush = (): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, 0),
  );

// A controllable {@link SubEnv}: intervals fire on `tickAll()`, window events
// on `emit(name, event)`. `starts`/`cleanups` count activity so a survivor's
// "not restarted" can be proven.
const makeFakeEnv = () => {
  const intervals = new Map<
    number,
    () => void
  >();
  const listeners = new Map<
    string,
    (event: Event) => void
  >();
  const seq = { n: 0 };
  const starts = { n: 0 };
  const cleanups = { n: 0 };
  const env: SubEnv = {
    interval: (_ms, tick) => {
      starts.n++;
      const id = seq.n++;
      intervals.set(id, tick);
      return () => {
        cleanups.n++;
        intervals.delete(id);
      };
    },
    windowEvent: (event, handler) => {
      starts.n++;
      listeners.set(event, handler);
      return () => {
        cleanups.n++;
        listeners.delete(event);
      };
    },
  };
  return {
    env,
    tickAll: (): void =>
      intervals.forEach((tick) => tick()),
    emit: (name: string, event: Event): void =>
      listeners.get(name)?.(event),
    activeIntervals: (): number =>
      intervals.size,
    starts: (): number => starts.n,
    cleanups: (): number => cleanups.n,
  };
};

test("runCmd executes batched effects in order, dispatching resolved Msgs", async () => {
  const got: Array<Msg> = [];
  runCmd(
    cmdBatch<Msg>([
      cmdEffect(() => Promise.resolve("a")),
      cmdNone(),
      cmdEffect(() => Promise.resolve("b")),
    ]),
    (m) => got.push(m),
  );
  await flush();
  return check(got, toEqual(["a", "b"]));
});

test("an effect resolving after teardown does not dispatch", async () => {
  const got: Array<Msg> = [];
  // the runtime hands runCmd an alive-gated dispatch; simulate teardown.
  const alive = { on: true };
  const dispatch = (m: Msg): void => {
    if (alive.on) {
      got.push(m);
    }
  };
  runCmd(
    cmdEffect<Msg>(() =>
      Promise.resolve("late"),
    ),
    dispatch,
  );
  alive.on = false;
  await flush();
  return check(got, toEqual([]));
});

test("subscription diffing: start new, stop removed, survivor not restarted", () => {
  const fake = makeFakeEnv();
  const runtime = makeSubRuntime<Msg>(
    () => undefined,
    fake.env,
  );
  runtime.reconcile(
    subBatch([
      interval("a", 10, () => "a"),
      interval("b", 10, () => "b"),
    ]),
  );
  const afterFirst = {
    active: fake.activeIntervals(),
    starts: fake.starts(),
  };
  // drop b, keep a, add c
  runtime.reconcile(
    subBatch([
      interval("a", 10, () => "a"),
      interval("c", 10, () => "c"),
    ]),
  );
  const afterSecond = {
    active: fake.activeIntervals(),
    starts: fake.starts(),
    cleanups: fake.cleanups(),
  };
  runtime.disposeAll();
  return all([
    check(afterFirst.active, toBe(2)),
    check(afterFirst.starts, toBe(2)),
    // still 2 active (a survived, b stopped, c started)
    check(afterSecond.active, toBe(2)),
    // exactly ONE new start (c) — a was NOT restarted (else 4)
    check(afterSecond.starts, toBe(3)),
    // exactly ONE cleanup (b)
    check(afterSecond.cleanups, toBe(1)),
    // disposeAll tears the rest down
    check(fake.activeIntervals(), toBe(0)),
    check(fake.cleanups(), toBe(3)),
  ]);
});

test("interval ticks dispatch toMsg and stop on removal", () => {
  const fake = makeFakeEnv();
  const got: Array<Msg> = [];
  const runtime = makeSubRuntime<Msg>(
    (m) => got.push(m),
    fake.env,
  );
  runtime.reconcile(
    interval("t", 5, () => "tick"),
  );
  fake.tickAll();
  fake.tickAll();
  const afterTicks = [...got];
  runtime.reconcile(subNone());
  fake.tickAll();
  return all([
    check(afterTicks, toEqual(["tick", "tick"])),
    check(got, toEqual(["tick", "tick"])),
  ]);
});

test("windowEvent dispatches only when the filter returns some", () => {
  const fake = makeFakeEnv();
  const got: Array<Msg> = [];
  const runtime = makeSubRuntime<Msg>(
    (m) => got.push(m),
    fake.env,
  );
  runtime.reconcile(
    windowEvent<Msg>("k", "message", (event) =>
      event.type === "accept"
        ? some("hit")
        : none(),
    ),
  );
  fake.emit("message", new Event("accept"));
  fake.emit("message", new Event("ignore"));
  return check(got, toEqual(["hit"]));
});

test("a custom (WebSocket-shaped) subscription: start dispatches, cleanup fires", () => {
  const got: Array<Msg> = [];
  const disposed = { yes: false };
  const socket = custom<Msg>(
    "socket",
    (dispatch) => {
      // a fake channel pushing several inbound frames
      dispatch("open");
      dispatch("frame-1");
      dispatch("frame-2");
      return () => {
        disposed.yes = true;
      };
    },
  );
  const runtime = makeSubRuntime<Msg>(
    (m) => got.push(m),
    makeFakeEnv().env,
  );
  runtime.reconcile(socket);
  const afterStart = [...got];
  runtime.disposeAll();
  return all([
    check(
      afterStart,
      toEqual(["open", "frame-1", "frame-2"]),
    ),
    check(disposed.yes, toBe(true)),
  ]);
});

test("browserSubEnv wires real interval + window listeners with cleanups", () => {
  // interval: start then clear at once (10s never fires) — covers the seam.
  browserSubEnv.interval(
    10000,
    () => undefined,
  )();
  // window event: fires while registered, silent after cleanup.
  const got: Array<string> = [];
  const stop = browserSubEnv.windowEvent(
    "pm-effects-test",
    () => got.push("hit"),
  );
  window.dispatchEvent(
    new Event("pm-effects-test"),
  );
  stop();
  window.dispatchEvent(
    new Event("pm-effects-test"),
  );
  return check(got, toEqual(["hit"]));
});
