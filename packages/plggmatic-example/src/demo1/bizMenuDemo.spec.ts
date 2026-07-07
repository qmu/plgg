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
import { getOr, match } from "plgg";
import { renderToString } from "plgg-view";
import {
  type Cmd,
  cmdNone$,
  cmdBatch$,
  cmdEffect$,
  makeUrl,
} from "plgg-view/client";
import {
  type SchedulerMsg,
  openMenu,
  select,
  queryInput,
} from "plggmatic";
import {
  app,
  makeApp,
  scheduled,
  type Model,
  type Msg,
} from "./bizMenuDemo.ts";

const [m0] = app.init(makeUrl("/", ""));

const cmdTag = (cmd: Cmd<Msg>): string =>
  match(cmd)(
    [cmdNone$(), (): string => "none"],
    [cmdBatch$(), (): string => "batch"],
    [cmdEffect$(), (): string => "effect"],
  );

const schedulerMsg = (
  msg: SchedulerMsg,
): Msg => ({
  kind: "scheduler",
  msg,
});

const drive = (
  ...msgs: ReadonlyArray<SchedulerMsg>
): Model =>
  msgs.reduce(
    (m: Model, msg: SchedulerMsg) =>
      app.update(schedulerMsg(msg), m)[0],
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
    schedulerMsg(openMenu("projects")),
    m0,
  )[0];
  return all([
    check(
      scheduled.toUrl(m.scheduled).search,
      toBe("?c=projects"),
    ),
    check(
      getOr("")(m.scheduled.root),
      toBe("projects"),
    ),
  ]);
});

test("a deep link opens a section directly", () => {
  const [m] = app.init(
    makeUrl("/", "?c=invoices"),
  );
  return check(
    getOr("")(m.scheduled.root),
    toBe("invoices"),
  );
});

test("makeApp seeds the initial scheme", () => {
  const [m] = makeApp("dark").init(
    makeUrl("/", ""),
  );
  return check(m.scheme, toBe("dark"));
});

test("toggling the scheme flips light and dark", () => {
  const darkApp = makeApp("dark");
  const [darkModel] = darkApp.init(
    makeUrl("/", ""),
  );
  const [lightToDark, darkCmd] = app.update(
    { kind: "toggleScheme" },
    m0,
  );
  const [darkToLight, lightCmd] =
    darkApp.update(
      { kind: "toggleScheme" },
      darkModel,
    );
  return all([
    check(lightToDark.scheme, toBe("dark")),
    check(cmdTag(darkCmd), toBe("effect")),
    check(darkToLight.scheme, toBe("light")),
    check(cmdTag(lightCmd), toBe("effect")),
  ]);
});

test("schemeApplied acknowledges without changing the model", () => {
  const [next, cmd] = app.update(
    { kind: "schemeApplied" },
    m0,
  );
  return all([
    check(next, toBe(m0)),
    check(cmdTag(cmd), toBe("none")),
  ]);
});

test("the section's placeholder rows render on drill", () => {
  const html = renderToString(
    app.view(
      app.update(
        schedulerMsg(openMenu("members")),
        m0,
      )[0],
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
      scheduled.toUrl(m.scheduled).search,
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
      scheduled.toUrl(m.scheduled).search,
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
    check(
      getOr("")(m.scheduled.root),
      toBe("projects"),
    ),
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
      scheduled.toUrl(m.scheduled).search,
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
      scheduled.toUrl(m.scheduled).search,
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
    check(
      getOr("")(m.scheduled.root),
      toBe("clients"),
    ),
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

test("the Clients column opens an app-owned add form", () => {
  const opened = drive(openMenu("clients"));
  const before = renderToString(app.view(opened));
  const [formModel] = app.init(
    makeUrl("/", "?c=clients&add=client"),
  );
  const formHtml = renderToString(
    app.view(formModel),
  );
  return all([
    check(
      before.includes(
        'href="/?c=clients&amp;add=client"',
      ),
      toBe(true),
    ),
    check(
      before.includes("pm-colhead-link"),
      toBe(true),
    ),
    check(
      formModel.clientForm.open,
      toBe(true),
    ),
    check(
      formHtml.includes("<form"),
      toBe(true),
    ),
    check(
      formHtml.includes(">Register client<"),
      toBe(true),
    ),
    check(
      formHtml.includes(">Name<"),
      toBe(true),
    ),
    check(
      formHtml.includes(">Status<"),
      toBe(true),
    ),
  ]);
});

test("the add client form validates required fields", () => {
  const [formModel] = app.init(
    makeUrl("/", "?c=clients&add=client"),
  );
  const invalid = app.update(
    { kind: "clientFormSubmit" },
    formModel,
  )[0];
  const html = renderToString(app.view(invalid));
  return all([
    check(
      invalid.clientForm.open,
      toBe(true),
    ),
    check(html.includes("Required"), toBe(true)),
    check(
      html.includes("Orbit Systems"),
      toBe(false),
    ),
  ]);
});

test("a valid add client form creates a client and lands on its detail", () => {
  const [formModel] = app.init(
    makeUrl("/", "?c=clients&add=client"),
  );
  const filled = [
    {
      kind: "clientNameInput",
      value: "Orbit Systems",
    } satisfies Msg,
    {
      kind: "clientStatusInput",
      value: "Active",
    } satisfies Msg,
    {
      kind: "clientSinceInput",
      value: "2026",
    } satisfies Msg,
    {
      kind: "clientContactInput",
      value: "Mina, Ops",
    } satisfies Msg,
    {
      kind: "clientNotesInput",
      value: "New implementation partner.",
    } satisfies Msg,
  ].reduce(
    (m: Model, msg: Msg) =>
      app.update(msg, m)[0],
    formModel,
  );
  const created = app.update(
    { kind: "clientFormSubmit" },
    filled,
  )[0];
  const html = renderToString(app.view(created));
  return all([
    check(
      created.clientForm.open,
      toBe(false),
    ),
    check(
      scheduled.toUrl(created.scheduled).search,
      toBe("?c=clients&p=orbit-systems-1"),
    ),
    check(
      html.includes("Orbit Systems"),
      toBe(true),
    ),
    check(html.includes("Mina, Ops"), toBe(true)),
    check(
      html.includes("New implementation partner."),
      toBe(true),
    ),
  ]);
});
