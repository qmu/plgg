import {
  test,
  check,
  all,
  toContain,
} from "plgg-test";
import {
  type Html,
  div,
  text,
  collectCss,
  renderToString,
} from "plgg-view";
import { callout } from "plgg-press/theme/callout";

// An opaque pre-rendered body, as plgg-md would hand it.
const body: Html<never> = div(
  [],
  [text("admonition body")],
);

test("embeds the pre-rendered body and a kind label", () =>
  all([
    check(
      renderToString(callout("tip", body)),
      toContain("admonition body"),
    ),
    check(
      renderToString(callout("tip", body)),
      toContain(">Tip<"),
    ),
    check(
      renderToString(callout("warning", body)),
      toContain(">Warning<"),
    ),
    check(
      renderToString(callout("danger", body)),
      toContain(">Danger<"),
    ),
  ]));

test("styles each kind with its own accent token", () =>
  all([
    // tip → primary pine accent
    check(
      collectCss(callout("tip", body)),
      toContain("#1f6b54"),
    ),
    // warning → muted accent
    check(
      collectCss(callout("warning", body)),
      toContain("#8a8073"),
    ),
    // danger → brick accent
    check(
      collectCss(callout("danger", body)),
      toContain("#b23a2a"),
    ),
  ]));
