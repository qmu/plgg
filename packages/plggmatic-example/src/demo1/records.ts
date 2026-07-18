import {
  type SoftStr,
  type Option,
  fromNullable,
  matchOption,
} from "plgg";
import {
  type SectionId,
  type SectionRef,
  bySection,
  defOf,
  refsInto,
} from "./catalog.ts";

/**
 * ONE record type, and the immutable SEED data.
 *
 * A record was two hand-written structs (`Client`, `Project`)
 * whose only difference was their field list — which the
 * catalog now states as data. So a record is a bag of values
 * keyed by field name, and the section it belongs to says what
 * those keys mean. Five more sections cost five table entries,
 * not five more structs and the ~8 switches that read them.
 *
 * No module-global mutable state and no mutators live here
 * (unlike the retired `store.ts`): the records + id counters
 * live in the app Model, and the scheduler reads them through
 * a `dynamic` source fed by `Scheduled.withRows` — so
 * `update()` is a pure `(msg, model) → [model, cmd]`
 * (ticket 20260708192518).
 */
export type Rec = Readonly<{
  id: SoftStr;
  values: Readonly<Record<string, SoftStr>>;
}>;

export type Records = Readonly<
  Record<SectionId, ReadonlyArray<Rec>>
>;

export const valueOf = (
  rec: Rec,
  field: SoftStr,
): SoftStr =>
  matchOption<SoftStr, SoftStr>(
    () => "",
    (v: SoftStr) => v,
  )(fromNullable(rec.values[field]));

/** A record's name — the value of its section's label field. */
export const labelOf = (
  section: SectionId,
  rec: Rec,
): SoftStr =>
  valueOf(rec, defOf(section).labelField);

const rec = (
  id: SoftStr,
  values: Readonly<Record<string, SoftStr>>,
): Rec => ({ id, values });

const seedProjects: ReadonlyArray<Rec> = [
  rec("acme", {
    name: "ACME storefront rebuild",
    client: "ACME Retail K.K.",
    contract: "Fixed-price",
    status: "In progress",
    period: "2026-04 – 2026-09",
    budget: "¥8.4M",
    lead: "Aoki",
  }),
  rec("beacon", {
    name: "Beacon bank API",
    client: "Beacon Financial",
    contract: "T&M",
    status: "In progress",
    period: "2026-02 – 2026-12",
    budget: "¥22M",
    lead: "Béranger",
  }),
  rec("cobalt", {
    name: "Cobalt mobile app",
    client: "Cobalt Labs",
    contract: "Fixed-price",
    status: "Scoping",
    period: "2026-08 – 2027-01",
    budget: "¥12M",
    lead: "Chen",
  }),
  rec("delta", {
    name: "Delta data platform",
    client: "Delta Logistics",
    contract: "T&M",
    status: "On hold",
    period: "2026-05 – 2026-11",
    budget: "¥18M",
    lead: "Aoki",
  }),
  rec("echo", {
    name: "Echo CMS migration",
    client: "Echo Media",
    contract: "Fixed-price",
    status: "Delivered",
    period: "2025-10 – 2026-03",
    budget: "¥6.2M",
    lead: "Béranger",
  }),
  rec("foxtrot", {
    name: "Foxtrot IoT gateway",
    client: "Foxtrot Mfg.",
    contract: "T&M",
    status: "In progress",
    period: "2026-06 – 2027-03",
    budget: "¥30M",
    lead: "Chen",
  }),
  // Cobalt Labs carries several projects so "this client's
  // projects" is a real MANY-item list for the recursion.
  rec("cobalt-portal", {
    name: "Cobalt partner portal",
    client: "Cobalt Labs",
    contract: "T&M",
    status: "Scoping",
    period: "2026-09 – 2027-02",
    budget: "¥9M",
    lead: "Chen",
  }),
  rec("cobalt-analytics", {
    name: "Cobalt analytics",
    client: "Cobalt Labs",
    contract: "Fixed-price",
    status: "On hold",
    period: "2026-07 – 2026-12",
    budget: "¥5M",
    lead: "Aoki",
  }),
];

const seedClients: ReadonlyArray<Rec> = [
  rec("acme", {
    name: "ACME Retail K.K.",
    status: "Prime",
    since: "2024",
    contact: "Sato, IT Dept.",
    projects: "ACME storefront rebuild",
    notes:
      "Prime account; framework contract renews yearly.",
  }),
  rec("beacon", {
    name: "Beacon Financial",
    status: "Active",
    since: "2025",
    contact: "Ito, Digital",
    projects: "Beacon bank API",
    notes:
      "MSA in place; strict security review gate.",
  }),
  rec("cobalt", {
    name: "Cobalt Labs",
    status: "Prospect",
    since: "2026",
    contact: "Lang, Product",
    projects: "Cobalt mobile app",
    notes: "New this quarter; scoping phase 1.",
  }),
  rec("delta", {
    name: "Delta Logistics",
    status: "Active",
    since: "2025",
    contact: "Mori, Operations",
    projects: "Delta data platform",
    notes:
      "T&M engagement; delivery currently on hold.",
  }),
  rec("echo", {
    name: "Echo Media",
    status: "Active",
    since: "2023",
    contact: "Ueda, Editorial",
    projects: "Echo CMS migration",
    notes:
      "CMS migration delivered; maintenance retainer.",
  }),
  rec("foxtrot", {
    name: "Foxtrot Mfg.",
    status: "Active",
    since: "2025",
    contact: "Kanda, Plant IT",
    projects: "Foxtrot IoT gateway",
    notes:
      "Largest active budget; multi-site rollout.",
  }),
];

// The five sections that were placeholder tuples. Their values
// are consistent with the clients and projects above — a
// project's lead is a real member, an estimate's client is a
// real client — because the references are resolved by LABEL,
// so a name that matches nothing degrades to plain text and the
// recursion quietly loses a hop.
const seedMembers: ReadonlyArray<Rec> = [
  rec("aoki", {
    name: "Aoki",
    role: "Backend",
    status: "Allocated",
    allocation: "80%",
    joined: "2021",
    notes:
      "Leads the ACME and Delta engagements; API design.",
  }),
  rec("beranger", {
    name: "Béranger",
    role: "Frontend",
    status: "Allocated",
    allocation: "100%",
    joined: "2022",
    notes:
      "Fully booked on Beacon until the API ships.",
  }),
  rec("chen", {
    name: "Chen",
    role: "SRE",
    status: "Allocated",
    allocation: "60%",
    joined: "2023",
    notes:
      "Splits between Cobalt and Foxtrot; owns the rollout.",
  }),
  rec("ito", {
    name: "Ito",
    role: "Backend",
    status: "Available",
    allocation: "20%",
    joined: "2025",
    notes:
      "Rolling off Echo; free from next month.",
  }),
  rec("mina", {
    name: "Mina",
    role: "QA",
    status: "On leave",
    allocation: "0%",
    joined: "2024",
    notes: "Back in September.",
  }),
];

const seedDeals: ReadonlyArray<Rec> = [
  rec("est-2039", {
    name: "EST-2039",
    client: "Beacon Financial",
    project: "Beacon bank API",
    amount: "¥22M",
    status: "Accepted",
    issued: "2026-01-20",
    notes:
      "Accepted at the second revision; T&M with a cap.",
  }),
  rec("est-2041", {
    name: "EST-2041",
    client: "ACME Retail K.K.",
    project: "ACME storefront rebuild",
    amount: "¥8.4M",
    status: "Sent",
    issued: "2026-03-18",
    notes:
      "Awaiting sign-off; oldest open estimate.",
  }),
  rec("est-2044", {
    name: "EST-2044",
    client: "Cobalt Labs",
    project: "Cobalt partner portal",
    amount: "¥9M",
    status: "Draft",
    issued: "2026-07-02",
    notes: "Phase 2 scope still moving.",
  }),
  rec("est-2045", {
    name: "EST-2045",
    client: "Cobalt Labs",
    project: "Cobalt analytics",
    amount: "¥5M",
    status: "Declined",
    issued: "2026-06-11",
    notes: "Deferred to next fiscal year.",
  }),
];

const seedTimesheets: ReadonlyArray<Rec> = [
  rec("wk26-beranger", {
    name: "Week 26 — Béranger",
    member: "Béranger",
    project: "Beacon bank API",
    week: "2026-W26",
    hours: "40.0",
    status: "Approved",
  }),
  rec("wk27-aoki", {
    name: "Week 27 — Aoki",
    member: "Aoki",
    project: "ACME storefront rebuild",
    week: "2026-W27",
    hours: "38.5",
    status: "Submitted",
  }),
  rec("wk27-beranger", {
    name: "Week 27 — Béranger",
    member: "Béranger",
    project: "Beacon bank API",
    week: "2026-W27",
    hours: "41.5",
    status: "Submitted",
  }),
  rec("wk27-chen", {
    name: "Week 27 — Chen",
    member: "Chen",
    project: "Cobalt mobile app",
    week: "2026-W27",
    hours: "32.0",
    status: "Draft",
  }),
];

const seedInvoices: ReadonlyArray<Rec> = [
  rec("inv-0188", {
    name: "INV-0188",
    client: "Echo Media",
    project: "Echo CMS migration",
    amount: "¥6.2M",
    status: "Paid",
    due: "2026-04-30",
  }),
  rec("inv-0190", {
    name: "INV-0190",
    client: "Delta Logistics",
    project: "Delta data platform",
    amount: "¥4.5M",
    status: "Overdue",
    due: "2026-06-30",
  }),
  rec("inv-0192", {
    name: "INV-0192",
    client: "ACME Retail K.K.",
    project: "ACME storefront rebuild",
    amount: "¥3.2M",
    status: "Issued",
    due: "2026-08-31",
  }),
  rec("inv-0193", {
    name: "INV-0193",
    client: "Beacon Financial",
    project: "Beacon bank API",
    amount: "¥1.8M",
    status: "Draft",
    due: "2026-09-30",
  }),
];

const seedReports: ReadonlyArray<Rec> = [
  rec("profit", {
    name: "Project profitability",
    owner: "Aoki",
    status: "Live",
    updated: "2026-07-10",
    notes:
      "Margin by project for the quarter, contract type included.",
  }),
  rec("util", {
    name: "Utilization by member",
    owner: "Chen",
    status: "Live",
    updated: "2026-07-12",
    notes:
      "Billable ratio per member, rolling four weeks.",
  }),
  rec("aging", {
    name: "Invoice aging",
    owner: "Ito",
    status: "Draft",
    updated: "2026-07-14",
    notes: "Unpaid invoices by age bucket.",
  }),
];

export const SEEDS: Records = {
  clients: seedClients,
  projects: seedProjects,
  deals: seedDeals,
  timesheets: seedTimesheets,
  invoices: seedInvoices,
  members: seedMembers,
  reports: seedReports,
};

export const emptyCounts = (): Readonly<
  Record<SectionId, number>
> => bySection(() => 0);

export const recById = (
  recs: ReadonlyArray<Rec>,
  id: SoftStr,
): Option<Rec> =>
  fromNullable(
    recs.find((r: Rec) => r.id === id),
  );

// --- The recursion, derived from the ref declarations ---
// A `refTo` field names a record of the target section BY ITS
// LABEL — a project's `client` holds "ACME Retail K.K.", which
// is the client record's `name`. Both of these were hand-
// written per pair (`clientOfProject` / `projectsOfClient`);
// they now read the declaration, so a section joins the
// recursion by declaring one `refTo` and nothing else.

/**
 * The record a `refTo` field points at: the record of `to`
 * whose label equals this field's value.
 */
export const refTarget = (
  records: Records,
  to: SectionId,
  value: SoftStr,
): Option<Rec> =>
  fromNullable(
    records[to].find(
      (r: Rec) => labelOf(to, r) === value,
    ),
  );

/**
 * The records that point AT `rec` through `ref` — the reverse
 * walk. `ref.section`'s records whose `ref.field` holds this
 * record's label.
 */
export const refSources = (
  records: Records,
  ref: SectionRef,
  target: SectionId,
  rec: Rec,
): ReadonlyArray<Rec> => {
  const label = labelOf(target, rec);
  return records[ref.section].filter(
    (r: Rec) => valueOf(r, ref.field) === label,
  );
};

/** The incoming references a section's detail pane offers. */
export const backRefsOf = (
  section: SectionId,
): ReadonlyArray<SectionRef> => refsInto(section);

// Build a URL-safe id from a record name; falls back to
// `<singular>-<counter>` when the name has no slug chars.
export const slugId = (
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
