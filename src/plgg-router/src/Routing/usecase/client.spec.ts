// @vitest-environment happy-dom
//
// happy-dom's `window.history.pushState`/`replaceState` mutate `window.location`
// correctly but do NOT perform a real navigation. These specs therefore verify
// state changes (location, listener invocations, `event.defaultPrevented`), not
// visible page changes — which is exactly what the router's contract promises.
import {
  test,
  expect,
  beforeEach,
} from "vitest";
import { pipe, box } from "plgg";
import { VNode } from "plgg-view";
import {
  router,
  get,
} from "plgg-router/Routing/model/Router";
import {
  start,
  push,
  replace,
  currentLocation,
} from "plgg-router/Routing/usecase/client";

// happy-dom would otherwise synchronously navigate (set `window.location`) when
// an un-prevented click lands on a same-origin `<a href>` — which pollutes
// location across tests and muddies `event.defaultPrevented`. Disabling both
// main-frame navigation and the setURL fallback freezes location so each test
// observes only the History-API changes the router itself drives, and
// `defaultPrevented` reflects only the router's own decision. (Typed
// augmentation of `Window`, not a cast.)
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
  window.happyDOM.settings.navigation.disableMainFrameNavigation =
    true;
  window.happyDOM.settings.navigation.disableFallbackToSetURL =
    true;
}

const view = (t: string): VNode =>
  box("Text")({ value: t });

const textOf = (node: VNode): string =>
  node.__tag === "Text" ? node.content.value : node.__tag;

const app = pipe(
  router(),
  get("/", () => view("home")),
  get("/users/:id", () => view("user")),
);

/** A render spy: records the text of each VNode it is asked to render. */
const makeSpy = (): {
  calls: string[];
  render: (vnode: VNode, container: Element) => void;
} => {
  const calls: string[] = [];
  return {
    calls,
    render: (vnode) => {
      calls.push(textOf(vnode));
    },
  };
};

const anchor = (
  attrs: Record<string, string>,
): HTMLAnchorElement => {
  const a = document.createElement("a");
  Object.entries(attrs).forEach(([k, v]) =>
    a.setAttribute(k, v),
  );
  a.textContent = "link";
  document.body.appendChild(a);
  return a;
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

test("start renders the current route immediately", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  expect(spy.calls).toEqual(["home"]);
  stop();
});

test("currentLocation reads pathname and query, with empty params", () => {
  window.history.replaceState(
    null,
    "",
    "/users/5?q=hi",
  );
  const loc = currentLocation();
  expect(loc.path).toBe("/users/5");
  expect(loc.query).toEqual({ q: "hi" });
  expect(loc.params).toEqual({});
});

test("renders an explicit notFound view when no route matches", () => {
  window.history.replaceState(null, "", "/missing");
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
    notFound: view("404"),
  });
  expect(spy.calls).toEqual(["404"]);
  stop();
});

test("falls back to a default Not Found view", () => {
  window.history.replaceState(null, "", "/missing");
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  expect(spy.calls).toEqual(["Not Found"]);
  stop();
});

test("push navigates and re-renders", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  push("/users/7");
  expect(window.location.pathname).toBe("/users/7");
  expect(spy.calls).toEqual(["home", "user"]);
  stop();
});

test("replace navigates without adding a history entry", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  const before = window.history.length;
  replace("/users/9");
  expect(window.location.pathname).toBe("/users/9");
  expect(spy.calls).toEqual(["home", "user"]);
  expect(window.history.length).toBe(before);
  stop();
});

test("push is a no-op for a non-http(s) scheme", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  push("mailto:a@b.c");
  expect(window.location.pathname).toBe("/");
  expect(spy.calls).toEqual(["home"]);
  stop();
});

test("push is a no-op for a malformed URL", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  push("http://");
  expect(spy.calls).toEqual(["home"]);
  stop();
});

test("popstate re-renders the current location", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  window.history.replaceState(null, "", "/users/3");
  window.dispatchEvent(new Event("popstate"));
  expect(spy.calls).toEqual(["home", "user"]);
  stop();
});

test("intercepts an in-app anchor click and navigates", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  const evt = click(anchor({ href: "/users/1" }));
  expect(evt.defaultPrevented).toBe(true);
  expect(window.location.pathname).toBe("/users/1");
  expect(spy.calls).toEqual(["home", "user"]);
  stop();
});

test("walks up from a nested target to the enclosing anchor", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  const a = anchor({ href: "/users/2" });
  const span = document.createElement("span");
  a.appendChild(span);
  const evt = click(span);
  expect(evt.defaultPrevented).toBe(true);
  expect(window.location.pathname).toBe("/users/2");
  stop();
});

const eventCases: ReadonlyArray<
  [string, MouseEventInit]
> = [
  ["a meta-click", { metaKey: true }],
  ["a ctrl-click", { ctrlKey: true }],
  ["a shift-click", { shiftKey: true }],
  ["an alt-click", { altKey: true }],
  ["a non-left-button click", { button: 1 }],
];
eventCases.forEach(([name, init]) => {
  test(`preserves the browser default for ${name}`, () => {
    const spy = makeSpy();
    const stop = start(app, document.body, {
      render: spy.render,
    });
    const evt = click(anchor({ href: "/users/1" }), init);
    expect(evt.defaultPrevented).toBe(false);
    expect(spy.calls).toEqual(["home"]);
    stop();
  });
});

const anchorCases: ReadonlyArray<
  [string, Record<string, string>]
> = [
  [
    "target",
    { href: "/users/1", target: "_blank" },
  ],
  ["download", { href: "/users/1", download: "" }],
  ["rel=external", { href: "/users/1", rel: "external" }],
  ["a non-http(s) scheme", { href: "mailto:a@b.c" }],
  [
    "a cross-origin link",
    { href: "https://other.example.com/x" },
  ],
  ["no href", {}],
];
anchorCases.forEach(([name, attrs]) => {
  test(`preserves the browser default for an anchor with ${name}`, () => {
    const spy = makeSpy();
    const stop = start(app, document.body, {
      render: spy.render,
    });
    const evt = click(anchor(attrs));
    expect(evt.defaultPrevented).toBe(false);
    expect(spy.calls).toEqual(["home"]);
    stop();
  });
});

test("ignores a click that is not inside an anchor", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  const div = document.createElement("div");
  document.body.appendChild(div);
  const evt = click(div);
  expect(evt.defaultPrevented).toBe(false);
  expect(spy.calls).toEqual(["home"]);
  stop();
});

test("ignores a click whose target is not an element", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  const evt = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(evt);
  expect(evt.defaultPrevented).toBe(false);
  expect(spy.calls).toEqual(["home"]);
  stop();
});

test("does not double-handle an already-prevented click", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  const evt = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  evt.preventDefault();
  anchor({ href: "/users/1" }).dispatchEvent(evt);
  expect(window.location.pathname).toBe("/");
  expect(spy.calls).toEqual(["home"]);
  stop();
});

test("the cleanup function removes every listener", () => {
  const spy = makeSpy();
  const stop = start(app, document.body, {
    render: spy.render,
  });
  stop();
  push("/users/1");
  window.dispatchEvent(new Event("popstate"));
  const evt = click(anchor({ href: "/users/2" }));
  expect(evt.defaultPrevented).toBe(false);
  expect(spy.calls).toEqual(["home"]);
});
