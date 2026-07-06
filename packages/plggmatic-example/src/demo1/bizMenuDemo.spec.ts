// Demo 1's proof, asserted on the derived program: the
// declared menu renders as a nav landmark with the eight
// business-management sections, and selecting a section
// drives the derived URL codec to ?c=<section>. The
// address-bar reflection is a browser check.
import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { getOr } from "plgg";
import { renderToString } from "plgg-view";
import { makeUrl } from "plgg-view/client";
import { openMenu } from "plggmatic";
import { app, scheduled } from "./bizMenuDemo.ts";

const [m0] = app.init(makeUrl("/", ""));

const LABELS: ReadonlyArray<string> = [
  "Dashboard",
  "Projects",
  "Clients",
  "Estimates & Contracts",
  "Timesheets",
  "Invoices",
  "Members",
  "Reports",
];

test("the root view renders the eight sections as a nav menu", () => {
  const html = renderToString(app.view(m0));
  // renderToString escapes text, so `&` becomes `&amp;`.
  const escaped = (label: string): string =>
    label.split("&").join("&amp;");
  return all([
    check(html.includes("<nav"), toBe(true)),
    check(
      html.includes("Contract Ops"),
      toBe(true),
    ),
    ...LABELS.map((label: string) =>
      check(
        html.includes(escaped(label)),
        toBe(true),
      ),
    ),
  ]);
});

test("selecting a section drives the derived URL to ?c=<section>", () => {
  const m = app.update(
    openMenu("projects"),
    m0,
  )[0];
  return all([
    check(
      scheduled.toUrl(m).search,
      toBe("?c=projects"),
    ),
    check(getOr("")(m.root), toBe("projects")),
  ]);
});

test("a deep link opens a section directly", () => {
  const [m] = app.init(
    makeUrl("/", "?c=invoices"),
  );
  return check(
    getOr("")(m.root),
    toBe("invoices"),
  );
});

test("the section's placeholder rows render on drill", () => {
  const html = renderToString(
    app.view(
      app.update(openMenu("members"), m0)[0],
    ),
  );
  return all([
    check(html.includes("Aoki"), toBe(true)),
    check(html.includes("Béranger"), toBe(true)),
  ]);
});
