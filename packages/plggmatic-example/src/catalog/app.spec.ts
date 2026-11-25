import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
} from "plgg-test";
import { renderToString } from "plgg-view";
import { makeUrl } from "plgg-view/client";
import {
  openedAttr,
  columnAttr,
  shellMinAttr,
  spanTwoClass,
} from "plggmatic";
import {
  init,
  update,
  view,
  settle,
} from "./app.ts";
import { hrefOf } from "./address.ts";
import { pages } from "./pages.ts";
import { msg } from "./model.ts";

const at = (search: string) =>
  init(makeUrl("/index.html", search))[0];
const html = (search: string) =>
  renderToString(view(at(search)));

test("an address is held to pages that exist: an unknown first page is home, the rest stop at the first unknown", () =>
  all([
    check(
      JSON.stringify(
        settle(makeUrl("/", "?p=nope&c=colors")),
      ),
      toBe(
        JSON.stringify({
          head: "overview",
          rest: ["colors"],
        }),
      ),
    ),
    check(
      settle(
        makeUrl(
          "/",
          "?p=buttons&c=dialog,nope,toasts",
        ),
      ).rest.join(),
      toBe("dialog"),
    ),
    check(
      hrefOf("/index.html", "overview", []),
      toBe("/index.html"),
    ),
    check(
      hrefOf("/index.html", "buttons", [
        "dialog",
        "toasts",
      ]),
      toBe(
        "/index.html?p=buttons&c=dialog,toasts",
      ),
    ),
  ]));

test("every page renders in the standard screen, and every link in it leads to a page that exists", () => {
  const ids = new Set(pages.map((p) => p.id));
  const all_ = pages.map((p) =>
    html("?p=" + p.id),
  );
  const targets = all_.flatMap((h) =>
    [
      ...h.matchAll(
        /href="\/index\.html\?p=([^"&]*)(?:&amp;c=([^"]*))?"/g,
      ),
    ].flatMap((m) => [
      m[1] ?? "",
      ...(m[2] ?? "")
        .split(",")
        .filter((id) => id !== ""),
    ]),
  );
  return all([
    check(
      all_.every((h) =>
        h.includes(columnAttr + '="'),
      ),
      toBe(true),
    ),
    check(targets.length > 40, toBe(true)),
    check(
      targets.filter((id) => !ids.has(id)).join(),
      toBe(""),
    ),
  ]);
});

test("a link opens its target to the right of its own page, replacing what stood there; the one that did is marked", () => {
  const h = html("?p=overview&c=buttons,dialog");
  return all([
    // from the first page: whatever is to the right goes
    check(
      h,
      toContain(
        'href="/index.html?p=overview&amp;c=rules"',
      ),
    ),
    // from the second page: the first two stay
    check(
      h,
      toContain(
        'href="/index.html?p=overview&amp;c=buttons,dialog"',
      ),
    ),
    // overview's link to buttons, and buttons' to dialog
    check(
      h.split(openedAttr).length - 1 >= 2,
      toBe(true),
    ),
    // closing the third page leaves the first two
    check(
      h,
      toContain(
        'href="/index.html?p=overview&amp;c=buttons" class=',
      ),
    ),
  ]);
});

test("a page that shows a whole screen takes two columns' worth; folding marks the shell", () => {
  const folded = update(
    msg.toggleFold(),
    at("?p=overview"),
  )[0];
  return all([
    check(
      html("?p=tpl-business"),
      toContain(spanTwoClass),
    ),
    check(
      html("?p=overview"),
      not(toContain(spanTwoClass)),
    ),
    check(
      renderToString(view(folded)),
      toContain(shellMinAttr),
    ),
  ]);
});

test("the examples can be operated: a press counts, a save needs a name, a toast can be dismissed", () => {
  const start = at("?p=fields");
  const refused = update(msg.save(), start)[0];
  const named = update(
    msg.setName("ACME"),
    start,
  )[0];
  const saved = update(msg.save(), named)[0];
  const shownId = saved.shown[0]?.id ?? "";
  return all([
    check(
      update(msg.press(), start)[0].presses,
      toBe(1),
    ),
    check(refused.saved, toBe("")),
    check(
      refused.shown[0]?.tone ?? "",
      toBe("danger"),
    ),
    check(saved.saved, toBe("ACME（fixed）")),
    check(
      update(msg.dismiss(shownId), saved)[0].shown
        .length,
      toBe(0),
    ),
  ]);
});
