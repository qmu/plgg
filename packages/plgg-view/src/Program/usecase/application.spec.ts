// @plgg-test-environment dom
//
// The in-house test DOM is navigation-inert: an un-prevented same-origin
// anchor click never auto-changes `location`, so each test sees only the
// History-API state the runtime drives — no navigation-disable knob needed.
// Each mounted app is torn down in afterEach so its document-level click /
// popstate listeners never leak into the next test.
import {
  test,
  check,
  all,
  toBe,
  toContain,
  toEqual,
  beforeEach,
  afterEach,
} from "plgg-test";
import {
  div,
  a,
  button,
  text,
  lazy,
} from "plgg-view/Html/model/element";
import { type Html } from "plgg-view/Html/model/Html";
import {
  href,
  onClick,
} from "plgg-view/Html/model/Attribute";
import {
  application,
  Application,
} from "plgg-view/Program/usecase/application";
import {
  Url,
  makeUrl,
} from "plgg-view/Program/model/Url";
import {
  cmdNone,
  cmdEffect,
} from "plgg-view/Program/model/Cmd";
import { interval } from "plgg-view/Program/model/Sub";
import {
  type SubEnv,
  type FrameEnv,
} from "plgg-view/Program/usecase/effects";
import { style_ } from "plgg-view/Style/usecase/style_";
import { p } from "plgg-view/Style/usecase/utilities";

type Model = Url;
type Msg = Readonly<{ url: Url }>;

// A 2-route app: home links to /users/1; the user page links back home.
const app: Application<Model, Msg> = {
  init: (url) => [url, cmdNone()],
  update: (msg) => [msg.url, cmdNone()],
  view: (model) =>
    model.path === "/"
      ? div(
          [],
          [
            a(
              [href("/users/1")],
              [text("user 1")],
            ),
          ],
        )
      : div(
          [],
          [
            text("user page "),
            a([href("/")], [text("home")]),
          ],
        ),
  onUrlChange: (url) => ({ url }),
};

let stop: () => void = () => {};

const mount = (): Element => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(app)(root);
  return root;
};

// Mounts an arbitrary program (used by the model→URL reflection tests).
const mountApp = <M, Mg>(
  program: Application<M, Mg>,
): Element => {
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(program)(root);
  return root;
};

// Records history writes (method + target) while calling through, so the
// reflection tests can assert push-vs-replace, which `window.location` alone
// cannot distinguish. `Object.defineProperty`'s untyped `value` lets the stub
// stand in without a cast.
let historyCalls: ReadonlyArray<
  readonly [string, string]
> = [];
let restoreHistory: () => void = () => {};

const spyHistory = (): void => {
  historyCalls = [];
  const origPush = window.history.pushState.bind(
    window.history,
  );
  const origReplace =
    window.history.replaceState.bind(
      window.history,
    );
  Object.defineProperty(
    window.history,
    "pushState",
    {
      configurable: true,
      value: (
        data: unknown,
        unused: string,
        url: string,
      ) => {
        historyCalls = [
          ...historyCalls,
          ["push", url],
        ];
        origPush(data, unused, url);
      },
    },
  );
  Object.defineProperty(
    window.history,
    "replaceState",
    {
      configurable: true,
      value: (
        data: unknown,
        unused: string,
        url: string,
      ) => {
        historyCalls = [
          ...historyCalls,
          ["replace", url],
        ];
        origReplace(data, unused, url);
      },
    },
  );
  restoreHistory = () => {
    Object.defineProperty(
      window.history,
      "pushState",
      { configurable: true, value: origPush },
    );
    Object.defineProperty(
      window.history,
      "replaceState",
      { configurable: true, value: origReplace },
    );
    restoreHistory = () => {};
  };
};

const click = (
  target: EventTarget,
  init: MouseEventInit = {},
): MouseEvent => {
  const evt = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ...init,
  });
  target.dispatchEvent(evt);
  return evt;
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
  document.body.innerHTML = "";
});

afterEach(() => {
  stop();
  restoreHistory();
});

test("renders the route for the entry URL", () => {
  const root = mount();
  return check(
    root.textContent,
    toContain("user 1"),
  );
});

test("intercepts an in-app link click: pushes, re-renders the new route", () => {
  const root = mount();
  const link = root.querySelector("a");
  const evt = link
    ? click(link)
    : new MouseEvent("click");
  return all([
    check(evt.defaultPrevented, toBe(true)),
    check(
      window.location.pathname,
      toBe("/users/1"),
    ),
    check(
      root.textContent,
      toContain("user page"),
    ),
  ]);
});

test("popstate re-renders the current route", () => {
  const root = mount();
  window.history.replaceState(
    null,
    "",
    "/users/1",
  );
  window.dispatchEvent(new Event("popstate"));
  return check(
    root.textContent,
    toContain("user page"),
  );
});

test("preserves the browser default for a modifier-click", () => {
  const root = mount();
  const link = root.querySelector("a");
  const evt = link
    ? click(link, { metaKey: true })
    : new MouseEvent("click");
  return all([
    check(evt.defaultPrevented, toBe(false)),
    check(window.location.pathname, toBe("/")),
  ]);
});

test("preserves the browser default for a cross-origin link", () => {
  const root = mount();
  const link = root.querySelector("a");
  if (link) {
    link.setAttribute(
      "href",
      "https://other.example.com/x",
    );
  }
  const evt = link
    ? click(link)
    : new MouseEvent("click");
  return check(evt.defaultPrevented, toBe(false));
});

test("ignores a click that is not inside an anchor", () => {
  const root = mount();
  const evt = click(root);
  return check(evt.defaultPrevented, toBe(false));
});

test("cleanup removes listeners and empties the container", () => {
  const root = mount();
  stop();
  const a1 = check(root.children.length, toBe(0));
  // a popstate after cleanup must not re-render
  window.history.replaceState(
    null,
    "",
    "/users/1",
  );
  window.dispatchEvent(new Event("popstate"));
  return all([
    a1,
    check(root.textContent, toBe("")),
  ]);
});

// --- model→URL reflection (nuqs-style) -----------------------------------

type CountModel = Readonly<{ n: number }>;
type CountMsg =
  | Readonly<{ kind: "inc" }>
  | Readonly<{ kind: "url"; n: number }>;

const nOf = (url: Url): number => {
  const value = new URLSearchParams(
    url.search,
  ).get("n");
  return value === null ? 0 : Number(value);
};

// `n` is reflected to `?n=…`; clicking the button increments it (a model change
// that is NOT a URL navigation), which is what drives the reflection seam.
const baseCountApp: Application<
  CountModel,
  CountMsg
> = {
  init: (url) => [{ n: nOf(url) }, cmdNone()],
  update: (msg, model) =>
    msg.kind === "inc"
      ? [{ n: model.n + 1 }, cmdNone()]
      : [{ n: msg.n }, cmdNone()],
  view: (model) =>
    div(
      [],
      [
        button(
          [onClick<CountMsg>({ kind: "inc" })],
          [text(`n=${model.n}`)],
        ),
      ],
    ),
  onUrlChange: (url) => ({
    kind: "url",
    n: nOf(url),
  }),
  toUrl: (model) =>
    model.n === 0
      ? makeUrl("/", "")
      : makeUrl("/", `?n=${model.n}`),
};

const countAppWith = (
  mode: "push" | "replace" | "none",
): Application<CountModel, CountMsg> => ({
  ...baseCountApp,
  historyMode: () => mode,
});

const clickButton = (root: Element): void => {
  const btn = root.querySelector("button");
  if (btn) {
    click(btn);
  }
};

test("reflects a model change into the URL via replaceState by default", () => {
  spyHistory();
  const root = mountApp(baseCountApp);
  clickButton(root);
  return all([
    check(historyCalls, toEqual([
      ["replace", "/?n=1"],
    ])),
    check(
      window.location.search,
      toBe("?n=1"),
    ),
  ]);
});

test("historyMode push adds a history entry instead of replacing", () => {
  spyHistory();
  const root = mountApp(countAppWith("push"));
  clickButton(root);
  return check(historyCalls, toEqual([
    ["push", "/?n=1"],
  ]));
});

test("historyMode none skips the URL write but still updates the model", () => {
  spyHistory();
  const root = mountApp(countAppWith("none"));
  clickButton(root);
  return all([
    check(historyCalls, toEqual([])),
    check(root.textContent, toContain("n=1")),
  ]);
});

test("does not write when the reflected URL is unchanged (loop-free)", () => {
  window.history.replaceState(null, "", "/?n=1");
  spyHistory();
  const root = mountApp(baseCountApp);
  // a popstate round-trip to the same URL: onUrlChange → update → toUrl equals
  // the current location → no spurious write
  window.dispatchEvent(new Event("popstate"));
  return all([
    check(historyCalls, toEqual([])),
    check(root.textContent, toContain("n=1")),
  ]);
});

test("the runtime injects a <style> sheet for the tree's style_() atoms", () => {
  const styleApp: Application<Url, Msg> = {
    init: (url) => [url, cmdNone()],
    update: (msg) => [msg.url, cmdNone()],
    view: () => div([style_(p(2))], [text("x")]),
    onUrlChange: (url) => ({ url }),
  };
  mountApp(styleApp);
  const sheet = document.head.querySelector(
    "style[data-plgg-style]",
  );
  return check(
    sheet?.textContent ?? "",
    toContain("padding:0.5rem"),
  );
});

test("the sheet keeps a rule the new tree dropped (exiting nodes still wear it)", () => {
  // view styles the node only in the initial state; the dispatched Msg
  // re-renders to an UNSTYLED tree — the rule must survive, because a
  // deferred-removal exit can still be wearing the class mid-animation.
  const styleApp: Application<Url, Msg> = {
    init: (url) => [url, cmdNone()],
    update: (msg) => [msg.url, cmdNone()],
    view: (model) =>
      model.path === "/users/9"
        ? div([], [text("bare")])
        : div([style_(p(4))], [text("styled")]),
    onUrlChange: (url) => ({ url }),
  };
  const root = mountApp(styleApp);
  const sheet = document.head.querySelector(
    "style[data-plgg-style]",
  );
  const a1 = check(
    sheet?.textContent ?? "",
    toContain("padding:1rem"),
  );
  // navigate → unstyled tree
  window.history.pushState(null, "", "/users/9");
  window.dispatchEvent(new Event("popstate"));
  return all([
    a1,
    check(root.textContent, toContain("bare")),
    // insert-only: the dropped atom's rule is still in the sheet
    check(
      sheet?.textContent ?? "",
      toContain("padding:1rem"),
    ),
  ]);
});

test("an app without toUrl never writes history on dispatch", () => {
  spyHistory();
  const root = mount();
  const link = root.querySelector("a");
  if (link) {
    click(link);
  }
  // the link's own pushState is recorded, but no reflection write follows it
  return check(historyCalls, toEqual([
    ["push", "/users/1"],
  ]));
});

// --- effects: subscriptions on the application runtime -------------------

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

test("an init effect resolving after cleanup is dropped (alive guard)", async () => {
  type EModel = Readonly<{ n: number }>;
  type EMsg =
    | Readonly<{ kind: "bump" }>
    | Readonly<{ kind: "url" }>;
  const flush = (): Promise<void> =>
    new Promise((resolve) =>
      setTimeout(resolve, 0),
    );
  const effApp: Application<EModel, EMsg> = {
    init: () => [
      { n: 0 },
      cmdNone(),
    ],
    update: (msg, model) =>
      msg.kind === "bump"
        ? [{ n: model.n + 1 }, cmdNone()]
        : [model, cmdNone()],
    view: (model) =>
      div([], [text(`n=${model.n}`)]),
    onUrlChange: () => ({ kind: "url" }),
  };
  // build an app whose init carries a late effect
  const lateApp: Application<EModel, EMsg> = {
    ...effApp,
    init: () => [
      { n: 0 },
      cmdEffect<EMsg>(() =>
        Promise.resolve({ kind: "bump" }),
      ),
    ],
  };
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(lateApp)(root);
  stop();
  await flush();
  // the late dispatch was dropped by the alive guard; container stays empty.
  return check(root.children.length, toBe(0));
});

test("a subscription ticks through the application runtime and disposes on cleanup", () => {
  const fake = makeFakeEnv();
  type SModel = Readonly<{ n: number }>;
  type SMsg =
    | Readonly<{ kind: "tick" }>
    | Readonly<{ kind: "url" }>;
  const subApp: Application<SModel, SMsg> = {
    init: () => [{ n: 0 }, cmdNone()],
    update: (msg, model) =>
      msg.kind === "tick"
        ? [{ n: model.n + 1 }, cmdNone()]
        : [model, cmdNone()],
    view: (model) =>
      div([], [text(`n=${model.n}`)]),
    onUrlChange: () => ({ kind: "url" }),
    subscriptions: () =>
      interval("tick", 5, () => ({
        kind: "tick",
      })),
  };
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(subApp, fake.env)(root);
  const activeBefore = fake.activeIntervals();
  fake.tickAll();
  fake.tickAll();
  const afterTicks = root.textContent;
  stop();
  return all([
    check(activeBefore, toBe(1)),
    check(afterTicks, toContain("n=2")),
    check(fake.activeIntervals(), toBe(0)),
  ]);
});

// --- frame-batched dispatch ------------------------------------------------

// A controllable frame scheduler: `schedule` records the pending paint (at
// most one — the production code never calls it twice without a flush in
// between) and a manual `flush()` fires exactly that callback. The
// frame-batching counterpart to `makeFakeEnv`'s controllable interval.
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

type BumpModel = Readonly<{ n: number }>;
type BumpMsg = Readonly<{ kind: "bump" }>;

const makeBumpApp = (
  onViewCall: () => void,
): Application<BumpModel, BumpMsg> => ({
  init: () => [{ n: 0 }, cmdNone()],
  update: (_msg, model) => [
    { n: model.n + 1 },
    cmdNone(),
  ],
  view: (model) => {
    onViewCall();
    return div([], [text(String(model.n))]);
  },
  onUrlChange: () => ({ kind: "bump" }),
});

test("the default (frame) batches several dispatches within the same frame into one view() call", () => {
  const fakeFrame = makeFakeFrame();
  const fakeInterval = makeFakeEnv();
  let viewCalls = 0;
  const program = makeBumpApp(() => viewCalls++);
  const subApp: Application<
    BumpModel,
    BumpMsg
  > = {
    ...program,
    subscriptions: () =>
      interval("tick", 1, () => ({
        kind: "bump",
      })),
  };
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(
    subApp,
    fakeInterval.env,
    fakeFrame.frameEnv,
  )(root);
  const afterMount = viewCalls; // the (unbatched) first paint
  fakeInterval.tickAll(); // dispatch 1 — schedules the frame
  fakeInterval.tickAll(); // dispatch 2 — same pending frame, not rescheduled
  fakeInterval.tickAll(); // dispatch 3 — ditto
  const a1 = check(afterMount, toBe(1));
  const a2 = check(viewCalls, toBe(1)); // still just the mount paint
  const a3 = check(
    fakeFrame.scheduleCalls(),
    toBe(1),
  );
  // the DOM has not caught up yet — only the model advanced
  const a4 = check(root.textContent, toBe("0"));
  fakeFrame.flush();
  return all([
    a1,
    a2,
    a3,
    a4,
    check(viewCalls, toBe(2)), // one more view() call, not three
    check(root.textContent, toBe("3")), // reflects all 3 dispatches at once
  ]);
});

test("render: \"sync\" paints every dispatch immediately and never touches the frame scheduler", () => {
  const fakeFrame = makeFakeFrame();
  const fakeInterval = makeFakeEnv();
  let viewCalls = 0;
  const subApp: Application<
    BumpModel,
    BumpMsg
  > = {
    ...makeBumpApp(() => viewCalls++),
    render: "sync",
    subscriptions: () =>
      interval("tick", 1, () => ({
        kind: "bump",
      })),
  };
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(
    subApp,
    fakeInterval.env,
    fakeFrame.frameEnv,
  )(root);
  fakeInterval.tickAll();
  fakeInterval.tickAll();
  return all([
    check(viewCalls, toBe(3)), // mount + 2 dispatches, every one painted
    check(root.textContent, toBe("2")),
    check(fakeFrame.scheduleCalls(), toBe(0)),
  ]);
});

test("cleanup cancels a pending frame-batched paint before it fires", () => {
  const fakeFrame = makeFakeFrame();
  let viewCalls = 0;
  const program = makeBumpApp(() => viewCalls++);
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(
    program,
    undefined,
    fakeFrame.frameEnv,
  )(root);
  // drive one dispatch through onUrlChange (a popstate round-trip)
  window.history.pushState(null, "", "/x");
  window.dispatchEvent(new Event("popstate"));
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

// --- benchmark: issue #157's own reproduction ------------------------------
//
// "3 columns of 2000 rows, 5 fetches resolved one at a time (not
// Promise.all'd), each replacing one column" — before this change, every
// dispatch ran its own synchronous `view()` + diff over ALL 3 columns, AND
// `collectCssRules` re-walked all 3 for their `css()` atoms on every paint
// regardless. With frame-batched dispatch + `lazy(column, rows)`, the 5
// dispatches collapse into ONE paint, and only the columns a dispatch
// actually replaced get resolved at all — once each (not once per
// redispatch), and never for the column nothing ever touched. `columnBuilds`
// counts calls to the producer from EITHER the DOM path or the CSS-collection
// path, so `buildsAfterMount / 3` is however many of those paths exist in a
// given build — the assertions below are expressed relative to that, so they
// hold regardless of that count.
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
  const parseCol = (
    raw: string | null,
  ): ColKey =>
    raw === "a" || raw === "b" ? raw : "c";
  type Cols = Readonly<{
    a: ReadonlyArray<string>;
    b: ReadonlyArray<string>;
    c: ReadonlyArray<string>;
  }>;
  type ColModel = Readonly<{ columns: Cols }>;
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
  const program: Application<
    ColModel,
    ColMsg
  > = {
    init: () => [
      {
        columns: {
          a: rowsOf("a0"),
          b: rowsOf("b0"),
          c: rowsOf("c0"),
        },
      },
      cmdNone(),
    ],
    update: (msg, model) => [
      {
        columns: {
          ...model.columns,
          // a fresh fetch: a NEW array reference every time, even when
          // re-fetching the same column — exactly what `lazy`'s `===` check
          // is built to notice.
          [msg.col]: rowsOf(msg.col),
        },
      },
      cmdNone(),
    ],
    view: (model) =>
      div([], [
        lazy(column, model.columns.a),
        lazy(column, model.columns.b),
        lazy(column, model.columns.c),
      ]),
    onUrlChange: (url) => ({
      col: parseCol(
        new URLSearchParams(url.search).get(
          "col",
        ),
      ),
    }),
  };
  const root = document.createElement("div");
  document.body.appendChild(root);
  stop = application(
    program,
    undefined,
    fakeFrame.frameEnv,
  )(root);
  const buildsAfterMount = columnBuilds; // first paint builds all 3, once each
  // 5 fetches resolving out of order; column "c" is never touched.
  const order: ReadonlyArray<ColKey> = [
    "a",
    "b",
    "a",
    "b",
    "a",
  ];
  order.forEach((col) => {
    window.history.pushState(
      null,
      "",
      `/?col=${col}`,
    );
    window.dispatchEvent(new Event("popstate"));
  });
  const buildsBeforeFlush = columnBuilds;
  const COLUMN_COUNT = 3;
  const CHANGED_COLUMNS = 2; // "a" and "b"; "c" is never touched
  const perColumnCost =
    buildsAfterMount / COLUMN_COUNT;
  const unbatchedNoLazy =
    order.length * COLUMN_COUNT * perColumnCost; // what the pre-#157 runtime paid
  const t0 = performance.now();
  fakeFrame.flush();
  const flushMs = performance.now() - t0;
  const totalBuilds = columnBuilds;
  console.log(
    `[bench #157] ${COLUMN_COUNT} columns × ${ROWS} rows, ${order.length} ` +
      `out-of-order dispatches: ${totalBuilds} column rebuild(s) ` +
      `(${buildsAfterMount} mount + ${totalBuilds - buildsAfterMount} at the ` +
      `single flush) vs ${unbatchedNoLazy} unbatched/no-lazy; one ` +
      `batched flush took ${flushMs.toFixed(3)}ms`,
  );
  return all([
    // nothing rebuilds before the frame flushes — the whole point of batching
    check(buildsBeforeFlush, toBe(buildsAfterMount)),
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
});
