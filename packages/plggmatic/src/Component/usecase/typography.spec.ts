import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  renderToString,
  collectCss,
  text,
  p as para,
} from "plgg-view";
import {
  heading,
  prose,
} from "plggmatic/Component/usecase/typography";

test("heading level maps to the real hN element", () =>
  all([
    check(
      renderToString(
        heading(1, "Title"),
      ).startsWith("<h1"),
      toBe(true),
    ),
    check(
      renderToString(
        heading(2, "Title"),
      ).startsWith("<h2"),
      toBe(true),
    ),
    check(
      renderToString(
        heading(3, "Title"),
      ).startsWith("<h3"),
      toBe(true),
    ),
    check(
      renderToString(
        heading(4, "Title"),
      ).startsWith("<h4"),
      toBe(true),
    ),
  ]));

test("heading size follows the font-size token scale", () =>
  all([
    check(
      collectCss(heading(1, "T")).includes(
        "font-size:1.5rem",
      ),
      toBe(true),
    ),
    check(
      collectCss(heading(4, "T")).includes(
        "font-size:1rem",
      ),
      toBe(true),
    ),
  ]));

test("prose is a container capping the reading measure", () =>
  all([
    check(
      renderToString(
        prose([para([], [text("body")])]),
      ).startsWith("<div"),
      toBe(true),
    ),
    check(
      collectCss(
        prose([para([], [text("body")])]),
      ).includes("max-width:48rem"),
      toBe(true),
    ),
  ]));

test("typography is pure", () =>
  all([
    check(
      renderToString(heading(2, "Title")),
      toBe(renderToString(heading(2, "Title"))),
    ),
    check(
      renderToString(prose([text("x")])),
      toBe(renderToString(prose([text("x")]))),
    ),
  ]));
