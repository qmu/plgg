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
import { collapseTo, trailAt } from "./url.ts";

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
  '&amp;st=In+progress&amp;p=beacon"';

// A menu entry names its section, so it is a singular noun.
const LABELS: ReadonlyArray<string> = [
  "Dashboard",
  "Project",
  "Client",
  "Estimate",
  "Timesheet",
  "Invoice",
  "Member",
  "Report",
];

// A column header title is the ONLY place these words are a
// heading rather than incidental prose, so anchor on the
// header's own markup: `colHead` labels the title link
// `aria-label="Reset to <title>"`. A bare
// `html.includes("Projects")` would pass on any record name
// that happens to contain the word.
const headAt = (
  html: string,
  title: string,
): number =>
  html.indexOf(`aria-label="Reset to ${title}"`);

const headed = (
  html: string,
  title: string,
): boolean => headAt(html, title) >= 0;

test("the root view renders the eight sections as a nav menu", () => {
  const html = renderToString(app.view(m0));
  return all([
    check(html.includes("<nav"), toBe(true)),
    check(html.includes("DevDesk"), toBe(true)),
    ...LABELS.map((label: string) =>
      check(
        html.includes(`>${label}<`),
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
  const [darkToLight, lightCmd] = darkApp.update(
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

test("the Dashboard renders as a board whose tiles jump to their sections", () => {
  const html = renderToString(
    app.view(drive(openMenu("dashboard"))),
  );
  return all([
    check(
      html.includes("3 active projects"),
      toBe(true),
    ),
    check(
      html.includes(
        "In progress, across 3 clients.",
      ),
      toBe(true),
    ),
    check(
      html.includes("112 unbilled hours"),
      toBe(true),
    ),
    check(
      html.includes(
        "3 estimates awaiting sign-off",
      ),
      toBe(true),
    ),
    // the board / tile class hooks
    check(html.includes("pm-board"), toBe(true)),
    check(html.includes("pm-tile"), toBe(true)),
    // each tile jumps to the section it summarizes
    // — the sections' canonical addresses.
    check(
      html.includes('href="/?c=projects"'),
      toBe(true),
    ),
    check(
      html.includes('href="/?c=timesheets"'),
      toBe(true),
    ),
    check(
      html.includes('href="/?c=deals"'),
      toBe(true),
    ),
  ]);
});

test("a Dashboard tile selection shows no bogus detail", () => {
  const html = renderToString(
    app.view(
      drive(
        openMenu("dashboard"),
        select(0, "active"),
      ),
    ),
  );
  return all([
    // the board is still on screen …
    check(
      html.includes("3 active projects"),
      toBe(true),
    ),
    // … and no detail column appeared for the tile
    // (board rows do not drill — the decided
    // Select semantics).
    check(
      html.includes("pm-fields"),
      toBe(false),
    ),
  ]);
});

test("opening Projects shows the project submenu", () => {
  const m = drive(openMenu("projects"));
  const html = renderToString(app.view(m));
  return all([
    check(headed(html, "Project"), toBe(true)),
    check(html.includes(">Add<"), toBe(true)),
    check(html.includes(">Search<"), toBe(true)),
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
    (m: Model, msg: Msg) => app.update(msg, m)[0],
    searchModel,
  );
  const submitted = app.update(
    { kind: "searchFormSubmit" },
    filled,
  )[0];
  const html = renderToString(
    app.view(submitted),
  );
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
    check(headed(html, "Condition"), toBe(true)),
    check(
      html.includes("bo-search-condition"),
      toBe(true),
    ),
    // the results column holds a MANY, so it is the plural
    check(headed(html, "Projects"), toBe(true)),
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
  const html = renderToString(
    app.view(submitted),
  );
  return all([
    check(searchModel.search.open, toBe(true)),
    check(
      appSearch(submitted),
      toBe(
        "?c=clients&search=1&submitted=1&kw=beacon&st=Any",
      ),
    ),
    check(headed(html, "Clients"), toBe(true)),
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

test("a project search deep link keeps the condition and results before detail", () => {
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
    check(headed(html, "Project"), toBe(true)),
    // the search condition STAYS when a result is selected —
    // the detail opens as a further column beside it.
    check(headed(html, "Condition"), toBe(true)),
    check(
      html.includes("bo-search-condition"),
      toBe(true),
    ),
    check(headed(html, "Projects"), toBe(true)),
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
    // column order: condition → results → detail
    check(
      headAt(html, "Condition") <
        headAt(html, "Projects"),
      toBe(true),
    ),
    check(
      headAt(html, "Projects") <
        html.indexOf("¥12M"),
      toBe(true),
    ),
  ]);
});

// The strip's one navigation rule: a link collapses the
// strip back to its OWN column, so nothing it does not lead
// to is left standing to its right. Asserted from the
// deepest view — a search, a selection, and two hops — since
// every stage has something to its right to drop there.
// A trail step NAMES its section rather than encoding it in a
// letter: `l_projects_client_acme` is "the projects whose
// `client` field names client acme" (what `lacme` used to
// say), and `d_projects_acme` is that project's detail (`pacme`).
const DEEP =
  "?c=clients&search=1&submitted=1&kw=beacon" +
  "&st=Any&p=acme" +
  "&trail=l_projects_client_acme.d_projects_acme";

const deepUrl = makeUrl("/", DEEP);

test("a header link drops every column right of its own", () => {
  return all([
    check(
      collapseTo(deepUrl, "section").search,
      toBe("?c=clients"),
    ),
    check(
      collapseTo(deepUrl, "search").search,
      toBe("?c=clients&search=1"),
    ),
    check(
      collapseTo(deepUrl, "results").search,
      toBe(
        "?c=clients&search=1&submitted=1&kw=beacon&st=Any",
      ),
    ),
    // the detail keeps its selection and drops only the trail
    check(
      collapseTo(deepUrl, "detail").search,
      toBe(
        "?c=clients&search=1&submitted=1&kw=beacon&st=Any&p=acme",
      ),
    ),
    // the right-most stage has nothing to its right
    check(
      collapseTo(deepUrl, "trail").search,
      toBe(DEEP),
    ),
  ]);
});

test("a trail column's header keeps that column, dropping the hops after it", () => {
  return all([
    // depth 0 is the root detail: the whole trail goes
    check(
      trailAt(deepUrl, 0).search,
      toBe(
        "?c=clients&search=1&submitted=1&kw=beacon&st=Any&p=acme",
      ),
    ),
    // the step at index 0 stands at depth 1 and SURVIVES its
    // own header link — collapsing to index 0 would drop the
    // very column whose title was clicked.
    check(
      trailAt(deepUrl, 1).search,
      toBe(
        "?c=clients&search=1&submitted=1&kw=beacon&st=Any&p=acme" +
          "&trail=l_projects_client_acme",
      ),
    ),
  ]);
});

// Asserted through the app's OWN column markers, not the
// header titles: the framework still renders its list and
// detail columns into the DOM (the stylesheet hides them),
// and its list column carries the collection's title —
// "Clients" — so a title alone cannot tell the app's results
// column apart from a framework column that is not on
// screen. `bo-results`/`bo-trail-detail` belong to the app
// alone and say what is really standing there.
test("collapsing to the condition column leaves it right-most on screen", () => {
  const [deep] = app.init(deepUrl);
  const deepHtml = renderToString(app.view(deep));
  const [collapsed] = app.init(
    makeUrl(
      "/",
      collapseTo(deepUrl, "search").search,
    ),
  );
  const html = renderToString(
    app.view(collapsed),
  );
  return all([
    // the deep view really does carry the columns to the right
    check(
      deepHtml.includes("bo-results"),
      toBe(true),
    ),
    check(
      deepHtml.includes("bo-trail-detail"),
      toBe(true),
    ),
    // …and collapsing to Condition leaves none of them
    check(headed(html, "Condition"), toBe(true)),
    check(
      html.includes("bo-search-condition"),
      toBe(true),
    ),
    check(
      html.includes("bo-results"),
      toBe(false),
    ),
    check(
      html.includes("bo-trail-detail"),
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

test("opening Clients shows the client submenu", () => {
  const m = drive(openMenu("clients"));
  const html = renderToString(app.view(m));
  return all([
    check(headed(html, "Client"), toBe(true)),
    check(html.includes(">Add<"), toBe(true)),
    check(html.includes(">Search<"), toBe(true)),
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
      formModel.forms.clients.open,
      toBe(true),
    ),
    check(formHtml.includes("<form"), toBe(true)),
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
      formModel.forms.projects.open,
      toBe(true),
    ),
    check(formHtml.includes("<form"), toBe(true)),
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
    {
      kind: "formSubmit",
      section: "clients",
    },
    formModel,
  )[0];
  const html = renderToString(app.view(invalid));
  return all([
    check(invalid.forms.clients.open, toBe(true)),
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
      kind: "fieldInput",
      section: "clients",
      field: "name",
      value: "Orbit Systems",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "clients",
      field: "status",
      value: "Active",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "clients",
      field: "since",
      value: "2026",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "clients",
      field: "contact",
      value: "Mina, Ops",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "clients",
      field: "notes",
      value: "New implementation partner.",
    } satisfies Msg,
  ].reduce(
    (m: Model, msg: Msg) => app.update(msg, m)[0],
    formModel,
  );
  const created = app.update(
    {
      kind: "formSubmit",
      section: "clients",
    },
    filled,
  )[0];
  const html = renderToString(app.view(created));
  return all([
    check(
      created.forms.clients.open,
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
      html.includes(
        "New implementation partner.",
      ),
      toBe(true),
    ),
  ]);
});

test("the add project form validates required name", () => {
  const [formModel] = app.init(
    makeUrl("/", "?c=projects&add=project"),
  );
  const invalid = app.update(
    {
      kind: "formSubmit",
      section: "projects",
    },
    formModel,
  )[0];
  const html = renderToString(app.view(invalid));
  return all([
    check(
      invalid.forms.projects.open,
      toBe(true),
    ),
    check(html.includes("Required"), toBe(true)),
    check(
      html.includes("Phoenix Portal"),
      toBe(false),
    ),
  ]);
});

test("a valid add project form creates a project and lands on its detail", () => {
  const [formModel] = app.init(
    makeUrl("/", "?c=projects&add=project"),
  );
  const filled = [
    {
      kind: "fieldInput",
      section: "projects",
      field: "name",
      value: "Phoenix Portal",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "projects",
      field: "client",
      value: "Phoenix Works",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "projects",
      field: "contract",
      value: "T&M",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "projects",
      field: "status",
      value: "Scoping",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "projects",
      field: "period",
      value: "2026-10 - 2027-03",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "projects",
      field: "budget",
      value: "¥9.1M",
    } satisfies Msg,
    {
      kind: "fieldInput",
      section: "projects",
      field: "lead",
      value: "Ito",
    } satisfies Msg,
  ].reduce(
    (m: Model, msg: Msg) => app.update(msg, m)[0],
    formModel,
  );
  const created = app.update(
    {
      kind: "formSubmit",
      section: "projects",
    },
    filled,
  )[0];
  const html = renderToString(app.view(created));
  return all([
    check(
      created.forms.projects.open,
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
});

// === Every section behaves the same ===
// The rule "a column header names the column's KIND, never its
// record" used to lose for five sections out of eight: `deals`,
// `timesheets`, `invoices`, `members` and `reports` were STUBS
// rendered by the framework's list/detail, so their detail
// column was titled "EST-2041 — ACME storefront". These pin the
// rule for ALL seven record sections, so a section cannot be
// added back as a stub without saying so out loud.
//
// Asserted through the app's own `bo-trail-detail` marker as
// well as the title: the framework still renders its detail
// column into the DOM (the stylesheet hides it) carrying the
// RECORD's name, so a title check alone cannot tell the app's
// pane from a framework column that is not on screen.
const SECTION_DETAILS: ReadonlyArray<
  readonly [string, string, string]
> = [
  ["clients", "acme", "Client"],
  ["projects", "acme", "Project"],
  ["deals", "est-2041", "Estimate"],
  ["timesheets", "wk27-aoki", "Timesheet"],
  ["invoices", "inv-0192", "Invoice"],
  ["members", "aoki", "Member"],
  ["reports", "profit", "Report"],
];

test("every section titles its detail column by its KIND, not its record", () => {
  return all(
    SECTION_DETAILS.flatMap(
      ([section, id, kind]) => {
        const [m] = app.init(
          makeUrl("/", `?c=${section}&p=${id}`),
        );
        const html = renderToString(app.view(m));
        return [
          // the app's own pane is what is standing there…
          check(
            html.includes("bo-trail-detail"),
            toBe(true),
          ),
          // …titled by the kind…
          check(
            headed(html, `${kind} Detail`),
            toBe(true),
          ),
          // …and the section's list column holds a MANY, so it
          // is plural.
          check(
            headed(html, `${kind} Detail`) &&
              html.includes(`>${kind}<`),
            toBe(true),
          ),
        ];
      },
    ),
  );
});

test("every section opens an app-owned add form and search condition", () => {
  return all(
    SECTION_DETAILS.flatMap(
      ([section, , kind]) => {
        const singular = kind.toLowerCase();
        const [add] = app.init(
          makeUrl(
            "/",
            `?c=${section}&add=${singular}`,
          ),
        );
        const addHtml = renderToString(
          app.view(add),
        );
        const [search] = app.init(
          makeUrl("/", `?c=${section}&search=1`),
        );
        const searchHtml = renderToString(
          app.view(search),
        );
        return [
          check(
            headed(addHtml, `Add ${kind}`),
            toBe(true),
          ),
          check(
            addHtml.includes(
              `>Register ${singular}<`,
            ),
            toBe(true),
          ),
          check(
            searchHtml.includes(
              "bo-search-condition",
            ),
            toBe(true),
          ),
          check(
            headed(searchHtml, "Condition"),
            toBe(true),
          ),
        ];
      },
    ),
  );
});

// The recursion is declared, not hand-written: `projects.lead`
// says it refs members and `timesheets.member` says the same,
// so a member's pane offers both WITHOUT members knowing either
// section exists. These pin the links a `refTo` produces in
// both directions.
test("a section's detail offers one recursion link per incoming reference", () => {
  const paneOf = (url: string): string => {
    const [m] = app.init(makeUrl("/", url));
    return renderToString(app.view(m));
  };
  const client = paneOf("?c=clients&p=acme");
  const member = paneOf("?c=members&p=aoki");
  const estimate = paneOf("?c=deals&p=est-2041");
  return all([
    // clients ← projects.client, deals.client, invoices.client
    check(
      client.includes("Related Projects →"),
      toBe(true),
    ),
    check(
      client.includes("Related Estimates →"),
      toBe(true),
    ),
    check(
      client.includes("Related Invoices →"),
      toBe(true),
    ),
    // members ← projects.lead, timesheets.member, reports.owner
    check(
      member.includes("Related Projects →"),
      toBe(true),
    ),
    check(
      member.includes("Related Timesheets →"),
      toBe(true),
    ),
    check(
      member.includes("Related Reports →"),
      toBe(true),
    ),
    // nothing refs an estimate, so its pane offers no hop —
    // the links follow the declarations, not a hand-kept list.
    check(
      estimate.includes("bo-trail-jump"),
      toBe(false),
    ),
    // …but it still JUMPS to what it references (forward).
    check(
      estimate.includes("bo-field-link"),
      toBe(true),
    ),
  ]);
});

test("the recursion spans the newly-declared sections", () => {
  // A client's estimates, then that estimate's project: two
  // hops through sections that were placeholder tuples, using
  // exactly the same trail codec as clients↔projects.
  const [m] = app.init(
    makeUrl(
      "/",
      "?c=clients&p=acme" +
        "&trail=l_deals_client_acme.d_deals_est-2041",
    ),
  );
  const html = renderToString(app.view(m));
  return all([
    check(headed(html, "Estimates"), toBe(true)),
    check(
      headed(html, "Estimate Detail"),
      toBe(true),
    ),
    check(html.includes("EST-2041"), toBe(true)),
    check(html.includes("¥8.4M"), toBe(true)),
  ]);
});

// `hideList` asks whether the app owns this view's navigation.
// Once every section is in the catalog it looked unconditional
// — but the Dashboard is a BOARD, not a section of records, so
// it keeps the framework's tiles and the flag still says
// something.
test("the dashboard keeps the framework's board while sections hide its list", () => {
  const board = renderToString(
    app.view(drive(openMenu("dashboard"))),
  );
  const [section] = app.init(
    makeUrl("/", "?c=reports"),
  );
  const sectionHtml = renderToString(
    app.view(section),
  );
  return all([
    check(
      board.includes("bo-hidelist"),
      toBe(false),
    ),
    check(board.includes("pm-board"), toBe(true)),
    check(
      sectionHtml.includes("bo-hidelist"),
      toBe(true),
    ),
  ]);
});
