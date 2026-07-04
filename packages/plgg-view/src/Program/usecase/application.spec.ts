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
} from "plgg-view/Html/model/element";
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
import { type SubEnv } from "plgg-view/Program/usecase/effects";
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
