// @plgg-test-environment dom
import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  div,
  el,
  text,
  raw,
  lazy,
} from "plgg-view";
import {
  application,
  cmdNone,
  makeRenderer,
} from "plgg-view/client";

// These use only the package exports a registry consumer can import.
test("#157: five dispatches share one frame and preserve an unchanged lazy column", () => {
  let paint: () => void = () => {};
  let views = 0;
  let columns = 0;
  const rows = Array.from(
    { length: 2000 },
    (_, i) => String(i),
  );
  const column = (
    values: ReadonlyArray<string>,
  ) => {
    columns++;
    return div<number>(
      [],
      values.map((value) =>
        div([], [text(value)]),
      ),
    );
  };
  const root = document.createElement("div");
  document.body.appendChild(root);
  const stop = application<number, number>(
    {
      init: () => [0, cmdNone()],
      update: (_, model) => [
        model + 1,
        cmdNone(),
      ],
      view: (model) => {
        views++;
        return div(
          [],
          [
            text(String(model)),
            lazy(column, rows),
            lazy(column, rows),
            lazy(column, rows),
          ],
        );
      },
      onUrlChange: () => 1,
    },
    undefined,
    {
      schedule: (callback) => {
        paint = callback;
        return () => {};
      },
    },
  )(root);
  try {
    const initialViews = views;
    const initialColumns = columns;
    for (let i = 0; i < 5; i++)
      window.dispatchEvent(new Event("popstate"));
    const beforePaint = views;
    paint();
    return all([
      check(beforePaint, toBe(initialViews)),
      check(views, toBe(initialViews + 1)),
      check(columns, toBe(initialColumns)),
      check(
        root.textContent?.startsWith("5"),
        toBe(true),
      ),
    ]);
  } finally {
    stop();
    root.remove();
  }
});

test("#158: SVG primitives have namespaces and identical raw markup keeps its node", () => {
  const root = document.createElement("div");
  const render = makeRenderer<unknown>(
    root,
    () => {},
  );
  const tags = [
    "rect",
    "circle",
    "ellipse",
    "line",
    "polyline",
    "polygon",
    "g",
  ];
  const tree = () =>
    el(
      "div",
      [],
      [
        el(
          "svg",
          [],
          tags.map((tag) => el(tag, [], [])),
        ),
        raw("<b>fixed icon</b>"),
      ],
    );
  render(tree());
  const icon = root.firstChild?.lastChild;
  const svg =
    root.firstElementChild?.firstElementChild;
  const namespaces = tags.map(
    (_, i) => svg?.children.item(i)?.namespaceURI,
  );
  render(tree());
  return all([
    ...namespaces.map((namespace) =>
      check(
        namespace,
        toBe("http://www.w3.org/2000/svg"),
      ),
    ),
    check(root.firstChild?.lastChild, toBe(icon)),
  ]);
});
