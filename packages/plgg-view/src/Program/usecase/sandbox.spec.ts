// @plgg-test-environment dom
import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  div,
  button,
  span,
  text,
} from "plgg-view/Html/model/element";
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
import { type SubEnv } from "plgg-view/Program/usecase/effects";

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
        button([onClick<Msg>("Decrement")], [
          text("-"),
        ]),
        span([], [text(String(model))]),
        button([onClick<Msg>("Increment")], [
          text("+"),
        ]),
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
  const intervals = new Map<
    number,
    () => void
  >();
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
    activeIntervals: (): number =>
      intervals.size,
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
          button([onClick<M>("Go")], [
            text("go"),
          ]),
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
        ? [{ ...model, n: model.n + 1 }, cmdNone()]
        : [{ ...model, on: !model.on }, cmdNone()],
    view: (model) =>
      div(
        [],
        [
          button([onClick<M>("Toggle")], [
            text("toggle"),
          ]),
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
