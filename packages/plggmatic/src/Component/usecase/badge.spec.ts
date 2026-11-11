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
import {
  badge,
  badgeTones,
} from "plggmatic/Component/usecase/badge";

test("badge renders its label in a span", () =>
  all([
    check(
      renderToString(
        badge({ label: "AI", tone: "neutral" }),
      ).startsWith("<span"),
      toBe(true),
    ),
    check(
      renderToString(
        badge({ label: "AI", tone: "neutral" }),
      ).includes(">AI<"),
      toBe(true),
    ),
  ]));

test("each tone uses its own color tokens", () =>
  all([
    check(
      collectCss(
        badge({ label: "AI", tone: "emphasis" }),
      ).includes("--pm-primary-surface"),
      toBe(true),
    ),
    check(
      collectCss(
        badge({ label: "AI", tone: "neutral" }),
      ).includes("--pm-surface-2"),
      toBe(true),
    ),
    check(
      collectCss(
        badge({ label: "AI", tone: "danger" }),
      ).includes("--pm-danger-text"),
      toBe(true),
    ),
  ]));

test("every tone renders a hairline border", () =>
  check(
    badgeTones.every((tone) =>
      collectCss(
        badge({ label: "AI", tone }),
      ).includes("border-style:solid"),
    ),
    toBe(true),
  ));

test("badge is pure", () =>
  check(
    renderToString(
      badge({ label: "AI", tone: "info" }),
    ),
    toBe(
      renderToString(
        badge({ label: "AI", tone: "info" }),
      ),
    ),
  ));
