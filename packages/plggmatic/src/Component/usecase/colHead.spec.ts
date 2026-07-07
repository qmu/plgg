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
  colHead({
    title: "Sections",
    close: none(),
    links: [],
  }),
);
const pushed = renderToString(
  colHead({
    title: "Notes",
    close: some("/app?c=sections"),
    links: [],
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
        links: [],
      }),
    ),
    toBe(pushed),
  ));

test("colHead can carry bounded action links", () => {
  const html = renderToString(
    colHead({
      title: "Clients",
      close: none(),
      links: [
        {
          label: "Add client",
          href: "/app?c=clients&add=client",
        },
      ],
    }),
  );
  return all([
    check(
      html.includes("pm-colhead-link"),
      toBe(true),
    ),
    check(
      html.includes(">Add client<"),
      toBe(true),
    ),
  ]);
});
