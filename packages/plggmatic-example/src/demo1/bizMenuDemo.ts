import { type SoftStr } from "plgg";
import {
  type Html,
  slot,
  attr,
} from "plgg-view";
import { type Application } from "plgg-view/client";
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
  multiColumn,
} from "plggmatic";

/**
 * Demo 1 — a business-management system for a CONTRACT
 * software-development company (受託開発), grown from a
 * declaration.
 *
 * Step 1 laid out the eight-section MENU from scratch.
 * Step 2 brings the **Projects** section to life: a
 * filterable list whose rows carry a full project record,
 * shown as a detail view on select — still pure
 * declaration (`collection` + `query` + detail `field`s),
 * no hand-written `Model`/`Msg`/`update`/router. The other
 * seven sections stay placeholder lists until later steps.
 *
 * (The scheduler shows a collection's own detail ONLY when
 * it has no `child` — a `child` drills to a sub-list
 * instead. A project is a RECORD, so Projects is a leaf and
 * selecting one shows its fields; a per-project task/
 * milestone drill is a later step, and the multi-level
 * drill itself is already demonstrated by demo 3 and the
 * workbench.)
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

// --- The other seven sections: step-1 placeholder lists ---
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
    id: "clients",
    title: "Clients",
    rows: [
      [
        "acme-co",
        "ACME Retail K.K.",
        "Prime contract since 2024.",
      ],
      [
        "beacon-co",
        "Beacon Financial",
        "MSA in place.",
      ],
      [
        "cobalt-co",
        "Cobalt Labs",
        "New this quarter.",
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
  title: "Contract Ops",
  menu: menu(
    MENU.map(([id, label]) =>
      menuEntry(label, id),
    ),
  ),
  collections: [
    ...STUBS.map(stubCollection),
    projectsCollection,
  ],
});

/**
 * The scheduled program — exported so the spec can assert
 * the derived URL codec (`toUrl`) directly.
 */
export const scheduled = schedule(declaration);

/** The wired program the client entry mounts. */
export const app: Application<
  ScheduledModel,
  SchedulerMsg
> = {
  ...scheduled,
  // The multi-column chrome brands the app via the
  // breadcrumb root and the menu header (both the
  // declaration `title`), so no separate wordmark — a fixed
  // overlay would only collide with the breadcrumb.
  view: (
    model: ScheduledModel,
  ): Html<SchedulerMsg> =>
    slot(
      [attr("class", "bo-root")],
      [multiColumn(scheduled.scene(model))],
    ),
};
