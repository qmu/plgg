import {
  type SoftStr,
  type Datum,
  type Result,
  type InvalidError,
  type Option,
  some,
  match,
  matchResult,
  ok,
  err,
  invalidError,
} from "plgg";
import { type Html, slot, attr } from "plgg-view";
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
  openMenu,
  select,
} from "plggmatic";

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

const projects: ReadonlyArray<Project> = [
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

const projectsCollection: Collection =
  collection<Project>({
    id: "projects",
    title: "Projects",
    toRow: (p: Project) =>
      makeRow(p.id, p.name, [
        field("Client", p.client),
        field("Contract", p.contract),
        field("Status", p.status),
        field("Period", p.period),
        field("Budget", p.budget),
        field("Lead", p.lead),
      ]),
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
  title: "DevDesk",
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

export type Model = Readonly<{
  scheduled: ScheduledModel;
  clientForm: ClientForm;
}>;

export type Msg =
  | Readonly<{
      kind: "scheduler";
      msg: SchedulerMsg;
    }>
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
  | Readonly<{ kind: "clientFormSubmit" }>;

const emptyClientForm = (open: boolean): ClientForm => ({
  open,
  nameDraft: "",
  statusDraft: "Prospect",
  sinceDraft: "2026",
  contactDraft: "",
  notesDraft: "",
  errors: [],
});

const isAddClientUrl = (url: Url): boolean =>
  new URLSearchParams(url.search).get("add") ===
  "client";

const searchString = (
  params: URLSearchParams,
): SoftStr => {
  const s = params.toString();
  return s === "" ? "" : `?${s}`;
};

const withAddClient = (url: Url): Url => {
  const params = new URLSearchParams(url.search);
  params.set("add", "client");
  return {
    path: url.path,
    search: searchString(params),
  };
};

const withoutAddClient = (url: Url): Url => {
  const params = new URLSearchParams(url.search);
  params.delete("add");
  return {
    path: url.path,
    search: searchString(params),
  };
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

const draftOf =
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
    draftOf(form),
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

const updateClientForm = (
  form: ClientForm,
  patch: Partial<ClientForm>,
): ClientForm => ({
  ...form,
  ...patch,
});

const clientFormColumn = (
  model: Model,
): ReadonlyArray<{
  key: SoftStr;
  title: SoftStr;
  close: Option<SoftStr>;
  body: ReadonlyArray<Html<Msg>>;
}> =>
  model.clientForm.open
    ? [
        {
          key: "add-client",
          title: "Add client",
          close: some(
            hrefOf(
              withoutAddClient(
                scheduled.toUrl(model.scheduled),
              ),
            ),
          ),
          body: [
            formView<Msg>({
              fields: [
                textInput<Msg>({
                  name: "name",
                  label: "Name",
                  value: model.clientForm.nameDraft,
                  placeholder: some("Client name"),
                  error: errorFor(
                    model.clientForm.errors,
                    "name",
                  ),
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
                  options: [
                    {
                      value: "Prospect",
                      label: "Prospect",
                    },
                    {
                      value: "Active",
                      label: "Active",
                    },
                    {
                      value: "Prime",
                      label: "Prime",
                    },
                  ],
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
                  error: errorFor(
                    model.clientForm.errors,
                    "since",
                  ),
                  disabled: false,
                  onInput: (value: SoftStr) => ({
                    kind: "clientSinceInput",
                    value,
                  }),
                }),
                textInput<Msg>({
                  name: "contact",
                  label: "Contact",
                  value:
                    model.clientForm.contactDraft,
                  placeholder: some(
                    "Name, department",
                  ),
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
                  error: errorFor(
                    model.clientForm.errors,
                    "notes",
                  ),
                  disabled: false,
                  onInput: (value: SoftStr) => ({
                    kind: "clientNotesInput",
                    value,
                  }),
                }),
              ],
              submitLabel: "Register client",
              submitting: false,
              onSubmit: { kind: "clientFormSubmit" },
            }),
          ],
        },
      ]
    : [];

/** The wired program the client entry mounts. */
export const app: Application<
  Model,
  Msg
> = {
  init: (url: Url) => {
    const [scheduledModel, cmd] =
      scheduled.init(url);
    return [
      {
        scheduled: scheduledModel,
        clientForm: emptyClientForm(
          isAddClientUrl(url),
        ),
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
      case "urlChanged": {
        const [next, cmd] = scheduled.update(
          scheduled.onUrlChange(msg.url),
          model.scheduled,
        );
        return [
          {
            scheduled: next,
            clientForm: emptyClientForm(
              isAddClientUrl(msg.url),
            ),
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
                scheduled: next,
                clientForm: emptyClientForm(false),
              },
              cmd,
            ];
          },
        )(parseClientForm(model.clientForm));
    }
  },
  view: (
    model: Model,
  ): Html<Msg> =>
    slot(
      [attr("class", "bo-root")],
      [
        multiColumnWith<Msg>(
          scheduled.scene(model.scheduled),
          {
            mapMsg: (msg: SchedulerMsg) => ({
              kind: "scheduler",
              msg,
            }),
            headerLinks: [
              {
                collection: "clients",
                label: "Add client",
                href: hrefOf(
                  withAddClient(
                    scheduled.toUrl(
                      model.scheduled,
                    ),
                  ),
                ),
              },
            ],
            extraColumns: clientFormColumn(model),
          },
        ),
      ],
    ),
  onUrlChange: (url: Url): Msg => ({
    kind: "urlChanged",
    url,
  }),
  toUrl: (model: Model): Url =>
    model.clientForm.open
      ? withAddClient(
          scheduled.toUrl(model.scheduled),
        )
      : scheduled.toUrl(model.scheduled),
};
