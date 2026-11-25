import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { renderToString } from "plgg-view";
import { makeUrl } from "plgg-view/client";
import { stripVar } from "plggmatic";
import {
  init,
  update,
  view,
  trailOfUrl,
} from "./workspaceDemo.ts";

const at = (search: string) =>
  init(makeUrl("/demo4.html", search))[0];

test("a URL's trail is folded to what the columns still offer", () =>
  all([
    check(
      trailOfUrl(
        makeUrl(
          "/",
          "?x=Lclients.Sacme.Rprojects.Sstorefront.Saoki",
        ),
      ).join("."),
      toBe(
        "Lclients.Sacme.Rprojects.Sstorefront.Saoki",
      ),
    ),
    // Sportal is a real record, but the client list does
    // not offer it
    check(
      trailOfUrl(
        makeUrl("/", "?x=Lclients.Sportal.Sacme"),
      ).join("."),
      toBe("Lclients"),
    ),
    check(
      trailOfUrl(makeUrl("/", "")).length,
      toBe(0),
    ),
  ]));

test("a row's link folds to its own column before stepping; a heading links back to its column", () => {
  const html = renderToString(
    view(at("?x=Lclients.Sacme.Rprojects")),
  );
  return all([
    // from the client list (one step in), choosing the
    // other client replaces everything to its right
    check(
      html,
      toContain(
        'href="/demo4.html?x=Lclients.Sbeacon"',
      ),
    ),
    // the client list's heading folds the strip to it
    check(
      html,
      toContain('href="/demo4.html?x=Lclients"'),
    ),
    check(
      html.split('aria-current="true"').length,
      toBe(3),
    ),
  ]);
});

test("the panel gives up width as the strip scrolls; the rail narrows the menu", () => {
  const wide = update(
    { kind: "Resized", width: 1280 },
    at("?x=Lclients"),
  )[0];
  const scrolled = update(
    { kind: "Scrolled", left: 500 },
    wide,
  )[0];
  const railed = update(
    { kind: "ToggleRail" },
    wide,
  )[0];
  return all([
    check(
      renderToString(view(wide)),
      toContain(stripVar.width + ":1060px"),
    ),
    check(
      renderToString(view(scrolled)),
      toContain(stripVar.width + ":560px"),
    ),
    check(
      renderToString(view(railed)),
      toContain(stripVar.menu + ":64px"),
    ),
  ]);
});
