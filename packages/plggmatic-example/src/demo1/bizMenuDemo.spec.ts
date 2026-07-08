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

const countOf = (
  haystack: string,
  needle: string,
): number => haystack.split(needle).length - 1;

const appSearch = (model: Model): string =>
  app.toUrl === undefined
    ? ""
    : app.toUrl(model).search;

const beaconProjectResultHref =
  'href="/?c=projects&amp;search=1' +
  "&amp;submitted=1&amp;kw=beacon" +
  "&amp;st=In+progress&amp;p=beacon\"";

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

test("opening Projects shows the project submenu", () => {
  const m = drive(openMenu("projects"));
  const html = renderToString(app.view(m));
  return all([
    check(html.includes("Project Menu"), toBe(true)),
    check(
      html.includes(">Add Project<"),
      toBe(true),
    ),
    check(
      html.includes(">Search Project<"),
      toBe(true),
    ),
    check(
      html.includes("bo-hidelist"),
      toBe(true),
    ),
  ]);
});

test("the Projects search form submits to filtered results", () => {
  const [searchModel] = app.init(
    makeUrl("/", "?c=projects&search=1"),
  );
  const filled = [
    {
      kind: "searchKeywordInput",
      value: "beacon",
    } satisfies Msg,
    {
      kind: "searchStatusInput",
      value: "In progress",
    } satisfies Msg,
  ].reduce(
    (m: Model, msg: Msg) =>
      app.update(msg, m)[0],
    searchModel,
  );
  const submitted = app.update(
    { kind: "searchFormSubmit" },
    filled,
  )[0];
  const html = renderToString(app.view(submitted));
  return all([
    check(searchModel.search.open, toBe(true)),
    check(
      searchModel.search.submitted,
      toBe(false),
    ),
    check(
      appSearch(submitted),
      toBe(
        "?c=projects&search=1&submitted=1&kw=beacon&st=In+progress",
      ),
    ),
    check(
      html.includes("Search Condition"),
      toBe(true),
    ),
    check(
      html.includes("bo-search-condition"),
      toBe(true),
    ),
    check(html.includes("Results"), toBe(true)),
    check(
      html.includes("bo-results"),
      toBe(true),
    ),
    check(
      html.includes(
        "In progress · Beacon Financial",
      ),
      toBe(true),
    ),
    check(
      html.includes(beaconProjectResultHref),
      toBe(true),
    ),
    check(
      countOf(html, "Beacon bank API"),
      toBe(2),
    ),
    check(
      countOf(html, "ACME storefront rebuild"),
      toBe(1),
    ),
  ]);
});

test("the Clients search form submits to filtered results", () => {
  const [searchModel] = app.init(
    makeUrl("/", "?c=clients&search=1"),
  );
  const withKeyword = app.update(
    {
      kind: "searchKeywordInput",
      value: "beacon",
    },
    searchModel,
  )[0];
  const submitted = app.update(
    { kind: "searchFormSubmit" },
    withKeyword,
  )[0];
  const html = renderToString(app.view(submitted));
  return all([
    check(searchModel.search.open, toBe(true)),
    check(
      appSearch(submitted),
      toBe(
        "?c=clients&search=1&submitted=1&kw=beacon&st=Any",
      ),
    ),
    check(html.includes("Results"), toBe(true)),
    check(
      html.includes("Active · Ito, Digital"),
      toBe(true),
    ),
    check(
      countOf(html, "Beacon Financial"),
      toBe(2),
    ),
    check(
      countOf(html, "ACME Retail K.K."),
      toBe(1),
    ),
  ]);
});

test("a project search deep link keeps results before detail", () => {
  const [m] = app.init(
    makeUrl(
      "/example/demo1.html",
      "?c=projects&search=1&submitted=1&kw=cobalt&st=Any&p=cobalt",
    ),
  );
  const html = renderToString(app.view(m));
  return all([
    check(
      appSearch(m),
      toBe(
        "?c=projects&p=cobalt&search=1&submitted=1&kw=cobalt&st=Any",
      ),
    ),
    check(
      html.includes("Project Menu"),
      toBe(true),
    ),
    check(
      html.includes("Search Condition"),
      toBe(false),
    ),
    check(
      html.includes("bo-search-condition"),
      toBe(false),
    ),
    check(html.includes("Results"), toBe(true)),
    check(
      html.includes("bo-results"),
      toBe(true),
    ),
    check(
      html.includes("Cobalt mobile app"),
      toBe(true),
    ),
    check(
      html.includes("Scoping · Cobalt Labs"),
      toBe(true),
    ),
    check(html.includes("¥12M"), toBe(true)),
    check(
      html.indexOf("Results") <
        html.indexOf("¥12M"),
      toBe(true),
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

test("opening Clients shows the client submenu", () => {
  const m = drive(openMenu("clients"));
  const html = renderToString(app.view(m));
  return all([
    check(
      html.includes("Client Menu"),
      toBe(true),
    ),
    check(
      html.includes(">Add Client<"),
      toBe(true),
    ),
    check(
      html.includes(">Search Client<"),
      toBe(true),
    ),
    check(
      html.includes("bo-hidelist"),
      toBe(true),
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
      before.includes(
        'href="/?c=clients&amp;search=1"',
      ),
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

test("the Projects column opens an app-owned add form", () => {
  const opened = drive(openMenu("projects"));
  const before = renderToString(app.view(opened));
  const [formModel] = app.init(
    makeUrl("/", "?c=projects&add=project"),
  );
  const formHtml = renderToString(
    app.view(formModel),
  );
  return all([
    check(
      before.includes(
        'href="/?c=projects&amp;add=project"',
      ),
      toBe(true),
    ),
    check(
      before.includes(
        'href="/?c=projects&amp;search=1"',
      ),
      toBe(true),
    ),
    check(
      formModel.projectForm.open,
      toBe(true),
    ),
    check(
      formHtml.includes("<form"),
      toBe(true),
    ),
    check(
      formHtml.includes(">Register project<"),
      toBe(true),
    ),
    check(
      formHtml.includes(">Contract<"),
      toBe(true),
    ),
    check(
      formHtml.includes(">Budget<"),
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

test("the add project form validates required name", () => {
  const [formModel] = app.init(
    makeUrl("/", "?c=projects&add=project"),
  );
  const invalid = app.update(
    { kind: "projectFormSubmit" },
    formModel,
  )[0];
  const html = renderToString(app.view(invalid));
  return all([
    check(
      invalid.projectForm.open,
      toBe(true),
    ),
    check(html.includes("Required"), toBe(true)),
    check(
      html.includes("Phoenix Portal"),
      toBe(false),
    ),
  ]);
});

test(
  "a valid add project form creates a project and lands on its detail",
  () => {
    const [formModel] = app.init(
      makeUrl("/", "?c=projects&add=project"),
    );
    const filled = [
      {
        kind: "projectNameInput",
        value: "Phoenix Portal",
      } satisfies Msg,
      {
        kind: "projectClientInput",
        value: "Phoenix Works",
      } satisfies Msg,
      {
        kind: "projectContractInput",
        value: "T&M",
      } satisfies Msg,
      {
        kind: "projectStatusInput",
        value: "Scoping",
      } satisfies Msg,
      {
        kind: "projectPeriodInput",
        value: "2026-10 - 2027-03",
      } satisfies Msg,
      {
        kind: "projectBudgetInput",
        value: "¥9.1M",
      } satisfies Msg,
      {
        kind: "projectLeadInput",
        value: "Ito",
      } satisfies Msg,
    ].reduce(
      (m: Model, msg: Msg) =>
        app.update(msg, m)[0],
      formModel,
    );
    const created = app.update(
      { kind: "projectFormSubmit" },
      filled,
    )[0];
    const html = renderToString(app.view(created));
    return all([
      check(
        created.projectForm.open,
        toBe(false),
      ),
      check(
        scheduled.toUrl(created.scheduled).search,
        toBe("?c=projects&p=phoenix-portal-1"),
      ),
      check(
        html.includes("Phoenix Portal"),
        toBe(true),
      ),
      check(
        html.includes("Phoenix Works"),
        toBe(true),
      ),
      check(html.includes("¥9.1M"), toBe(true)),
    ]);
  },
);
