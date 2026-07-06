import { type SoftStr } from "plgg";
import {
  type Html,
  slot,
  span,
  text,
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
  makeRow,
  field,
  schedule,
  multiColumn,
} from "plggmatic";

/**
 * Demo 1 — the first step of a running theme: a
 * business-management system for a CONTRACT
 * software-development company (受託開発). This step lays
 * out THE MENU from scratch — plggmatic's
 * `menu([menuEntry(...)])` as pure data — for the eight
 * top-level sections such a company needs, and the
 * scheduler derives the whole navigable program from it.
 *
 * The point: you don't hand-write a `Model`, a `Msg`, an
 * `update`, or a URL codec — you DECLARE the menu and the
 * sections behind it, and `schedule` derives them. Each
 * section is a minimal placeholder list here; later steps
 * flesh out the real lists, detail, and actions.
 */

type Item = Readonly<{
  id: SoftStr;
  label: SoftStr;
  note: SoftStr;
}>;

type Section = Readonly<{
  id: SoftStr;
  label: SoftStr;
  title: SoftStr;
  items: ReadonlyArray<Item>;
}>;

const item = (
  id: SoftStr,
  label: SoftStr,
  note: SoftStr,
): Item => ({ id, label, note });

// The eight top-level sections of the contract-dev system,
// each with a couple of representative placeholder rows so
// the menu is navigable. Follow-up steps replace the sample
// rows with the real per-section data and actions.
const SECTIONS: ReadonlyArray<Section> = [
  {
    id: "dashboard",
    label: "Dashboard",
    title: "Dashboard",
    items: [
      item(
        "active",
        "7 active projects",
        "Across 5 clients.",
      ),
      item(
        "unbilled",
        "128 unbilled hours",
        "This month, not yet invoiced.",
      ),
      item(
        "pending",
        "3 estimates awaiting sign-off",
        "Oldest: 9 days.",
      ),
    ],
  },
  {
    id: "projects",
    label: "Projects",
    title: "Projects",
    items: [
      item(
        "acme",
        "ACME storefront rebuild",
        "Fixed-price · in progress.",
      ),
      item(
        "beacon",
        "Beacon bank API",
        "T&M · in progress.",
      ),
      item(
        "cobalt",
        "Cobalt mobile app",
        "Phase 2 · scoping.",
      ),
    ],
  },
  {
    id: "clients",
    label: "Clients",
    title: "Clients",
    items: [
      item(
        "acme-co",
        "ACME Retail K.K.",
        "Prime contract since 2024.",
      ),
      item(
        "beacon-co",
        "Beacon Financial",
        "MSA in place.",
      ),
      item(
        "cobalt-co",
        "Cobalt Labs",
        "New this quarter.",
      ),
    ],
  },
  {
    id: "deals",
    label: "Estimates & Contracts",
    title: "Estimates & Contracts",
    items: [
      item(
        "est-2041",
        "EST-2041 — ACME storefront",
        "¥8.4M · sent.",
      ),
      item(
        "msa-beacon",
        "MSA — Beacon Financial",
        "Signed.",
      ),
      item(
        "sow-17",
        "SOW-17 — Cobalt phase 2",
        "Draft.",
      ),
    ],
  },
  {
    id: "timesheets",
    label: "Timesheets",
    title: "Timesheets",
    items: [
      item(
        "wk27",
        "Week 27 — 4 members",
        "112 h logged.",
      ),
      item(
        "unsub",
        "Unsubmitted: 2",
        "Aoki, Chen.",
      ),
    ],
  },
  {
    id: "invoices",
    label: "Invoices",
    title: "Invoices",
    items: [
      item(
        "inv-0192",
        "INV-0192 — ACME",
        "¥3.2M · issued.",
      ),
      item(
        "inv-0193",
        "INV-0193 — Beacon",
        "¥1.8M · draft.",
      ),
    ],
  },
  {
    id: "members",
    label: "Members",
    title: "Members",
    items: [
      item(
        "aoki",
        "Aoki",
        "Backend · 80% allocated.",
      ),
      item(
        "beranger",
        "Béranger",
        "Frontend · 100% allocated.",
      ),
      item(
        "chen",
        "Chen",
        "SRE · 60% allocated.",
      ),
    ],
  },
  {
    id: "reports",
    label: "Reports",
    title: "Reports",
    items: [
      item(
        "profit",
        "Project profitability",
        "By project, this quarter.",
      ),
      item(
        "util",
        "Utilization by member",
        "Billable ratio.",
      ),
    ],
  },
];

const toCollection = (s: Section): Collection =>
  collection<Item>({
    id: s.id,
    title: s.title,
    toRow: (it: Item) =>
      makeRow(it.id, it.label, [
        field("", it.note),
      ]),
    source: sync(() => s.items),
  });

export const declaration: Declaration = declare({
  title: "Contract Ops",
  menu: menu(
    SECTIONS.map((s: Section) =>
      menuEntry(s.label, s.id),
    ),
  ),
  collections: SECTIONS.map(toCollection),
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
  view: (
    model: ScheduledModel,
  ): Html<SchedulerMsg> =>
    slot(
      [attr("class", "bo-root")],
      [
        span(
          [attr("class", "bo-brand")],
          [text("Contract Ops")],
        ),
        multiColumn(scheduled.scene(model)),
      ],
    ),
};
