import { type SoftStr } from "plgg";

/**
 * Demo 1's record TYPES and immutable SEED data, plus the
 * pure id-slug helper. No module-global mutable state and
 * no mutators live here (unlike the retired `store.ts`):
 * the records + id counters now live in the app Model, and
 * the scheduler reads them through a `dynamic` source fed
 * by `Scheduled.withRows` — so `update()` is a pure
 * `(msg, model) → [model, cmd]` (ticket 20260708192518).
 */

export type Project = Readonly<{
  id: SoftStr;
  name: SoftStr;
  client: SoftStr;
  contract: SoftStr;
  status: SoftStr;
  period: SoftStr;
  budget: SoftStr;
  lead: SoftStr;
}>;

export type Client = Readonly<{
  id: SoftStr;
  name: SoftStr;
  status: SoftStr;
  since: SoftStr;
  contact: SoftStr;
  projects: SoftStr;
  notes: SoftStr;
}>;

export type SearchableSection =
  | "clients"
  | "projects";

export const seedProjects: ReadonlyArray<Project> =
  [
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

export const seedClients: ReadonlyArray<Client> =
  [
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
      notes:
        "New this quarter; scoping phase 1.",
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
