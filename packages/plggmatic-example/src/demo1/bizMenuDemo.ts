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

// --- One descriptor drives both live record sections ---
// `clients` and `projects` share every form, draft, parse,
// and submit code path; only their field list and record
// shape differ. A `SectionField` list per section is the
// single source those paths read from, replacing the two
// hand-written parallel blocks.
type SectionFieldKind =
  "text" | "textarea" | "select";

type FieldInputKind =
  | "clientNameInput"
  | "clientStatusInput"
  | "clientSinceInput"
  | "clientContactInput"
  | "clientNotesInput"
  | "projectNameInput"
  | "projectClientInput"
  | "projectContractInput"
  | "projectStatusInput"
  | "projectPeriodInput"
  | "projectBudgetInput"
  | "projectLeadInput";

type SectionField = Readonly<{
  name: SoftStr;
  label: SoftStr;
  kind: SectionFieldKind;
  placeholder: SoftStr;
  options: ReadonlyArray<SoftStr>;
  required: boolean;
  initial: SoftStr;
  input: FieldInputKind;
}>;

const clientFields: ReadonlyArray<SectionField> =
  [
    {
      name: "name",
      label: "Name",
      kind: "text",
      placeholder: "Client name",
      options: [],
      required: true,
      initial: "",
      input: "clientNameInput",
    },
    {
      name: "status",
      label: "Status",
      kind: "select",
      placeholder: "",
      options: clientStatuses,
      required: true,
      initial: "Prospect",
      input: "clientStatusInput",
    },
    {
      name: "since",
      label: "Since",
      kind: "text",
      placeholder: "2026",
      options: [],
      required: true,
      initial: "2026",
      input: "clientSinceInput",
    },
    {
      name: "contact",
      label: "Contact",
      kind: "text",
      placeholder: "Name, department",
      options: [],
      required: true,
      initial: "",
      input: "clientContactInput",
    },
    {
      name: "notes",
      label: "Notes",
      kind: "textarea",
      placeholder: "Optional notes",
      options: [],
      required: false,
      initial: "",
      input: "clientNotesInput",
    },
  ];

const projectFields: ReadonlyArray<SectionField> =
  [
    {
      name: "name",
      label: "Name",
      kind: "text",
      placeholder: "Project name",
      options: [],
      required: true,
      initial: "",
      input: "projectNameInput",
    },
    {
      name: "client",
      label: "Client",
      kind: "text",
      placeholder: "Client name",
      options: [],
      required: false,
      initial: "",
      input: "projectClientInput",
    },
    {
      name: "contract",
      label: "Contract",
      kind: "select",
      placeholder: "",
      options: projectContracts,
      required: true,
      initial: "Fixed-price",
      input: "projectContractInput",
    },
    {
      name: "status",
      label: "Status",
      kind: "select",
      placeholder: "",
      options: projectStatuses,
      required: true,
      initial: "In progress",
      input: "projectStatusInput",
    },
    {
      name: "period",
      label: "Period",
      kind: "text",
      placeholder: "2026-04 - 2026-09",
      options: [],
      required: false,
      initial: "",
      input: "projectPeriodInput",
    },
    {
      name: "budget",
      label: "Budget",
      kind: "text",
      placeholder: "¥8.4M",
      options: [],
      required: false,
      initial: "",
      input: "projectBudgetInput",
    },
    {
      name: "lead",
      label: "Lead",
      kind: "text",
      placeholder: "Aoki",
      options: [],
      required: false,
      initial: "",
      input: "projectLeadInput",
    },
  ];

const fieldsOf = (
  section: SearchableSection,
): ReadonlyArray<SectionField> => {
  switch (section) {
    case "clients":
      return clientFields;
    case "projects":
      return projectFields;
  }
};

// The inverse of the field descriptors: which section and
// field a flat field-input message targets. Derived from
// the field lists so each input kind lives in one place.
const targetOf = (
  kind: FieldInputKind,
): Readonly<{
  section: SearchableSection;
  field: SoftStr;
}> => {
  const section: SearchableSection =
    clientFields.some(
      (f: SectionField) => f.input === kind,
    )
      ? "clients"
      : "projects";
  return {
    section,
    field: matchOption<SectionField, SoftStr>(
      () => "",
      (f: SectionField) => f.name,
    )(
      fromNullable(
        fieldsOf(section).find(
          (f: SectionField) => f.input === kind,
        ),
      ),
    ),
  };
};

// One form shape for both sections; drafts keyed by field
// name replace the per-record named draft fields.
type SectionForm = Readonly<{
  open: boolean;
  drafts: Readonly<Record<string, SoftStr>>;
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
  clientForm: SectionForm;
  projectForm: SectionForm;
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
  // The 12 per-field input messages collapse to one
  // shape discriminated by `FieldInputKind`; the frozen
  // spec still constructs each kind via `satisfies Msg`,
  // so the kind vocabulary stays while the logic unifies.
  | Readonly<{
      kind: FieldInputKind;
      value: SoftStr;
    }>
  | Readonly<{ kind: "clientFormSubmit" }>
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

const emptySectionForm = (
  section: SearchableSection,
  open: boolean,
): SectionForm => ({
  open,
  drafts: Object.fromEntries(
    fieldsOf(section).map(
      (
        f: SectionField,
      ): readonly [SoftStr, SoftStr] => [
        f.name,
        f.initial,
      ],
    ),
  ),
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
  matchOption<SoftStr, Option<SearchableSection>>(
    () => none(),
    searchableSectionOf,
  )(
    fromNullable(
      new URLSearchParams(url.search).get("c"),
    ),
  );

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

// === URL codec ===
// The scheduler owns `c` (section) and `p` (selection); the
// app owns an overlay of `add`/`search`/`submitted`/`kw`/
// `st` printed on top. Every raw param key is confined to
// this cluster — the rest of the app speaks in typed stages
// (`AppLayer`), never param strings.

// The app-owned overlay as a typed stage, layered on the
// scheduler's base URL. `menu` carries no app params (the
// list/detail/stub view); `add` opens a register form;
// `searchOpen`/`searchSubmitted` are the two search stages.
type AppLayer =
  | Readonly<{ kind: "menu" }>
  | Readonly<{
      kind: "add";
      section: SearchableSection;
    }>
  | Readonly<{ kind: "searchOpen" }>
  | Readonly<{
      kind: "searchSubmitted";
      keyword: SoftStr;
      status: SoftStr;
    }>;

const paramOr = (
  params: URLSearchParams,
  name: SoftStr,
  fallback: SoftStr,
): SoftStr =>
  matchOption<SoftStr, SoftStr>(
    () => fallback,
    (value: SoftStr) => value,
  )(fromNullable(params.get(name)));

// Which section, if any, an `add=<singular>` param names.
const addSectionOf = (
  url: Url,
): Option<SearchableSection> =>
  matchOption<SoftStr, Option<SearchableSection>>(
    () => none(),
    (singular: SoftStr) => {
      switch (singular) {
        case "client":
          return some("clients");
        case "project":
          return some("projects");
        default:
          return none();
      }
    },
  )(
    fromNullable(
      new URLSearchParams(url.search).get("add"),
    ),
  );

const isAddUrl = (
  section: SearchableSection,
  url: Url,
): boolean =>
  matchOption<SearchableSection, boolean>(
    () => false,
    (s: SearchableSection) => s === section,
  )(addSectionOf(url));

const searchFormFromUrl = (
  url: Url,
): SearchForm => {
  const params = new URLSearchParams(url.search);
  return emptySearchForm(
    params.get("search") === "1",
    params.get("submitted") === "1",
    paramOr(params, "kw", ""),
    paramOr(params, "st", "Any"),
  );
};

// Print an app overlay onto a base URL, preserving the
// scheduler's `c`/`p` and their order; app params are
// re-issued in a fixed order so links round-trip byte for
// byte. Stripping first then setting matches how the old
// per-stage helpers layered params.
const printAppLayer = (
  base: Url,
  layer: AppLayer,
): Url => {
  const params = new URLSearchParams(base.search);
  params.delete("add");
  params.delete("search");
  params.delete("submitted");
  params.delete("kw");
  params.delete("st");
  const finish = (): Url => ({
    path: base.path,
    search: searchString(params),
  });
  switch (layer.kind) {
    case "menu":
      return finish();
    case "add":
      params.set(
        "add",
        singularOf(layer.section),
      );
      return finish();
    case "searchOpen":
      params.set("search", "1");
      return finish();
    case "searchSubmitted":
      params.set("search", "1");
      params.set("submitted", "1");
      params.set("kw", layer.keyword);
      params.set("st", layer.status);
      return finish();
  }
};

// Drop the scheduler's selection (`p`) so an app column
// opens fresh — a form/search is never a 4th column beside
// a selected detail.
const dropSelection = (url: Url): Url => {
  const params = new URLSearchParams(url.search);
  params.delete("p");
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
  ok(
    typeof value === "string" ? value.trim() : "",
  );

const draftOf =
  (form: SectionForm) =>
  (name: SoftStr): SoftStr =>
    matchOption<SoftStr, SoftStr>(
      () => "",
      (value: SoftStr) => value,
    )(fromNullable(form.drafts[name]));

const slugId = (
  name: SoftStr,
  singular: SoftStr,
  counter: number,
): SoftStr => {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === ""
    ? `${singular}-${counter}`
    : `${slug}-${counter}`;
};

const parseSectionForm = (
  section: SearchableSection,
  form: SectionForm,
) =>
  parseForm(
    fieldsOf(section).map((f: SectionField) => ({
      name: f.name,
      cast: f.required
        ? asFilled
        : asOptionalText,
    })),
    draftOf(form),
  );

// Record construction is the one genuinely
// record-shaped step: the two types carry different
// fields, so each branch maps its own payload. The
// counter/append/id machinery around it is shared.
const commitRecord = (
  section: SearchableSection,
  payload: Readonly<Record<string, Datum>>,
): SoftStr => {
  switch (section) {
    case "clients": {
      clientCounter = clientCounter + 1;
      const name = `${payload.name}`;
      const client: Client = {
        id: slugId(name, "client", clientCounter),
        name,
        status: `${payload.status}`,
        since: `${payload.since}`,
        contact: `${payload.contact}`,
        projects: "No active projects",
        notes: `${payload.notes}`,
      };
      clients = [...clients, client];
      return client.id;
    }
    case "projects": {
      projectCounter = projectCounter + 1;
      const name = `${payload.name}`;
      const project: Project = {
        id: slugId(
          name,
          "project",
          projectCounter,
        ),
        name,
        client: `${payload.client}`,
        contract: `${payload.contract}`,
        status: `${payload.status}`,
        period: `${payload.period}`,
        budget: `${payload.budget}`,
        lead: `${payload.lead}`,
      };
      projects = [...projects, project];
      return project.id;
    }
  }
};

const selectCreated = (
  section: SearchableSection,
  scheduledModel: ScheduledModel,
  id: SoftStr,
): readonly [ScheduledModel, Cmd<Msg>] => {
  const [opened, openCmd] = scheduled.update(
    openMenu(section),
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

const formOf = (
  section: SearchableSection,
  model: Model,
): SectionForm => {
  switch (section) {
    case "clients":
      return model.clientForm;
    case "projects":
      return model.projectForm;
  }
};

const setForm = (
  section: SearchableSection,
  model: Model,
  form: SectionForm,
): Model => {
  switch (section) {
    case "clients":
      return { ...model, clientForm: form };
    case "projects":
      return { ...model, projectForm: form };
  }
};

const patchDraft = (
  section: SearchableSection,
  field: SoftStr,
  value: SoftStr,
  model: Model,
): Model => {
  const form = formOf(section, model);
  return setForm(section, model, {
    ...form,
    drafts: {
      ...form.drafts,
      [field]: value,
    },
  });
};

const submitSection = (
  section: SearchableSection,
  model: Model,
): readonly [Model, Cmd<Msg>] =>
  matchResult<
    Readonly<Record<string, Datum>>,
    FormErrors,
    readonly [Model, Cmd<Msg>]
  >(
    (errors: FormErrors) => [
      setForm(section, model, {
        ...formOf(section, model),
        errors,
      }),
      cmdNone(),
    ],
    (payload) => {
      const id = commitRecord(section, payload);
      const [next, cmd] = selectCreated(
        section,
        model.scheduled,
        id,
      );
      return [
        {
          ...model,
          scheduled: next,
          clientForm: emptySectionForm(
            "clients",
            false,
          ),
          projectForm: emptySectionForm(
            "projects",
            false,
          ),
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
  )(
    parseSectionForm(
      section,
      formOf(section, model),
    ),
  );

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

// The model's independent add/search/submitted flags
// collapse to the single app overlay the URL can hold, with
// add taking precedence over search.
const appLayerOf = (
  model: Model,
  section: SearchableSection,
): AppLayer =>
  activeAdd(section, model)
    ? { kind: "add", section }
    : model.search.open
      ? model.search.submitted
        ? {
            kind: "searchSubmitted",
            keyword: model.search.keyword,
            status: model.search.status,
          }
        : { kind: "searchOpen" }
      : { kind: "menu" };

const currentUrl = (model: Model): Url => {
  const base = scheduled.toUrl(model.scheduled);
  return matchOption<SearchableSection, Url>(
    () => printAppLayer(base, { kind: "menu" }),
    (section: SearchableSection) =>
      printAppLayer(
        base,
        appLayerOf(model, section),
      ),
  )(sectionOfUrl(base));
};

const hasSelection = (url: Url): boolean =>
  matchOption<SoftStr, boolean>(
    () => false,
    () => true,
  )(
    fromNullable(
      new URLSearchParams(url.search).get("p"),
    ),
  );

const selectedId = (url: Url): Option<SoftStr> =>
  fromNullable(
    new URLSearchParams(url.search).get("p"),
  );

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
            hrefOf({
              path: url.path,
              search: "",
            }),
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
                        printAppLayer(
                          dropSelection(url),
                          {
                            kind: "add",
                            section,
                          },
                        ),
                      ),
                      activeAdd(section, model),
                    ),
                    menuItem(
                      `Search ${title}`,
                      hrefOf(
                        printAppLayer(
                          dropSelection(url),
                          { kind: "searchOpen" },
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

const fieldInput = (
  field: SectionField,
  form: SectionForm,
): Flow<Msg> => {
  const value = draftOf(form)(field.name);
  const error = errorFor(form.errors, field.name);
  switch (field.kind) {
    case "text":
      return textInput<Msg>({
        name: field.name,
        label: field.label,
        value,
        placeholder: some(field.placeholder),
        error,
        disabled: false,
        onInput: (v: SoftStr) => ({
          kind: field.input,
          value: v,
        }),
      });
    case "textarea":
      return textArea<Msg>({
        name: field.name,
        label: field.label,
        value,
        placeholder: some(field.placeholder),
        error,
        disabled: false,
        onInput: (v: SoftStr) => ({
          kind: field.input,
          value: v,
        }),
      });
    case "select":
      return selectInput<Msg>({
        name: field.name,
        label: field.label,
        value,
        options: field.options.map(
          (o: SoftStr) => ({
            value: o,
            label: o,
          }),
        ),
        error,
        disabled: false,
        onChange: (v: SoftStr) => ({
          kind: field.input,
          value: v,
        }),
      });
  }
};

const formFields = (
  section: SearchableSection,
  model: Model,
): ReadonlyArray<Flow<Msg>> =>
  fieldsOf(section).map((field: SectionField) =>
    fieldInput(field, formOf(section, model)),
  );

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
              printAppLayer(dropSelection(url), {
                kind: "searchOpen",
              }),
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
                        printAppLayer(
                          dropSelection(
                            scheduled.toUrl(
                              model.scheduled,
                            ),
                          ),
                          { kind: "searchOpen" },
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
                hrefOf(
                  printAppLayer(url, {
                    kind: "menu",
                  }),
                ),
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
                            kind: "searchKeywordInput",
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
                            kind: "searchStatusInput",
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
                    ? [
                        attr(
                          "aria-current",
                          "page",
                        ),
                      ]
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
                hrefOf(dropSelection(url)),
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
): Application<Model, Msg> => ({
  init: (url: Url) => {
    const [scheduledModel, cmd] =
      scheduled.init(url);
    return [
      {
        scheme: initial,
        scheduled: scheduledModel,
        clientForm: emptySectionForm(
          "clients",
          isAddUrl("clients", url),
        ),
        projectForm: emptySectionForm(
          "projects",
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
            clientForm: emptySectionForm(
              "clients",
              isAddUrl("clients", msg.url),
            ),
            projectForm: emptySectionForm(
              "projects",
              isAddUrl("projects", msg.url),
            ),
            search: searchFormFromUrl(msg.url),
          },
          mapSchedulerCmd(cmd),
        ];
      }
      case "clientNameInput":
      case "clientStatusInput":
      case "clientSinceInput":
      case "clientContactInput":
      case "clientNotesInput":
      case "projectNameInput":
      case "projectClientInput":
      case "projectContractInput":
      case "projectStatusInput":
      case "projectPeriodInput":
      case "projectBudgetInput":
      case "projectLeadInput": {
        const target = targetOf(msg.kind);
        return [
          patchDraft(
            target.section,
            target.field,
            msg.value,
            model,
          ),
          cmdNone(),
        ];
      }
      case "clientFormSubmit":
        return submitSection("clients", model);
      case "projectFormSubmit":
        return submitSection("projects", model);
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
            clientForm: emptySectionForm(
              "clients",
              false,
            ),
            projectForm: emptySectionForm(
              "projects",
              false,
            ),
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
  view: (model: Model): Html<Msg> => {
    const scene = scheduled.scene(
      model.scheduled,
    );
    const inSearchable = matchOption<
      SearchableSection,
      boolean
    >(
      () => false,
      () => true,
    )(sectionOfUrl(currentUrl(model)));
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
        multiColumnWith<Msg>(scene, {
          mapMsg: (msg: SchedulerMsg) => ({
            kind: "scheduler",
            msg,
          }),
          omitBreadcrumb: true,
          afterMenu: [
            ...sectionSubMenu(model),
            ...appColumns(model),
          ],
        }),
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
