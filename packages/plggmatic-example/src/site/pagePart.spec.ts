import {
  all,
  check,
  test,
  toBe,
  toContain,
} from "plgg-test";
import { renderToString } from "plgg-view";
import { msg } from "../catalog/model.ts";
import { pagesFor } from "../catalog/pages.ts";
import { update } from "../catalog/app.ts";
import {
  addressOf,
  firstModel,
  pageHtml,
  pageWidget,
} from "./pagePart.ts";

test("the editions share routes, and page links stay in the edition of the island", () =>
  all([
    check(
      pagesFor("ja")
        .map((p) => p.id)
        .join(),
      toBe(
        pagesFor("en")
          .map((p) => p.id)
          .join(),
      ),
    ),
    check(
      addressOf("overview", "en"),
      toBe("/en/"),
    ),
    check(
      renderToString(pageWidget("ja/overview")),
      toContain('href="/start/"'),
    ),
    check(
      renderToString(pageWidget("en/overview")),
      toContain('href="/en/start/"'),
    ),
    check(
      renderToString(pageWidget("en/tpl-forms")),
      toContain('src="/forms.html"'),
    ),
  ]));

test("operating an English sample keeps its language and shows its confirmation", () => {
  const initial = firstModel("en");
  const opened = update(
    msg.openDialog(),
    initial,
  )[0];
  const confirmed = update(
    msg.confirmDialog(),
    opened,
  )[0];
  return all([
    check(
      renderToString(pageHtml(opened, "menu")),
      toContain("Delete this record?"),
    ),
    check(
      renderToString(pageHtml(confirmed, "menu")),
      toContain("Deletion confirmed."),
    ),
    check(
      renderToString(
        pageHtml(
          update(msg.press(), initial)[0],
          "buttons",
        ),
      ),
      toContain("Presses: 1"),
    ),
  ]);
});
