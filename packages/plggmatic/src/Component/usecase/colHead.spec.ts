import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { some, none } from "plgg";
import { renderToString } from "plgg-view";
import { colHead } from "plggmatic/Component/usecase/colHead";

const root = renderToString(
  colHead({ title: "Sections", close: none() }),
);
const pushed = renderToString(
  colHead({
    title: "Notes",
    close: some("/app?c=sections"),
  }),
);

test("a root colHead shows the title and no close link", () =>
  all([
    check(
      root.includes("pm-colhead-title"),
      toBe(true),
    ),
    check(root.includes(">Sections<"), toBe(true)),
    check(root.includes("<a"), toBe(false)),
  ]));

test("a pushed colHead links to the truncating URL, aria-labelled", () =>
  all([
    check(
      pushed.includes('href="/app?c=sections"'),
      toBe(true),
    ),
    check(
      pushed.includes('aria-label="Close Notes"'),
      toBe(true),
    ),
    check(pushed.includes(">×<"), toBe(true)),
  ]));

test("colHead is pure", () =>
  check(
    renderToString(
      colHead({
        title: "Notes",
        close: some("/app?c=sections"),
      }),
    ),
    toBe(pushed),
  ));
