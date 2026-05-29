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
  text,
} from "plgg-view/Html/model/element";
import { href } from "plgg-view/Html/model/Attribute";
import {
  application,
  Application,
} from "plgg-view/Program/usecase/application";
import { Url } from "plgg-view/Program/model/Url";

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
          [a([href("/users/1")], [text("user 1")])],
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

afterEach(() => stop());

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
  expect(window.location.pathname).toBe("/users/1");
  expect(root.textContent).toContain("user page");
});

test("popstate re-renders the current route", () => {
  const root = mount();
  window.history.replaceState(null, "", "/users/1");
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
  window.history.replaceState(null, "", "/users/1");
  window.dispatchEvent(new Event("popstate"));
  expect(root.textContent).toBe("");
});
