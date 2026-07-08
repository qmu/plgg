import {
  type SoftStr,
  type Datum,
  type Result,
  type InvalidError,
  type Option,
  some,
  none,
  fromNullable,
  matchOption,
  match,
  matchResult,
  ok,
  err,
  invalidError,
} from "plgg";
import {
  type Html,
  type Flow,
  slot,
  span,
  a,
  href,
  ul,
  li,
  text,
  attr,
} from "plgg-view";
import {
  type Application,
  type Cmd,
  type Url,
  cmdNone,
  cmdBatch,
  cmdEffect,
  cmdNone$,
  cmdBatch$,
  cmdEffect$,
} from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  type Declaration,
  type Collection,
  declare,
  menu,
  menuEntry,
  collection,
  sync,
  query,
  makeRow,
  field,
  schedule,
  multiColumnWith,
  textInput,
  textArea,
  selectInput,
  formView,
  parseForm,
  errorFor,
  type FormErrors,
  themeToggle,
  openMenu,
  select,
} from "plggmatic";
import {
  type Scheme,
  applyScheme,
} from "plggmatic/style";

/**
 * Demo 1 — a business-management system for a CONTRACT
 * software-development company (受託開発), grown from a
 * declaration.
 *
 * Step 1 laid out the eight-section MENU from scratch.
 * Step 2 brought the **Projects** section to life, and
 * step 3 the **Clients** section — each a filterable list
 * whose rows carry a full record, shown as a detail view on
 * select. Adding a client is deliberately owned by this
 * demo wrapper, not by the scheduler: plggmatic supplies
 * the column shell and header-link slots, while the app
 * owns its domain-specific draft, validation, and submit
 * behavior. The other six sections stay placeholder lists
 * until later steps.
 *
 * (The scheduler shows a collection's own detail ONLY when
 * it has no `child` — a `child` drills to a sub-list
 * instead. A project or client is a RECORD, so those
 * sections are leaves and selecting one shows its fields;
 * a per-project task/milestone drill is a later step, and
 * the multi-level drill itself is already demonstrated by
 * demo 3 and the workbench.)
 */

// --- The menu: all eight top-level sections ---
const MENU: ReadonlyArray<
  readonly [SoftStr, SoftStr]
> = [
  ["dashboard", "Dashboard"],
  ["projects", "Projects"],
  ["clients", "Clients"],
  ["deals", "Estimates & Contracts"],
  ["timesheets", "Timesheets"],
  ["invoices", "Invoices"],
  ["members", "Members"],
  ["reports", "Reports"],
];

// --- Projects: the first real section (filterable + detail) ---
type Project = Readonly<{
  id: SoftStr;
  name: SoftStr;
  client: SoftStr;
  contract: SoftStr;
  status: SoftStr;
  period: SoftStr;
  budget: SoftStr;
  lead: SoftStr;
}>;

let projects: ReadonlyArray<Project> = [
  {
    id: "acme",
    name: "ACME storefront rebuild",
    client: "ACME Retail K.K.",
    contract: "Fixed-price",
    status: "In progress",
    period: "2026-04 – 2026-09",
    budget: "¥8.4M",
    lead: "Aoki",
  },
  {
    id: "beacon",
    name: "Beacon bank API",
    client: "Beacon Financial",
    contract: "T&M",
    status: "In progress",
    period: "2026-02 – 2026-12",
    budget: "¥22M",
    lead: "Béranger",
  },
  {
    id: "cobalt",
    name: "Cobalt mobile app",
    client: "Cobalt Labs",
    contract: "Fixed-price",
    status: "Scoping",
    period: "2026-08 – 2027-01",
    budget: "¥12M",
    lead: "Chen",
  },
  {
    id: "delta",
    name: "Delta data platform",
    client: "Delta Logistics",
    contract: "T&M",
    status: "On hold",
    period: "2026-05 – 2026-11",
    budget: "¥18M",
    lead: "Aoki",
  },
  {
    id: "echo",
    name: "Echo CMS migration",
    client: "Echo Media",
    contract: "Fixed-price",
    status: "Delivered",
    period: "2025-10 – 2026-03",
    budget: "¥6.2M",
    lead: "Béranger",
  },
  {
    id: "foxtrot",
    name: "Foxtrot IoT gateway",
    client: "Foxtrot Mfg.",
    contract: "T&M",
    status: "In progress",
    period: "2026-06 – 2027-03",
    budget: "¥30M",
    lead: "Chen",
  },
];
let projectCounter = 0;

const projectRow = (p: Project) =>
  makeRow(p.id, p.name, [
    field("Client", p.client),
    field("Contract", p.contract),
    field("Status", p.status),
    field("Period", p.period),
    field("Budget", p.budget),
    field("Lead", p.lead),
  ]);

const projectsCollection: Collection =
  collection<Project>({
    id: "projects",
    title: "Projects",
    toRow: projectRow,
    source: sync(() => projects),
    query: query("Filter projects"),
  });

// --- Clients: the second real section (filterable + detail) ---
type Client = Readonly<{
  id: SoftStr;
  name: SoftStr;
  status: SoftStr;
  since: SoftStr;
  contact: SoftStr;
  projects: SoftStr;
  notes: SoftStr;
}>;

let clients: ReadonlyArray<Client> = [
  {
    id: "acme",
    name: "ACME Retail K.K.",
    status: "Prime",
    since: "2024",
    contact: "Sato, IT Dept.",
    projects: "ACME storefront rebuild",
    notes:
      "Prime account; framework contract renews yearly.",
  },
  {
    id: "beacon",
    name: "Beacon Financial",
    status: "Active",
    since: "2025",
    contact: "Ito, Digital",
    projects: "Beacon bank API",
    notes:
      "MSA in place; strict security review gate.",
  },
  {
    id: "cobalt",
    name: "Cobalt Labs",
    status: "Prospect",
    since: "2026",
    contact: "Lang, Product",
    projects: "Cobalt mobile app",
    notes: "New this quarter; scoping phase 1.",
  },
  {
    id: "delta",
    name: "Delta Logistics",
    status: "Active",
    since: "2025",
    contact: "Mori, Operations",
    projects: "Delta data platform",
    notes:
      "T&M engagement; delivery currently on hold.",
  },
  {
    id: "echo",
    name: "Echo Media",
    status: "Active",
    since: "2023",
    contact: "Ueda, Editorial",
    projects: "Echo CMS migration",
    notes:
      "CMS migration delivered; maintenance retainer.",
  },
  {
    id: "foxtrot",
    name: "Foxtrot Mfg.",
    status: "Active",
    since: "2025",
    contact: "Kanda, Plant IT",
    projects: "Foxtrot IoT gateway",
    notes:
      "Largest active budget; multi-site rollout.",
  },
];
let clientCounter = 0;

type SearchableSection = "clients" | "projects";

const clientStatuses: ReadonlyArray<SoftStr> = [
  "Prospect",
  "Active",
  "Prime",
];

const projectStatuses: ReadonlyArray<SoftStr> = [
  "In progress",
  "Scoping",
  "On hold",
  "Delivered",
];

const projectContracts: ReadonlyArray<SoftStr> = [
  "Fixed-price",
  "T&M",
];

const clientRow = (c: Client) =>
  makeRow(c.id, c.name, [
    field("Status", c.status),
    field("Since", c.since),
    field("Contact", c.contact),
    field("Projects", c.projects),
    field("Notes", c.notes),
  ]);

const clientsCollection: Collection =
  collection<Client>({
    id: "clients",
    title: "Clients",
    toRow: clientRow,
    source: sync(() => clients),
    query: query("Filter clients"),
  });

// --- The other six sections: step-1 placeholder lists ---
type Stub = Readonly<{
  id: SoftStr;
  title: SoftStr;
  rows: ReadonlyArray<
    readonly [SoftStr, SoftStr, SoftStr]
  >;
}>;

const STUBS: ReadonlyArray<Stub> = [
  {
    id: "dashboard",
    title: "Dashboard",
    rows: [
      [
        "active",
        "7 active projects",
        "Across 5 clients.",
      ],
      [
        "unbilled",
        "128 unbilled hours",
        "This month, not yet invoiced.",
      ],
      [
        "pending",
        "3 estimates awaiting sign-off",
        "Oldest: 9 days.",
      ],
    ],
  },
  {
    id: "deals",
    title: "Estimates & Contracts",
    rows: [
      [
        "est-2041",
        "EST-2041 — ACME storefront",
        "¥8.4M · sent.",
      ],
      [
        "msa-beacon",
        "MSA — Beacon Financial",
        "Signed.",
      ],
      [
        "sow-17",
        "SOW-17 — Cobalt phase 2",
        "Draft.",
      ],
    ],
  },
  {
    id: "timesheets",
    title: "Timesheets",
    rows: [
      [
        "wk27",
        "Week 27 — 4 members",
        "112 h logged.",
      ],
      ["unsub", "Unsubmitted: 2", "Aoki, Chen."],
    ],
  },
  {
    id: "invoices",
    title: "Invoices",
    rows: [
      [
        "inv-0192",
        "INV-0192 — ACME",
        "¥3.2M · issued.",
      ],
      [
        "inv-0193",
        "INV-0193 — Beacon",
        "¥1.8M · draft.",
      ],
    ],
  },
  {
    id: "members",
    title: "Members",
    rows: [
      [
        "aoki",
        "Aoki",
        "Backend · 80% allocated.",
      ],
      [
        "beranger",
        "Béranger",
        "Frontend · 100% allocated.",
      ],
      ["chen", "Chen", "SRE · 60% allocated."],
    ],
  },
  {
    id: "reports",
    title: "Reports",
    rows: [
      [
        "profit",
        "Project profitability",
        "By project, this quarter.",
      ],
      [
        "util",
        "Utilization by member",
        "Billable ratio.",
      ],
    ],
  },
];

const stubCollection = (s: Stub): Collection =>
  collection<
    readonly [SoftStr, SoftStr, SoftStr]
  >({
    id: s.id,
    title: s.title,
    toRow: ([id, label, note]) =>
      makeRow(id, label, [field("", note)]),
    source: sync(() => s.rows),
  });

export const declaration: Declaration = declare({
  title: "Menu",
  menu: menu(
    MENU.map(([id, label]) =>
      menuEntry(label, id),
    ),
  ),
  collections: [
    ...STUBS.map(stubCollection),
    projectsCollection,
    clientsCollection,
  ],
});

/**
 * The scheduled program — exported so the spec can assert
 * the derived URL codec (`toUrl`) directly.
 */
export const scheduled = schedule(declaration);

type ClientForm = Readonly<{
  open: boolean;
  nameDraft: SoftStr;
  statusDraft: SoftStr;
  sinceDraft: SoftStr;
  contactDraft: SoftStr;
  notesDraft: SoftStr;
  errors: FormErrors;
}>;

type ProjectForm = Readonly<{
  open: boolean;
  nameDraft: SoftStr;
  clientDraft: SoftStr;
  contractDraft: SoftStr;
  statusDraft: SoftStr;
  periodDraft: SoftStr;
  budgetDraft: SoftStr;
  leadDraft: SoftStr;
  errors: FormErrors;
}>;

type SearchForm = Readonly<{
  open: boolean;
  submitted: boolean;
  keywordDraft: SoftStr;
  statusDraft: SoftStr;
  keyword: SoftStr;
  status: SoftStr;
}>;

export type Model = Readonly<{
  scheme: Scheme;
  scheduled: ScheduledModel;
  clientForm: ClientForm;
  projectForm: ProjectForm;
  search: SearchForm;
}>;

export type Msg =
  | Readonly<{
      kind: "scheduler";
      msg: SchedulerMsg;
    }>
  | Readonly<{ kind: "toggleScheme" }>
  | Readonly<{ kind: "schemeApplied" }>
  | Readonly<{ kind: "urlChanged"; url: Url }>
  | Readonly<{
      kind: "clientNameInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "clientStatusInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "clientSinceInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "clientContactInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "clientNotesInput";
      value: SoftStr;
    }>
  | Readonly<{ kind: "clientFormSubmit" }>
  | Readonly<{
      kind: "projectNameInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "projectClientInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "projectContractInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "projectStatusInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "projectPeriodInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "projectBudgetInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "projectLeadInput";
      value: SoftStr;
    }>
  | Readonly<{ kind: "projectFormSubmit" }>
  | Readonly<{
      kind: "searchKeywordInput";
      value: SoftStr;
    }>
  | Readonly<{
      kind: "searchStatusInput";
      value: SoftStr;
    }>
  | Readonly<{ kind: "searchFormSubmit" }>;

const emptyClientForm = (open: boolean): ClientForm => ({
  open,
  nameDraft: "",
  statusDraft: "Prospect",
  sinceDraft: "2026",
  contactDraft: "",
  notesDraft: "",
  errors: [],
});

const emptyProjectForm = (
  open: boolean,
): ProjectForm => ({
  open,
  nameDraft: "",
  clientDraft: "",
  contractDraft: "Fixed-price",
  statusDraft: "In progress",
  periodDraft: "",
  budgetDraft: "",
  leadDraft: "",
  errors: [],
});

const emptySearchForm = (
  open: boolean,
  submitted: boolean,
  keyword: SoftStr,
  status: SoftStr,
): SearchForm => ({
  open,
  submitted,
  keywordDraft: keyword,
  statusDraft: status,
  keyword,
  status,
});

const flip = (s: Scheme): Scheme =>
  s === "light" ? "dark" : "light";

const applySchemeEffect = (
  scheme: Scheme,
): Cmd<Msg> =>
  cmdEffect(() => {
    applyScheme(
      scheme,
      document.documentElement,
      window.localStorage,
    );
    return Promise.resolve<Msg>({
      kind: "schemeApplied",
    });
  });

const searchString = (
  params: URLSearchParams,
): SoftStr => {
  const s = params.toString();
  return s === "" ? "" : `?${s}`;
};

const searchableSectionOf = (
  value: SoftStr,
): Option<SearchableSection> => {
  switch (value) {
    case "clients":
      return some("clients");
    case "projects":
      return some("projects");
    default:
      return none();
  }
};

const sectionOfUrl = (
  url: Url,
): Option<SearchableSection> =>
  matchOption<
    SoftStr,
    Option<SearchableSection>
  >(
    () => none(),
    searchableSectionOf,
  )(fromNullable(new URLSearchParams(url.search).get("c")));

const singularOf = (
  section: SearchableSection,
): SoftStr => {
  switch (section) {
    case "clients":
      return "client";
    case "projects":
      return "project";
  }
};

const titleOfSection = (
  section: SearchableSection,
): SoftStr => {
  switch (section) {
    case "clients":
      return "Client";
    case "projects":
      return "Project";
  }
};

const statusesOf = (
  section: SearchableSection,
): ReadonlyArray<SoftStr> => {
  switch (section) {
    case "clients":
      return clientStatuses;
    case "projects":
      return projectStatuses;
  }
};

const isAddUrl = (
  section: SearchableSection,
  url: Url,
): boolean =>
  new URLSearchParams(url.search).get("add") ===
  singularOf(section);

const paramOr = (
  params: URLSearchParams,
  name: SoftStr,
  fallback: SoftStr,
): SoftStr =>
  matchOption<SoftStr, SoftStr>(
    () => fallback,
    (value: SoftStr) => value,
  )(fromNullable(params.get(name)));

const searchFormFromUrl = (url: Url): SearchForm => {
  const params = new URLSearchParams(url.search);
  return emptySearchForm(
    params.get("search") === "1",
    params.get("submitted") === "1",
    paramOr(params, "kw", ""),
    paramOr(params, "st", "Any"),
  );
};

const withoutAppParams = (url: Url): Url => {
  const params = new URLSearchParams(url.search);
  params.delete("add");
  params.delete("search");
  params.delete("submitted");
  params.delete("kw");
  params.delete("st");
  return {
    path: url.path,
    search: searchString(params),
  };
};

// Drop the scheduler's selection (`p`) so opening an
// app-owned column starts fresh — forms/search are never
// shown as a 4th column beside a selected detail.
const withoutSelection = (url: Url): Url => {
  const params = new URLSearchParams(url.search);
  params.delete("p");
  return {
    path: url.path,
    search: searchString(params),
  };
};

const withAdd = (
  section: SearchableSection,
  url: Url,
): Url => {
  const params = new URLSearchParams(url.search);
  params.set("add", singularOf(section));
  params.delete("search");
  params.delete("submitted");
  params.delete("kw");
  params.delete("st");
  return {
    path: url.path,
    search: searchString(params),
  };
};

const withSearch = (url: Url): Url => {
  const params = new URLSearchParams(url.search);
  params.set("search", "1");
  params.delete("add");
  params.delete("submitted");
  params.delete("kw");
  params.delete("st");
  return {
    path: url.path,
    search: searchString(params),
  };
};

const withSubmittedSearch = (
  url: Url,
  form: SearchForm,
): Url => {
  const params = new URLSearchParams(url.search);
  params.delete("add");
  params.set("search", "1");
  params.set("submitted", "1");
  params.set("kw", form.keyword);
  params.set("st", form.status);
  return {
    path: url.path,
    search: searchString(params),
  };
};

const resultHref = (
  url: Url,
  id: SoftStr,
): SoftStr => {
  const params = new URLSearchParams(url.search);
  params.delete("add");
  params.delete("q");
  params.set("p", id);
  return `${url.path}${searchString(params)}`;
};

const hrefOf = (url: Url): SoftStr =>
  `${url.path}${url.search}`;

const mapCmd =
  <A, B>(f: (a: A) => B) =>
  (cmd: Cmd<A>): Cmd<B> =>
    match(cmd)(
      [cmdNone$(), () => cmdNone()],
      [
        cmdBatch$(),
        ({ content }) =>
          cmdBatch(content.map(mapCmd(f))),
      ],
      [
        cmdEffect$(),
        ({ content }) =>
          cmdEffect(() => content().then(f)),
      ],
    );

const mapSchedulerCmd = (
  cmd: Cmd<SchedulerMsg>,
): Cmd<Msg> =>
  mapCmd<SchedulerMsg, Msg>((msg) => ({
    kind: "scheduler",
    msg,
  }))(cmd);

const asFilled = (
  value: unknown,
): Result<Datum, InvalidError> =>
  typeof value === "string" &&
  value.trim().length > 0
    ? ok(value.trim())
    : err(invalidError({ message: "Required" }));

const asOptionalText = (
  value: unknown,
): Result<Datum, InvalidError> =>
  ok(typeof value === "string" ? value.trim() : "");

const clientDraftOf =
  (form: ClientForm) =>
  (name: SoftStr): SoftStr => {
    switch (name) {
      case "name":
        return form.nameDraft;
      case "status":
        return form.statusDraft;
      case "since":
        return form.sinceDraft;
      case "contact":
        return form.contactDraft;
      case "notes":
        return form.notesDraft;
      default:
        return "";
    }
  };

const clientId = (
  name: SoftStr,
  counter: number,
): SoftStr => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === ""
    ? `client-${counter}`
    : `${slug}-${counter}`;
};

const projectDraftOf =
  (form: ProjectForm) =>
  (name: SoftStr): SoftStr => {
    switch (name) {
      case "name":
        return form.nameDraft;
      case "client":
        return form.clientDraft;
      case "contract":
        return form.contractDraft;
      case "status":
        return form.statusDraft;
      case "period":
        return form.periodDraft;
      case "budget":
        return form.budgetDraft;
      case "lead":
        return form.leadDraft;
      default:
        return "";
    }
  };

const projectId = (
  name: SoftStr,
  counter: number,
): SoftStr => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === ""
    ? `project-${counter}`
    : `${slug}-${counter}`;
};

const parseClientForm = (
  form: ClientForm,
) =>
  parseForm(
    [
      { name: "name", cast: asFilled },
      { name: "status", cast: asFilled },
      { name: "since", cast: asFilled },
      { name: "contact", cast: asFilled },
      { name: "notes", cast: asOptionalText },
    ],
    clientDraftOf(form),
  );

const parseProjectForm = (
  form: ProjectForm,
) =>
  parseForm(
    [
      { name: "name", cast: asFilled },
      { name: "client", cast: asOptionalText },
      { name: "contract", cast: asFilled },
      { name: "status", cast: asFilled },
      { name: "period", cast: asOptionalText },
      { name: "budget", cast: asOptionalText },
      { name: "lead", cast: asOptionalText },
    ],
    projectDraftOf(form),
  );

const makeClient = (
  payload: Readonly<Record<string, Datum>>,
): Client => {
  clientCounter = clientCounter + 1;
  const name = `${payload.name}`;
  return {
    id: clientId(name, clientCounter),
    name,
    status: `${payload.status}`,
    since: `${payload.since}`,
    contact: `${payload.contact}`,
    projects: "No active projects",
    notes: `${payload.notes}`,
  };
};

const makeProject = (
  payload: Readonly<Record<string, Datum>>,
): Project => {
  projectCounter = projectCounter + 1;
  const name = `${payload.name}`;
  return {
    id: projectId(name, projectCounter),
    name,
    client: `${payload.client}`,
    contract: `${payload.contract}`,
    status: `${payload.status}`,
    period: `${payload.period}`,
    budget: `${payload.budget}`,
    lead: `${payload.lead}`,
  };
};

const selectCreatedClient = (
  scheduledModel: ScheduledModel,
  id: SoftStr,
): readonly [ScheduledModel, Cmd<Msg>] => {
  const [opened, openCmd] = scheduled.update(
    openMenu("clients"),
    scheduledModel,
  );
  const [selected, selectCmd] = scheduled.update(
    select(0, id),
    opened,
  );
  return [
    selected,
    cmdBatch([
      mapSchedulerCmd(openCmd),
      mapSchedulerCmd(selectCmd),
    ]),
  ];
};

const selectCreatedProject = (
  scheduledModel: ScheduledModel,
  id: SoftStr,
): readonly [ScheduledModel, Cmd<Msg>] => {
  const [opened, openCmd] = scheduled.update(
    openMenu("projects"),
    scheduledModel,
  );
  const [selected, selectCmd] = scheduled.update(
    select(0, id),
    opened,
  );
  return [
    selected,
    cmdBatch([
      mapSchedulerCmd(openCmd),
      mapSchedulerCmd(selectCmd),
    ]),
  ];
};

const updateClientForm = (
  form: ClientForm,
  patch: Partial<ClientForm>,
): ClientForm => ({
  ...form,
  ...patch,
});

const updateProjectForm = (
  form: ProjectForm,
  patch: Partial<ProjectForm>,
): ProjectForm => ({
  ...form,
  ...patch,
});

type AppColumn = Readonly<{
  key: SoftStr;
  title: SoftStr;
  close: Option<SoftStr>;
  body: ReadonlyArray<Html<Msg>>;
}>;

const activeAdd = (
  section: SearchableSection,
  model: Model,
): boolean => {
  switch (section) {
    case "clients":
      return model.clientForm.open;
    case "projects":
      return model.projectForm.open;
  }
};

const currentUrl = (model: Model): Url => {
  const base = scheduled.toUrl(model.scheduled);
  return matchOption<SearchableSection, Url>(
    () => withoutAppParams(base),
    (section: SearchableSection) =>
      activeAdd(section, model)
        ? withAdd(section, base)
        : model.search.open
          ? model.search.submitted
            ? withSubmittedSearch(
                base,
                model.search,
              )
            : withSearch(base)
          : withoutAppParams(base),
  )(sectionOfUrl(base));
};

const hasSelection = (url: Url): boolean =>
  matchOption<SoftStr, boolean>(
    () => false,
    () => true,
  )(fromNullable(new URLSearchParams(url.search).get("p")));

const selectedId = (url: Url): Option<SoftStr> =>
  fromNullable(new URLSearchParams(url.search).get("p"));

const menuItem = (
  label: SoftStr,
  to: SoftStr,
  active: boolean,
): Html<Msg, "li"> =>
  li(
    [],
    [
      a(
        [
          href(to),
          ...(active
            ? [attr("aria-current", "page")]
            : []),
        ],
        [text(label)],
      ),
    ],
  );

const sectionSubMenu = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SearchableSection,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SearchableSection) => {
      const title = titleOfSection(section);
      return [
        {
          key: `${section}-submenu`,
          title: `${title} Menu`,
          close: some(
            hrefOf({ path: url.path, search: "" }),
          ),
          body: [
            slot(
              [attr("class", "pm-menu-body")],
              [
                ul(
                  [],
                  [
                    menuItem(
                      `Add ${title}`,
                      hrefOf(
                        withAdd(
                          section,
                          withoutSelection(url),
                        ),
                      ),
                      activeAdd(section, model),
                    ),
                    menuItem(
                      `Search ${title}`,
                      hrefOf(
                        withSearch(
                          withoutSelection(url),
                        ),
                      ),
                      model.search.open,
                    ),
                  ],
                ),
              ],
            ),
          ],
        },
      ];
    },
  )(sectionOfUrl(url));
};

const clientFormFields = (
  model: Model,
): ReadonlyArray<Flow<Msg>> => [
  textInput<Msg>({
    name: "name",
    label: "Name",
    value: model.clientForm.nameDraft,
    placeholder: some("Client name"),
    error: errorFor(model.clientForm.errors, "name"),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "clientNameInput",
      value,
    }),
  }),
  selectInput<Msg>({
    name: "status",
    label: "Status",
    value: model.clientForm.statusDraft,
    options: clientStatuses.map((status) => ({
      value: status,
      label: status,
    })),
    error: errorFor(
      model.clientForm.errors,
      "status",
    ),
    disabled: false,
    onChange: (value: SoftStr) => ({
      kind: "clientStatusInput",
      value,
    }),
  }),
  textInput<Msg>({
    name: "since",
    label: "Since",
    value: model.clientForm.sinceDraft,
    placeholder: some("2026"),
    error: errorFor(model.clientForm.errors, "since"),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "clientSinceInput",
      value,
    }),
  }),
  textInput<Msg>({
    name: "contact",
    label: "Contact",
    value: model.clientForm.contactDraft,
    placeholder: some("Name, department"),
    error: errorFor(
      model.clientForm.errors,
      "contact",
    ),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "clientContactInput",
      value,
    }),
  }),
  textArea<Msg>({
    name: "notes",
    label: "Notes",
    value: model.clientForm.notesDraft,
    placeholder: some("Optional notes"),
    error: errorFor(model.clientForm.errors, "notes"),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "clientNotesInput",
      value,
    }),
  }),
];

const projectFormFields = (
  model: Model,
): ReadonlyArray<Flow<Msg>> => [
  textInput<Msg>({
    name: "name",
    label: "Name",
    value: model.projectForm.nameDraft,
    placeholder: some("Project name"),
    error: errorFor(model.projectForm.errors, "name"),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "projectNameInput",
      value,
    }),
  }),
  textInput<Msg>({
    name: "client",
    label: "Client",
    value: model.projectForm.clientDraft,
    placeholder: some("Client name"),
    error: errorFor(
      model.projectForm.errors,
      "client",
    ),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "projectClientInput",
      value,
    }),
  }),
  selectInput<Msg>({
    name: "contract",
    label: "Contract",
    value: model.projectForm.contractDraft,
    options: projectContracts.map((contract) => ({
      value: contract,
      label: contract,
    })),
    error: errorFor(
      model.projectForm.errors,
      "contract",
    ),
    disabled: false,
    onChange: (value: SoftStr) => ({
      kind: "projectContractInput",
      value,
    }),
  }),
  selectInput<Msg>({
    name: "status",
    label: "Status",
    value: model.projectForm.statusDraft,
    options: projectStatuses.map((status) => ({
      value: status,
      label: status,
    })),
    error: errorFor(
      model.projectForm.errors,
      "status",
    ),
    disabled: false,
    onChange: (value: SoftStr) => ({
      kind: "projectStatusInput",
      value,
    }),
  }),
  textInput<Msg>({
    name: "period",
    label: "Period",
    value: model.projectForm.periodDraft,
    placeholder: some("2026-04 - 2026-09"),
    error: errorFor(
      model.projectForm.errors,
      "period",
    ),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "projectPeriodInput",
      value,
    }),
  }),
  textInput<Msg>({
    name: "budget",
    label: "Budget",
    value: model.projectForm.budgetDraft,
    placeholder: some("¥8.4M"),
    error: errorFor(
      model.projectForm.errors,
      "budget",
    ),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "projectBudgetInput",
      value,
    }),
  }),
  textInput<Msg>({
    name: "lead",
    label: "Lead",
    value: model.projectForm.leadDraft,
    placeholder: some("Aoki"),
    error: errorFor(model.projectForm.errors, "lead"),
    disabled: false,
    onInput: (value: SoftStr) => ({
      kind: "projectLeadInput",
      value,
    }),
  }),
];

const formFields = (
  section: SearchableSection,
  model: Model,
): ReadonlyArray<Flow<Msg>> => {
  switch (section) {
    case "clients":
      return clientFormFields(model);
    case "projects":
      return projectFormFields(model);
  }
};

const formSubmit = (
  section: SearchableSection,
): Msg => {
  switch (section) {
    case "clients":
      return { kind: "clientFormSubmit" };
    case "projects":
      return { kind: "projectFormSubmit" };
  }
};

const addFormColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SearchableSection,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SearchableSection) => {
      if (!activeAdd(section, model)) {
        return [];
      }
      const title = titleOfSection(section);
      return [
        {
          key: `add-${singularOf(section)}`,
          title: `Add ${title}`,
          close: some(
            hrefOf(
              withSearch(
                withoutSelection(url),
              ),
            ),
          ),
          body: [
            formView<Msg>({
              fields: formFields(section, model),
              submitLabel: `Register ${singularOf(
                section,
              )}`,
              submitting: false,
              onSubmit: formSubmit(section),
            }),
            slot(
              [attr("class", "pm-actions")],
              [
                a(
                  [
                    href(
                      hrefOf(
                        withSearch(
                          withoutSelection(
                            scheduled.toUrl(
                              model.scheduled,
                            ),
                          ),
                        ),
                      ),
                    ),
                    attr("class", "pm-btn"),
                    attr("aria-label", "Cancel"),
                  ],
                  [text("Cancel")],
                ),
              ],
            ),
          ],
        },
      ];
    },
  )(sectionOfUrl(url));
};

const searchStatusOptions = (
  section: SearchableSection,
) => [
  { value: "Any", label: "Any" },
  ...statusesOf(section).map((status) => ({
    value: status,
    label: status,
  })),
];

const searchConditionColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SearchableSection,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SearchableSection) =>
      model.search.open && !hasSelection(url)
        ? [
            {
              key: `${section}-search-condition`,
              title: "Search Condition",
              close: some(
                hrefOf(withoutAppParams(url)),
              ),
              body: [
                slot(
                  [
                    attr(
                      "class",
                      "bo-search-condition",
                    ),
                  ],
                  [
                    formView<Msg>({
                      fields: [
                        textInput<Msg>({
                          name: "keyword",
                          label: "Keyword",
                          value:
                            model.search
                              .keywordDraft,
                          placeholder:
                            some("Keyword"),
                          error: none(),
                          disabled: false,
                          onInput: (
                            value: SoftStr,
                          ) => ({
                            kind:
                              "searchKeywordInput",
                            value,
                          }),
                        }),
                        selectInput<Msg>({
                          name: "status",
                          label: "Status",
                          value:
                            model.search
                              .statusDraft,
                          options:
                            searchStatusOptions(
                              section,
                            ),
                          error: none(),
                          disabled: false,
                          onChange: (
                            value: SoftStr,
                          ) => ({
                            kind:
                              "searchStatusInput",
                            value,
                          }),
                        }),
                      ],
                      submitLabel: "Search",
                      submitting: false,
                      onSubmit: {
                        kind: "searchFormSubmit",
                      },
                    }),
                  ],
                ),
              ],
            },
          ]
        : [],
  )(sectionOfUrl(url));
};

type SearchResult = Readonly<{
  id: SoftStr;
  label: SoftStr;
  status: SoftStr;
  secondary: SoftStr;
}>;

const searchRows = (
  section: SearchableSection,
): ReadonlyArray<SearchResult> => {
  switch (section) {
    case "clients":
      return clients.map((client: Client) => ({
        id: client.id,
        label: client.name,
        status: client.status,
        secondary: `${client.status} · ${client.contact}`,
      }));
    case "projects":
      return projects.map((project: Project) => ({
        id: project.id,
        label: project.name,
        status: project.status,
        secondary: `${project.status} · ${project.client}`,
      }));
  }
};

const filteredResults = (
  section: SearchableSection,
  form: SearchForm,
): ReadonlyArray<SearchResult> => {
  const keyword = form.keyword
    .trim()
    .toLowerCase();
  return searchRows(section).filter(
    (row: SearchResult) =>
      (keyword === "" ||
        row.label
          .toLowerCase()
          .includes(keyword)) &&
      (form.status === "Any" ||
        row.status === form.status),
  );
};

const resultsList = (
  rows: ReadonlyArray<SearchResult>,
  url: Url,
): Html<Msg> =>
  ul(
    [attr("class", "pm-list")],
    rows.map((row: SearchResult) =>
      li(
        [attr("class", "pm-list-item")],
        [
          a(
            [
              href(resultHref(url, row.id)),
              attr("class", "pm-row-link"),
              ...matchOption<
                SoftStr,
                ReadonlyArray<
                  ReturnType<typeof attr>
                >
              >(
                () => [],
                (id: SoftStr) =>
                  id === row.id
                    ? [attr("aria-current", "page")]
                    : [],
              )(selectedId(url)),
            ],
            [
              span(
                [attr("class", "bo-result-name")],
                [text(row.label)],
              ),
              span(
                [attr("class", "bo-result-meta")],
                [text(row.secondary)],
              ),
            ],
          ),
        ],
      ),
    ),
  );

const searchResultsColumn = (
  model: Model,
): ReadonlyArray<AppColumn> => {
  const url = currentUrl(model);
  return matchOption<
    SearchableSection,
    ReadonlyArray<AppColumn>
  >(
    () => [],
    (section: SearchableSection) =>
      model.search.open && model.search.submitted
        ? [
            {
              key: `${section}-search-results`,
              title: "Results",
              close: some(
                hrefOf(withoutSelection(url)),
              ),
              body: [
                slot(
                  [attr("class", "bo-results")],
                  [
                    resultsList(
                      filteredResults(
                        section,
                        model.search,
                      ),
                      url,
                    ),
                  ],
                ),
              ],
            },
          ]
        : [],
  )(sectionOfUrl(url));
};

const appColumns = (
  model: Model,
): ReadonlyArray<AppColumn> => [
  ...addFormColumn(model),
  ...searchConditionColumn(model),
  ...searchResultsColumn(model),
];

export const makeApp = (
  initial: Scheme,
): Application<
  Model,
  Msg
> => ({
  init: (url: Url) => {
    const [scheduledModel, cmd] =
      scheduled.init(url);
    return [
      {
        scheme: initial,
        scheduled: scheduledModel,
        clientForm: emptyClientForm(
          isAddUrl("clients", url),
        ),
        projectForm: emptyProjectForm(
          isAddUrl("projects", url),
        ),
        search: searchFormFromUrl(url),
      },
      mapSchedulerCmd(cmd),
    ];
  },
  update: (msg: Msg, model: Model) => {
    switch (msg.kind) {
      case "scheduler": {
        const [next, cmd] = scheduled.update(
          msg.msg,
          model.scheduled,
        );
        return [
          { ...model, scheduled: next },
          mapSchedulerCmd(cmd),
        ];
      }
      case "toggleScheme": {
        const scheme = flip(model.scheme);
        return [
          { ...model, scheme },
          applySchemeEffect(scheme),
        ];
      }
      case "schemeApplied":
        return [model, cmdNone()];
      case "urlChanged": {
        const [next, cmd] = scheduled.update(
          scheduled.onUrlChange(msg.url),
          model.scheduled,
        );
        return [
          {
            ...model,
            scheduled: next,
            clientForm: emptyClientForm(
              isAddUrl("clients", msg.url),
            ),
            projectForm: emptyProjectForm(
              isAddUrl("projects", msg.url),
            ),
            search: searchFormFromUrl(msg.url),
          },
          mapSchedulerCmd(cmd),
        ];
      }
      case "clientNameInput":
        return [
          {
            ...model,
            clientForm: updateClientForm(
              model.clientForm,
              { nameDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "clientStatusInput":
        return [
          {
            ...model,
            clientForm: updateClientForm(
              model.clientForm,
              { statusDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "clientSinceInput":
        return [
          {
            ...model,
            clientForm: updateClientForm(
              model.clientForm,
              { sinceDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "clientContactInput":
        return [
          {
            ...model,
            clientForm: updateClientForm(
              model.clientForm,
              { contactDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "clientNotesInput":
        return [
          {
            ...model,
            clientForm: updateClientForm(
              model.clientForm,
              { notesDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "clientFormSubmit":
        return matchResult<
          Readonly<Record<string, Datum>>,
          FormErrors,
          readonly [Model, Cmd<Msg>]
        >(
          (errors: FormErrors) => [
            {
              ...model,
              clientForm: updateClientForm(
                model.clientForm,
                { errors },
              ),
            },
            cmdNone(),
          ],
          (payload) => {
            const client = makeClient(payload);
            clients = [...clients, client];
            const [next, cmd] =
              selectCreatedClient(
                model.scheduled,
                client.id,
              );
            return [
              {
                ...model,
                scheduled: next,
                clientForm: emptyClientForm(false),
                projectForm:
                  emptyProjectForm(false),
                search: emptySearchForm(
                  false,
                  false,
                  "",
                  "Any",
                ),
              },
              cmd,
            ];
          },
        )(parseClientForm(model.clientForm));
      case "projectNameInput":
        return [
          {
            ...model,
            projectForm: updateProjectForm(
              model.projectForm,
              { nameDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "projectClientInput":
        return [
          {
            ...model,
            projectForm: updateProjectForm(
              model.projectForm,
              { clientDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "projectContractInput":
        return [
          {
            ...model,
            projectForm: updateProjectForm(
              model.projectForm,
              { contractDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "projectStatusInput":
        return [
          {
            ...model,
            projectForm: updateProjectForm(
              model.projectForm,
              { statusDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "projectPeriodInput":
        return [
          {
            ...model,
            projectForm: updateProjectForm(
              model.projectForm,
              { periodDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "projectBudgetInput":
        return [
          {
            ...model,
            projectForm: updateProjectForm(
              model.projectForm,
              { budgetDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "projectLeadInput":
        return [
          {
            ...model,
            projectForm: updateProjectForm(
              model.projectForm,
              { leadDraft: msg.value },
            ),
          },
          cmdNone(),
        ];
      case "projectFormSubmit":
        return matchResult<
          Readonly<Record<string, Datum>>,
          FormErrors,
          readonly [Model, Cmd<Msg>]
        >(
          (errors: FormErrors) => [
            {
              ...model,
              projectForm: updateProjectForm(
                model.projectForm,
                { errors },
              ),
            },
            cmdNone(),
          ],
          (payload) => {
            const project = makeProject(payload);
            projects = [...projects, project];
            const [next, cmd] =
              selectCreatedProject(
                model.scheduled,
                project.id,
              );
            return [
              {
                ...model,
                scheduled: next,
                clientForm: emptyClientForm(false),
                projectForm:
                  emptyProjectForm(false),
                search: emptySearchForm(
                  false,
                  false,
                  "",
                  "Any",
                ),
              },
              cmd,
            ];
          },
        )(parseProjectForm(model.projectForm));
      case "searchKeywordInput":
        return [
          {
            ...model,
            search: {
              ...model.search,
              keywordDraft: msg.value,
              submitted: false,
            },
          },
          cmdNone(),
        ];
      case "searchStatusInput":
        return [
          {
            ...model,
            search: {
              ...model.search,
              statusDraft: msg.value,
              submitted: false,
            },
          },
          cmdNone(),
        ];
      case "searchFormSubmit":
        return [
          {
            ...model,
            clientForm: emptyClientForm(false),
            projectForm: emptyProjectForm(false),
            search: {
              ...model.search,
              open: true,
              submitted: true,
              keyword: model.search.keywordDraft,
              status: model.search.statusDraft,
            },
          },
          cmdNone(),
        ];
    }
  },
  view: (
    model: Model,
  ): Html<Msg> => {
    const scene = scheduled.scene(model.scheduled);
    const params = new URLSearchParams(
      currentUrl(model).search,
    );
    const inSearchable = matchOption<
      SearchableSection,
      boolean
    >(
      () => false,
      () => true,
    )(
      matchOption<
        SoftStr,
        Option<SearchableSection>
      >(
        () => none(),
        searchableSectionOf,
      )(fromNullable(params.get("c"))),
    );
    // Searchable sections hide the scheduler's native
    // list; the app-owned submenu/search/results columns
    // are the section's visible navigation surface.
    const hideList = inSearchable;
    const rootClass =
      "bo-root" +
      (model.clientForm.open ||
      model.projectForm.open
        ? " bo-adding"
        : "") +
      (hideList ? " bo-hidelist" : "");
    return slot(
      [attr("class", rootClass)],
      [
        slot(
          [attr("class", "bo-topbar")],
          [
            slot(
              [attr("class", "bo-navleft")],
              [
                span(
                  [attr("class", "bo-brand")],
                  [text("DevDesk")],
                ),
              ],
            ),
            themeToggle<Msg>({
              scheme: model.scheme,
              toggle: { kind: "toggleScheme" },
            }),
          ],
        ),
        multiColumnWith<Msg>(
          scene,
          {
            mapMsg: (msg: SchedulerMsg) => ({
              kind: "scheduler",
              msg,
            }),
            omitBreadcrumb: true,
            afterMenu: [
              ...sectionSubMenu(model),
              ...appColumns(model),
            ],
          },
        ),
      ],
    );
  },
  onUrlChange: (url: Url): Msg => ({
    kind: "urlChanged",
    url,
  }),
  toUrl: (model: Model): Url => {
    return currentUrl(model);
  },
});

/** The default app (light) — existing specs/imports use it. */
export const app: Application<Model, Msg> =
  makeApp("light");
