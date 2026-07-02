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
  renderToString,
} from "plgg-view";
import { callout } from "plggpress/theme/callout";

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
      renderToString(callout("info", body)),
      toContain(">Info<"),
    ),
    check(
      renderToString(callout("note", body)),
      toContain(">Note<"),
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

test("tags each kind with its own vp-callout class (accent owned by baseCss)", () =>
  all([
    check(
      renderToString(callout("info", body)),
      toContain(
        'class="vp-callout vp-callout-info"',
      ),
    ),
    check(
      renderToString(callout("note", body)),
      toContain(
        'class="vp-callout vp-callout-note"',
      ),
    ),
    check(
      renderToString(callout("tip", body)),
      toContain(
        'class="vp-callout vp-callout-tip"',
      ),
    ),
    check(
      renderToString(callout("warning", body)),
      toContain(
        'class="vp-callout vp-callout-warning"',
      ),
    ),
    check(
      renderToString(callout("danger", body)),
      toContain(
        'class="vp-callout vp-callout-danger"',
      ),
    ),
  ]));
