// @vitest-environment happy-dom
//
// happy-dom would otherwise synchronously navigate on an un-prevented same-origin
// click; disabling main-frame navigation + the setURL fallback isolates each test
// to the History-API state the runtime drives. (Typed Window augmentation, not a
// cast.) Each mounted app is torn down in afterEach so its document-level click /
// popstate listeners never leak into the next test.
import {
  test,
  expect,
  beforeEach,
  afterEach,
} from "vitest";
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

declare global {
  interface Window {
    happyDOM?: {
      settings: {
        navigation: {
          disableMainFrameNavigation: boolean;
          disableFallbackToSetURL: boolean;
        };
      };
    };
  }
}
if (window.happyDOM) {
  window.happyDOM.settings.navigation.disableMainFrameNavigation = true;
  window.happyDOM.settings.navigation.disableFallbackToSetURL = true;
}

type Model = Url;
type Msg = Readonly<{ url: Url }>;

// A 2-route app: home links to /users/1; the user page links back home.
const app: Application<Model, Msg> = {
  init: (url) => url,
  update: (msg) => msg.url,
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
  expect(root.textContent).toContain("user 1");
});

test("intercepts an in-app link click: pushes, re-renders the new route", () => {
  const root = mount();
  const link = root.querySelector("a");
  const evt = link
    ? click(link)
    : new MouseEvent("click");
  expect(evt.defaultPrevented).toBe(true);
  expect(window.location.pathname).toBe(
    "/users/1",
  );
  expect(root.textContent).toContain("user page");
});

test("popstate re-renders the current route", () => {
  const root = mount();
  window.history.replaceState(
    null,
    "",
    "/users/1",
  );
  window.dispatchEvent(new Event("popstate"));
  expect(root.textContent).toContain("user page");
});

test("preserves the browser default for a modifier-click", () => {
  const root = mount();
  const link = root.querySelector("a");
  const evt = link
    ? click(link, { metaKey: true })
    : new MouseEvent("click");
  expect(evt.defaultPrevented).toBe(false);
  expect(window.location.pathname).toBe("/");
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
  expect(evt.defaultPrevented).toBe(false);
});

test("ignores a click that is not inside an anchor", () => {
  const root = mount();
  const evt = click(root);
  expect(evt.defaultPrevented).toBe(false);
});

test("cleanup removes listeners and empties the container", () => {
  const root = mount();
  stop();
  expect(root.children.length).toBe(0);
  // a popstate after cleanup must not re-render
  window.history.replaceState(
    null,
    "",
    "/users/1",
  );
  window.dispatchEvent(new Event("popstate"));
  expect(root.textContent).toBe("");
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
  init: (url) => ({ n: nOf(url) }),
  update: (msg, model) =>
    msg.kind === "inc"
      ? { n: model.n + 1 }
      : { n: msg.n },
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
  expect(historyCalls).toEqual([
    ["replace", "/?n=1"],
  ]);
  expect(window.location.search).toBe("?n=1");
});

test("historyMode push adds a history entry instead of replacing", () => {
  spyHistory();
  const root = mountApp(countAppWith("push"));
  clickButton(root);
  expect(historyCalls).toEqual([
    ["push", "/?n=1"],
  ]);
});

test("historyMode none skips the URL write but still updates the model", () => {
  spyHistory();
  const root = mountApp(countAppWith("none"));
  clickButton(root);
  expect(historyCalls).toEqual([]);
  expect(root.textContent).toContain("n=1");
});

test("does not write when the reflected URL is unchanged (loop-free)", () => {
  window.history.replaceState(null, "", "/?n=1");
  spyHistory();
  const root = mountApp(baseCountApp);
  // a popstate round-trip to the same URL: onUrlChange → update → toUrl equals
  // the current location → no spurious write
  window.dispatchEvent(new Event("popstate"));
  expect(historyCalls).toEqual([]);
  expect(root.textContent).toContain("n=1");
});

test("an app without toUrl never writes history on dispatch", () => {
  spyHistory();
  const root = mount();
  const link = root.querySelector("a");
  if (link) {
    click(link);
  }
  // the link's own pushState is recorded, but no reflection write follows it
  expect(historyCalls).toEqual([
    ["push", "/users/1"],
  ]);
});
