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
import {
  type ScheduledModel,
  type SchedulerMsg,
  openMenu,
  select,
  queryInput,
} from "plggmatic";
import { app, scheduled } from "./bizMenuDemo.ts";

const [m0] = app.init(makeUrl("/", ""));

const drive = (
  ...msgs: ReadonlyArray<SchedulerMsg>
): ScheduledModel =>
  msgs.reduce(
    (m: ScheduledModel, msg: SchedulerMsg) =>
      app.update(msg, m)[0],
    m0,
  );

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
    check(html.includes("DevDesk"), toBe(true)),
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

test("the Projects filter narrows the list and reflects to ?q=", () => {
  const m = drive(
    openMenu("projects"),
    queryInput("beacon"),
  );
  const html = renderToString(app.view(m));
  return all([
    check(
      scheduled.toUrl(m).search,
      toBe("?c=projects&q=beacon"),
    ),
    check(
      html.includes("Beacon bank API"),
      toBe(true),
    ),
    check(
      html.includes("ACME storefront rebuild"),
      toBe(false),
    ),
  ]);
});

test("selecting a project shows its detail record", () => {
  const m = drive(
    openMenu("projects"),
    select(0, "acme"),
  );
  const html = renderToString(app.view(m));
  return all([
    check(
      scheduled.toUrl(m).search,
      toBe("?c=projects&p=acme"),
    ),
    check(
      html.includes("ACME Retail K.K."),
      toBe(true),
    ),
    check(html.includes("¥8.4M"), toBe(true)),
    check(
      html.includes("Fixed-price"),
      toBe(true),
    ),
  ]);
});

test("a deep link reproduces a project's detail", () => {
  const [m] = app.init(
    makeUrl("/", "?c=projects&p=beacon"),
  );
  const html = renderToString(app.view(m));
  return all([
    check(getOr("")(m.root), toBe("projects")),
    check(
      html.includes("Beacon Financial"),
      toBe(true),
    ),
  ]);
});

test("the Clients filter narrows the list and reflects to ?q=", () => {
  const m = drive(
    openMenu("clients"),
    queryInput("beacon"),
  );
  const html = renderToString(app.view(m));
  return all([
    check(
      scheduled.toUrl(m).search,
      toBe("?c=clients&q=beacon"),
    ),
    check(
      html.includes("Beacon Financial"),
      toBe(true),
    ),
    check(
      html.includes("ACME Retail K.K."),
      toBe(false),
    ),
  ]);
});

test("selecting a client shows its detail record", () => {
  const m = drive(
    openMenu("clients"),
    select(0, "acme"),
  );
  const html = renderToString(app.view(m));
  return all([
    check(
      scheduled.toUrl(m).search,
      toBe("?c=clients&p=acme"),
    ),
    check(
      html.includes("ACME Retail K.K."),
      toBe(true),
    ),
    check(html.includes("Prime"), toBe(true)),
    check(
      html.includes("Sato, IT Dept."),
      toBe(true),
    ),
  ]);
});

test("a deep link reproduces a client's detail", () => {
  const [m] = app.init(
    makeUrl("/", "?c=clients&p=foxtrot"),
  );
  const html = renderToString(app.view(m));
  return all([
    check(getOr("")(m.root), toBe("clients")),
    check(
      html.includes("Foxtrot Mfg."),
      toBe(true),
    ),
    check(
      html.includes("Kanda, Plant IT"),
      toBe(true),
    ),
  ]);
});
