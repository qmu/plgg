import { type SoftStr } from "plgg";
import {
  type Collection,
  type Declaration,
  collection,
  sync,
  dynamic,
  query,
  makeRow,
  field,
  menu,
  menuEntry,
  declare,
  schedule,
} from "plggmatic";
import {
  type Project,
  type Client,
  type SearchableSection,
} from "./records.ts";

// --- The menu: all eight top-level sections ---
export const MENU: ReadonlyArray<
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
// The record TYPES + immutable SEED live in `records.ts`;
// the live records live in the app Model. `projectRow`
// projects one to a scheduler Row — used both for the
// detail view and to feed the `dynamic` source through
// `scheduled.withRows`, so no module store is needed.
export const projectRow = (p: Project) =>
  makeRow(p.id, p.name, [
    field("Client", p.client),
    field("Contract", p.contract),
    field("Status", p.status),
    field("Period", p.period),
    field("Budget", p.budget),
    field("Lead", p.lead),
  ]);

export const projectsCollection: Collection =
  collection<Project>({
    id: "projects",
    title: "Projects",
    toRow: projectRow,
    source: dynamic<Project>(),
    query: query("Filter projects"),
  });

// --- Clients: the second real section (filterable + detail) ---
export const clientStatuses: ReadonlyArray<SoftStr> =
  ["Prospect", "Active", "Prime"];

export const projectStatuses: ReadonlyArray<SoftStr> =
  [
    "In progress",
    "Scoping",
    "On hold",
    "Delivered",
  ];

export const projectContracts: ReadonlyArray<SoftStr> =
  ["Fixed-price", "T&M"];

export const clientRow = (c: Client) =>
  makeRow(c.id, c.name, [
    field("Status", c.status),
    field("Since", c.since),
    field("Contact", c.contact),
    field("Projects", c.projects),
    field("Notes", c.notes),
  ]);

export const clientsCollection: Collection =
  collection<Client>({
    id: "clients",
    title: "Clients",
    toRow: clientRow,
    source: dynamic<Client>(),
    query: query("Filter clients"),
  });

// --- The other six sections: step-1 placeholder lists ---
export type Stub = Readonly<{
  id: SoftStr;
  title: SoftStr;
  rows: ReadonlyArray<
    readonly [SoftStr, SoftStr, SoftStr]
  >;
}>;

export const STUBS: ReadonlyArray<Stub> = [
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

export const stubCollection = (
  s: Stub,
): Collection =>
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
export const singularOf = (
  section: SearchableSection,
): SoftStr => {
  switch (section) {
    case "clients":
      return "client";
    case "projects":
      return "project";
  }
};

export const titleOfSection = (
  section: SearchableSection,
): SoftStr => {
  switch (section) {
    case "clients":
      return "Client";
    case "projects":
      return "Project";
  }
};

export const statusesOf = (
  section: SearchableSection,
): ReadonlyArray<SoftStr> => {
  switch (section) {
    case "clients":
      return clientStatuses;
    case "projects":
      return projectStatuses;
  }
};
