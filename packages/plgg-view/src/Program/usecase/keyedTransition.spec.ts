// @plgg-test-environment dom
import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  el,
  text,
  managedHost,
} from "plgg-view/Html/model/element";
import {
  attr,
  key,
} from "plgg-view/Html/model/Attribute";
import { makeRenderer } from "plgg-view/Program/usecase/render";

test("unkeyed paragraphs and text leave when children become all keyed", () => {
  const root = document.createElement("div"),
    render = makeRenderer<never>(root, () => {});
  render(
    el(
      "main",
      [],
      [
        el("p", [], [text("loading")]),
        text("old text"),
      ],
    ),
  );
  const oldNodes = Array.from(
    root.firstChild?.childNodes ?? [],
  );
  render(
    el(
      "main",
      [],
      [el("div", [key("a")], [text("ready")])],
    ),
  );
  return all([
    check(root.textContent, toBe("ready")),
    check(
      root.firstChild?.childNodes.length,
      toBe(1),
    ),
    check(
      oldNodes.every((node) => !node.parentNode),
      toBe(true),
    ),
  ]);
});

test("mixed children retire the unkeyed subtree once and retain a keyed editor", () => {
  const root = document.createElement("div"),
    editor = document.createElement("textarea"),
    lifecycle: string[] = [],
    render = makeRenderer<never>(root, () => {}),
    heading = el<never>(
      "header",
      [],
      [
        text("old heading"),
        managedHost("nested", [], {
          update: () => undefined,
          mount: () => {
            lifecycle.push("nested mount");
            return () => {
              lifecycle.push("nested cleanup");
            };
          },
        }),
      ],
    ),
    survivor = managedHost<never>(
      "editor",
      [attr("data-id", "editor")],
      {
        update: () => undefined,
        mount: (host) => {
          lifecycle.push("editor mount");
          host.appendChild(editor);
          return () => {
            lifecycle.push("editor cleanup");
          };
        },
      },
    );
  document.body.appendChild(root);
  render(el("main", [], [heading, survivor]));
  const oldHeading = root.querySelector("header"),
    oldEditor = root.querySelector(
      '[data-id="editor"]',
    );
  editor.value = "draft";
  editor.focus();
  render(el("main", [], [survivor]));
  const afterTransition = [...lifecycle],
    focused = document.activeElement === editor,
    childCount =
      root.firstChild?.childNodes.length,
    retained =
      root.querySelector('[data-id="editor"]') ===
      oldEditor;
  render(el("main", [], [survivor]));
  render.dispose();
  root.remove();
  return all([
    check(childCount, toBe(1)),
    check(oldHeading?.parentNode, toBe(null)),
    check(retained, toBe(true)),
    check(focused, toBe(true)),
    check(editor.value, toBe("draft")),
    check(
      afterTransition,
      toEqual([
        "nested mount",
        "editor mount",
        "nested cleanup",
      ]),
    ),
    check(
      lifecycle,
      toEqual([
        "nested mount",
        "editor mount",
        "nested cleanup",
        "editor cleanup",
      ]),
    ),
  ]);
});
