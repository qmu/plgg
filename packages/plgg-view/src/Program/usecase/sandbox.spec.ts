// @plgg-test-environment dom
import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import {
  div,
  button,
  span,
  text,
  lazy,
} from "plgg-view/Html/model/element";
import { type Html } from "plgg-view/Html/model/Html";
import { onClick } from "plgg-view/Html/model/Attribute";
import {
  sandbox,
  Sandbox,
} from "plgg-view/Program/usecase/sandbox";
import {
  cmdNone,
  cmdEffect,
} from "plgg-view/Program/model/Cmd";
import {
  interval,
  subNone,
} from "plgg-view/Program/model/Sub";
import {
  type SubEnv,
  type FrameEnv,
} from "plgg-view/Program/usecase/effects";

// A minimal Elm-Architecture counter — the canonical sandbox. Post-D2 `update`
// returns `[model, Cmd]`; a pure branch returns `cmdNone()`.
type Model = number;
type Msg = "Increment" | "Decrement";

const counter: Sandbox<Model, Msg> = {
  init: [0, cmdNone()],
  update: (msg, model) =>
    msg === "Increment"
      ? [model + 1, cmdNone()]
      : [model - 1, cmdNone()],
  view: (model) =>
    div(
      [],
      [
        button(
          [onClick<Msg>("Decrement")],
          [text("-")],
        ),
        span([], [text(String(model))]),
        button(
          [onClick<Msg>("Increment")],
          [text("+")],
        ),
      ],
    ),
};

const buttons = (root: Element) =>
  Array.from(root.querySelectorAll("button"));

// Flush the microtask queue so pending effect dispatches have run.
const flush = (): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, 0),
  );

// A controllable interval env: intervals fire on tickAll().
const makeFakeEnv = () => {
  const intervals = new Map<number, () => void>();
  const seq = { n: 0 };
  const env: SubEnv = {
    interval: (_ms, tick) => {
      const id = seq.n++;
      intervals.set(id, tick);
      return () => intervals.delete(id);
    },
    windowEvent: () => () => undefined,
  };
  return {
    env,
    tickAll: (): void =>
      intervals.forEach((tick) => tick()),
    activeIntervals: (): number => intervals.size,
  };
};

test("sandbox renders the initial view", () => {
  const root = document.createElement("div");
  sandbox(counter)(root);
  return check(
    root.querySelector("span")?.textContent,
    toBe("0"),
  );
});

test("dispatching from a click updates the model and re-renders", () => {
  const root = document.createElement("div");
  sandbox(counter)(root);
  const [dec, inc] = buttons(root);
  inc?.dispatchEvent(new Event("click"));
  inc?.dispatchEvent(new Event("click"));
  const a1 = check(
    root.querySelector("span")?.textContent,
    toBe("2"),
  );
  dec?.dispatchEvent(new Event("click"));
  return all([
    a1,
    check(
      root.querySelector("span")?.textContent,
      toBe("1"),
    ),
  ]);
});

test("the cleanup function empties the container", () => {
  const root = document.createElement("div");
  const stop = sandbox(counter)(root);
  stop();
  return check(root.children.length, toBe(0));
});

test("the init Cmd runs after paint and dispatches its Msg", async () => {
  const program: Sandbox<number, "Bump"> = {
    init: [
      0,
      cmdEffect(() => Promise.resolve("Bump")),
    ],
    update: (_msg, model) => [
      model + 1,
      cmdNone(),
    ],
    view: (model) =>
      span([], [text(String(model))]),
  };
  const root = document.createElement("div");
  sandbox(program)(root);
  const beforeFlush =
    root.querySelector("span")?.textContent;
  await flush();
  return all([
    check(beforeFlush, toBe("0")),
    check(
      root.querySelector("span")?.textContent,
      toBe("1"),
    ),
  ]);
});

test("a Cmd returned from update dispatches a follow-up Msg", async () => {
  type M = "Go" | "Done";
  const program: Sandbox<string, M> = {
    init: ["idle", cmdNone()],
    update: (msg) =>
      msg === "Go"
        ? [
            "going",
            cmdEffect<M>(() =>
              Promise.resolve("Done"),
            ),
          ]
        : ["done", cmdNone()],
    view: (model) =>
      div(
        [],
        [
          button(
            [onClick<M>("Go")],
            [text("go")],
          ),
          span([], [text(model)]),
        ],
      ),
  };
  const root = document.createElement("div");
  sandbox(program)(root);
  root
    .querySelector("button")
    ?.dispatchEvent(new Event("click"));
  const afterClick =
    root.querySelector("span")?.textContent;
  await flush();
  return all([
    check(afterClick, toBe("going")),
    check(
      root.querySelector("span")?.textContent,
      toBe("done"),
    ),
  ]);
});

test("subscriptions start/stop by model and tick through the runtime", () => {
  type M = "Tick" | "Toggle";
  const fake = makeFakeEnv();
  const program: Sandbox<
    Readonly<{ on: boolean; n: number }>,
    M
  > = {
    init: [{ on: true, n: 0 }, cmdNone()],
    update: (msg, model) =>
      msg === "Tick"
        ? [
            { ...model, n: model.n + 1 },
            cmdNone(),
          ]
        : [
            { ...model, on: !model.on },
            cmdNone(),
          ],
    view: (model) =>
      div(
        [],
        [
          button(
            [onClick<M>("Toggle")],
            [text("toggle")],
          ),
          span([], [text(String(model.n))]),
        ],
      ),
    subscriptions: (model) =>
      model.on
        ? interval("tick", 5, () => "Tick")
        : subNone(),
  };
  const root = document.createElement("div");
  sandbox(program, fake.env)(root);
  const activeAtStart = fake.activeIntervals();
  fake.tickAll();
  fake.tickAll();
  const afterTicks =
    root.querySelector("span")?.textContent;
  // toggle the sub off — the interval must be torn down
  root
    .querySelector("button")
    ?.dispatchEvent(new Event("click"));
  fake.tickAll();
  return all([
    check(activeAtStart, toBe(1)),
    check(afterTicks, toBe("2")),
    check(fake.activeIntervals(), toBe(0)),
    check(
      root.querySelector("span")?.textContent,
      toBe("2"),
    ),
  ]);
});

test("an effect resolving after cleanup is dropped (alive guard)", async () => {
  const program: Sandbox<number, "Bump"> = {
    init: [
      0,
      cmdEffect(() => Promise.resolve("Bump")),
    ],
    update: (_msg, model) => [
      model + 1,
      cmdNone(),
    ],
    view: (model) =>
      span([], [text(String(model))]),
  };
  const root = document.createElement("div");
  const stop = sandbox(program)(root);
  // tear down before the init effect's microtask runs
  stop();
  await flush();
  // the late dispatch hit the alive guard and was dropped — no throw, and the
  // torn-down container stays empty.
  return check(root.children.length, toBe(0));
});

test("cleanup disposes subscriptions", () => {
  const fake = makeFakeEnv();
  const program: Sandbox<number, "Tick"> = {
    init: [0, cmdNone()],
    update: (_msg, model) => [
      model + 1,
      cmdNone(),
    ],
    view: (model) =>
      span([], [text(String(model))]),
    subscriptions: () =>
      interval("t", 5, () => "Tick"),
  };
  const root = document.createElement("div");
  const stop = sandbox(program, fake.env)(root);
  const activeBefore = fake.activeIntervals();
  stop();
  return all([
    check(activeBefore, toBe(1)),
    check(fake.activeIntervals(), toBe(0)),
    check(root.children.length, toBe(0)),
  ]);
});

// --- frame-batched dispatch -------------------------------------------------
//
// Issue #157 gave `application` a frame-batched `dispatch` (several dispatches
// landing within the same browser frame collapse into one `view()` + patch)
// and `lazy` subtree skipping. `lazy` already benefited every runtime — it
// lives in the shared `reconcile` path `makeRenderer` uses for both `sandbox`
// and `application` — but the frame-batching knob itself was only ever wired
// into `application`, even though a `sandbox` app returns the identical
// `[Model, Cmd<Msg>]` shape and can drive just as many out-of-order
// `Cmd`-resolved dispatches. These specs give `sandbox` the same knob,
// mirroring application.spec.ts's `makeFakeFrame` fixture.

// A controllable frame scheduler: `schedule` records the pending paint (at
// most one — the production code never calls it twice without a flush in
// between) and a manual `flush()` fires exactly that callback.
const makeFakeFrame = () => {
  let pending: (() => void) | null = null;
  let scheduleCalls = 0;
  let cancelCalls = 0;
  const frameEnv: FrameEnv = {
    schedule: (paint) => {
      scheduleCalls++;
      pending = paint;
      return () => {
        cancelCalls++;
        pending = null;
      };
    },
  };
  return {
    frameEnv,
    flush: (): void => {
      const paint = pending;
      pending = null;
      paint?.();
    },
    isPending: (): boolean => pending !== null,
    scheduleCalls: (): number => scheduleCalls,
    cancelCalls: (): number => cancelCalls,
  };
};

test("the default (frame) batches several dispatches within the same frame into one view() call", () => {
  const fakeFrame = makeFakeFrame();
  let viewCalls = 0;
  const program: Sandbox<number, "Bump"> = {
    init: [0, cmdNone()],
    update: (_msg, model) => [
      model + 1,
      cmdNone(),
    ],
    view: (model) => {
      viewCalls++;
      return div(
        [],
        [
          button(
            [onClick<"Bump">("Bump")],
            [text("bump")],
          ),
          span([], [text(String(model))]),
        ],
      );
    },
  };
  const root = document.createElement("div");
  const stop = sandbox(
    program,
    undefined,
    fakeFrame.frameEnv,
  )(root);
  const afterMount = viewCalls; // the (unbatched) first paint
  const btn = root.querySelector("button");
  btn?.dispatchEvent(new Event("click")); // dispatch 1 — schedules the frame
  btn?.dispatchEvent(new Event("click")); // dispatch 2 — same pending frame
  btn?.dispatchEvent(new Event("click")); // dispatch 3 — ditto
  const a1 = check(afterMount, toBe(1));
  const a2 = check(viewCalls, toBe(1)); // still just the mount paint
  const a3 = check(
    fakeFrame.scheduleCalls(),
    toBe(1),
  );
  // the DOM has not caught up yet — only the model advanced
  const a4 = check(
    root.querySelector("span")?.textContent,
    toBe("0"),
  );
  fakeFrame.flush();
  const result = all([
    a1,
    a2,
    a3,
    a4,
    check(viewCalls, toBe(2)), // one more view() call, not three
    check(
      root.querySelector("span")?.textContent,
      toBe("3"),
    ), // reflects all 3 dispatches at once
  ]);
  stop();
  return result;
});

test('render: "sync" paints every dispatch immediately and never touches the frame scheduler', () => {
  const fakeFrame = makeFakeFrame();
  let viewCalls = 0;
  const program: Sandbox<number, "Bump"> = {
    init: [0, cmdNone()],
    update: (_msg, model) => [
      model + 1,
      cmdNone(),
    ],
    render: "sync",
    view: (model) => {
      viewCalls++;
      return div(
        [],
        [
          button(
            [onClick<"Bump">("Bump")],
            [text("bump")],
          ),
          span([], [text(String(model))]),
        ],
      );
    },
  };
  const root = document.createElement("div");
  const stop = sandbox(
    program,
    undefined,
    fakeFrame.frameEnv,
  )(root);
  const btn = root.querySelector("button");
  btn?.dispatchEvent(new Event("click"));
  btn?.dispatchEvent(new Event("click"));
  const result = all([
    check(viewCalls, toBe(3)), // mount + 2 dispatches, every one painted
    check(
      root.querySelector("span")?.textContent,
      toBe("2"),
    ),
    check(fakeFrame.scheduleCalls(), toBe(0)),
  ]);
  stop();
  return result;
});

test("cleanup cancels a pending frame-batched paint before it fires", () => {
  const fakeFrame = makeFakeFrame();
  let viewCalls = 0;
  const program: Sandbox<number, "Bump"> = {
    init: [0, cmdNone()],
    update: (_msg, model) => [
      model + 1,
      cmdNone(),
    ],
    view: (model) => {
      viewCalls++;
      return div(
        [],
        [
          button(
            [onClick<"Bump">("Bump")],
            [text("bump")],
          ),
          span([], [text(String(model))]),
        ],
      );
    },
  };
  const root = document.createElement("div");
  const stop = sandbox(
    program,
    undefined,
    fakeFrame.frameEnv,
  )(root);
  root
    .querySelector("button")
    ?.dispatchEvent(new Event("click"));
  const viewCallsBeforeStop = viewCalls;
  const a1 = check(
    fakeFrame.isPending(),
    toBe(true),
  );
  stop();
  const a2 = check(
    fakeFrame.cancelCalls(),
    toBe(1),
  );
  const a3 = check(
    fakeFrame.isPending(),
    toBe(false),
  );
  fakeFrame.flush(); // a no-op: the pending callback was cleared on cancel
  return all([
    a1,
    a2,
    a3,
    check(viewCalls, toBe(viewCallsBeforeStop)),
  ]);
});

// --- benchmark: issue #157's own reproduction, run through `sandbox` -------
//
// The same "3 columns of 2000 rows, 5 out-of-order dispatches" repro
// application.spec.ts benchmarks for `application`, driven here through
// `sandbox` instead (via button clicks rather than URL navigation, since
// `sandbox` has no routing) to prove the frame-batching + `lazy` combination
// collapses dispatches and skips untouched columns under THIS runtime too.
test("benchmark: 3×2000-row columns, 5 out-of-order dispatches collapse into one paint; an untouched column never rebuilds", () => {
  const ROWS = 2000;
  const rowsOf = (
    tag: string,
  ): ReadonlyArray<string> =>
    Array.from(
      { length: ROWS },
      (_, i) => `${tag}-${i}`,
    );
  type ColKey = "a" | "b" | "c";
  type Cols = Readonly<{
    a: ReadonlyArray<string>;
    b: ReadonlyArray<string>;
    c: ReadonlyArray<string>;
  }>;
  type ColMsg = Readonly<{ col: ColKey }>;
  let columnBuilds = 0;
  const column = (
    rows: ReadonlyArray<string>,
  ): Html<never, "div"> => {
    columnBuilds++;
    return div(
      [],
      rows.map((r) => div([], [text(r)])),
    );
  };
  const fakeFrame = makeFakeFrame();
  const program: Sandbox<Cols, ColMsg> = {
    init: [
      {
        a: rowsOf("a0"),
        b: rowsOf("b0"),
        c: rowsOf("c0"),
      },
      cmdNone(),
    ],
    update: (msg, model) => [
      {
        ...model,
        // a fresh array reference every time, even when re-fetching the
        // same column — exactly what `lazy`'s `===` check is built to notice.
        [msg.col]: rowsOf(msg.col),
      },
      cmdNone(),
    ],
    view: (model) =>
      div(
        [],
        [
          button(
            [onClick<ColMsg>({ col: "a" })],
            [text("a")],
          ),
          button(
            [onClick<ColMsg>({ col: "b" })],
            [text("b")],
          ),
          lazy(column, model.a),
          lazy(column, model.b),
          lazy(column, model.c),
        ],
      ),
  };
  const root = document.createElement("div");
  const stop = sandbox(
    program,
    undefined,
    fakeFrame.frameEnv,
  )(root);
  const buildsAfterMount = columnBuilds; // first paint builds all 3, once each
  const [btnA, btnB] = Array.from(
    root.querySelectorAll("button"),
  );
  // 5 clicks resolving one at a time, column "c" never touched.
  const order = [btnA, btnB, btnA, btnB, btnA];
  order.forEach((btn) =>
    btn?.dispatchEvent(new Event("click")),
  );
  const buildsBeforeFlush = columnBuilds;
  const COLUMN_COUNT = 3;
  const CHANGED_COLUMNS = 2; // "a" and "b"; "c" is never touched
  const perColumnCost =
    buildsAfterMount / COLUMN_COUNT;
  fakeFrame.flush();
  const totalBuilds = columnBuilds;
  const result = all([
    // nothing rebuilds before the frame flushes — the whole point of batching
    check(
      buildsBeforeFlush,
      toBe(buildsAfterMount),
    ),
    // "a" and "b" cost exactly one column's worth EACH at the flush, no
    // matter how many times (3 and 2, respectively) they were individually
    // redispatched before it; "c" (never touched) costs nothing at all.
    check(
      totalBuilds - buildsBeforeFlush,
      toBe(perColumnCost * CHANGED_COLUMNS),
    ),
    check(root.textContent, toContain("a-1999")),
    check(root.textContent, toContain("c0-0")), // "c" still shows its ORIGINAL fetch
  ]);
  stop();
  return result;
});
