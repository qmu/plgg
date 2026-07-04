import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  renderToString,
  collectCss,
} from "plgg-view";
import { themeToggle } from "plggmatic/Component/usecase/themeToggle";

const light = themeToggle({
  scheme: "light",
  toggle: "toggle",
});
const dark = themeToggle({
  scheme: "dark",
  toggle: "toggle",
});

test("themeToggle is a labelled <button>", () =>
  all([
    check(
      renderToString(light).startsWith("<button"),
      toBe(true),
    ),
    check(
      renderToString(light).includes(
        'aria-label="Switch to dark mode"',
      ),
      toBe(true),
    ),
    check(
      renderToString(dark).includes(
        'aria-label="Switch to light mode"',
      ),
      toBe(true),
    ),
  ]));

test("shows the current scheme's icon (shape, not color)", () =>
  all([
    // light shows the sun (8-ray path), dark the crescent
    check(
      renderToString(light).includes(
        "M12 18a6 6",
      ),
      toBe(true),
    ),
    check(
      renderToString(light).includes(
        "M9.822 2.238",
      ),
      toBe(false),
    ),
    check(
      renderToString(dark).includes(
        "M9.822 2.238",
      ),
      toBe(true),
    ),
  ]));

test("themeToggle carries the shared focus ring", () =>
  check(
    collectCss(light).includes(
      ":focus-visible{outline:2px solid var(--pm-primary-base)",
    ),
    toBe(true),
  ));

test("themeToggle is pure", () =>
  check(
    renderToString(
      themeToggle({
        scheme: "light",
        toggle: "toggle",
      }),
    ),
    toBe(renderToString(light)),
  ));
