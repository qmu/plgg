import {
  type SoftStr,
  type Option,
  some,
  none,
  matchOption,
  fromNullable,
} from "plgg";

/**
 * A SECTION IS DATA.
 *
 * This table is the single place a section is described, and
 * every code path that used to switch on the section reads it
 * instead. The type is what enforces that: `SECTIONS` is a
 * `Record<SectionId, SectionDef>`, so a new id CANNOT be added
 * to `SectionId` without the compiler demanding its
 * definition here. There is no "else" branch to fall into.
 *
 * That is the whole point of the shape. The predecessor,
 * `targetOf(kind)`, guessed a section from a field-input kind
 * by asking "is it in `clientFields`? then clients, else
 * projects" — correct only while exactly two sections existed
 * and silently wrong on the third. It is not extended here; it
 * is gone, replaced by messages that carry their own target
 * (`{ kind: "fieldInput", section, field, value }`).
 *
 * All seven record sections are here. The five that were
 * framework-rendered `STUBS` — placeholder tuple lists whose
 * detail column was titled by its RECORD ("EST-2041 — ACME
 * storefront") because the framework had no other name to use
 * — cost exactly what this shape promised: a table entry and
 * their seeds. Nothing outside this file learned that they
 * exist.
 *
 * (`dashboard` is NOT here. It is a BOARD of tiles, not a
 * section of records: it has no fields, no form and no detail,
 * and giving it a `SectionDef` would be describing it as
 * something it is not.)
 */

export type SectionId =
  | "clients"
  | "projects"
  | "deals"
  | "timesheets"
  | "invoices"
  | "members"
  | "reports";

/**
 * Build a value FOR EVERY section.
 *
 * This and `SECTIONS` are the only two places the sections are
 * enumerated, and the compiler polices both: each returns a
 * `Record<SectionId, …>`, so widening `SectionId` fails to
 * compile until the entry is here. `SECTION_IDS` and every
 * per-section map in the Model derive from them, which is why
 * adding a section is an edit to this file and nowhere else.
 *
 * The key order is the DECLARED order — the order the
 * collections stand in the declaration, which the scheduler
 * reads back.
 */
export const bySection = <A>(
  make: (id: SectionId) => A,
): Record<SectionId, A> => ({
  projects: make("projects"),
  clients: make("clients"),
  deals: make("deals"),
  timesheets: make("timesheets"),
  invoices: make("invoices"),
  members: make("members"),
  reports: make("reports"),
});

/** How an app detail pane renders a field's value. */
export type FieldDisplay = "datum" | "prose";

/**
 * The form control a field is edited through.
 *
 * NOT the retired `FieldInputKind`, which named twelve MESSAGE
 * kinds (`clientNameInput` … `projectLeadInput`) — one per
 * field per section, which is what made a third section cost
 * five more literals. This names the three controls that
 * exist, and a section's fields say which they use.
 */
export type ControlKind =
  "text" | "textarea" | "select";

export type FieldInput = Readonly<{
  kind: ControlKind;
  placeholder: SoftStr;
  options: ReadonlyArray<SoftStr>;
  required: boolean;
}>;

/**
 * One field of a record.
 *
 * The three `Option`s are the three independent questions a
 * field answers, and a `none` on each is a real, distinct
 * state rather than a flag to be tidied away:
 *
 * - `input` — how the Add form edits it. `none` means the
 *   field is DERIVED: `initial` is its value at create and no
 *   control renders. (`clients.projects` is the only one:
 *   a denormalized summary of the client's projects, which the
 *   recursion trail obsoleted but which still feeds the
 *   framework's row.)
 * - `pane` — how the APP detail column shows it. `none` means
 *   it does not appear there. The label field is always
 *   `none`: it names the record, and the column is titled by
 *   its KIND, so the name belongs to the row that led here.
 * - `refTo` — the field's value NAMES a record in that
 *   section, matched against that section's label field. One
 *   declaration; both directions of the recursion derive from
 *   it (see `refsInto`).
 */
export type SectionField = Readonly<{
  name: SoftStr;
  label: SoftStr;
  initial: SoftStr;
  input: Option<FieldInput>;
  pane: Option<FieldDisplay>;
  refTo: Option<SectionId>;
}>;

export type SectionDef = Readonly<{
  id: SectionId;
  /** Names the section — the menu entry and submenu title. */
  singular: SoftStr;
  /** The menu entry's label; also the detail column's kind. */
  title: SoftStr;
  /** Titles a column holding a MANY (results, a ref list). */
  plural: SoftStr;
  /** The field carrying the record's name. */
  labelField: SoftStr;
  /** The field the status filter compares against. */
  statusField: SoftStr;
  statuses: ReadonlyArray<SoftStr>;
  /** The declared query-choice param (deep-linkable). */
  statusParam: SoftStr;
  /** Joined by " · " under a result's name. */
  metaFields: ReadonlyArray<SoftStr>;
  fields: ReadonlyArray<SectionField>;
}>;

const text = (
  placeholder: SoftStr,
  required: boolean,
): Option<FieldInput> =>
  some<FieldInput>({
    kind: "text",
    placeholder,
    options: [],
    required,
  });

const textarea = (
  placeholder: SoftStr,
): Option<FieldInput> =>
  some<FieldInput>({
    kind: "textarea",
    placeholder,
    options: [],
    required: false,
  });

const select = (
  options: ReadonlyArray<SoftStr>,
): Option<FieldInput> =>
  some<FieldInput>({
    kind: "select",
    placeholder: "",
    options,
    required: true,
  });

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

const dealStatuses: ReadonlyArray<SoftStr> = [
  "Draft",
  "Sent",
  "Accepted",
  "Declined",
];

const timesheetStatuses: ReadonlyArray<SoftStr> =
  ["Draft", "Submitted", "Approved"];

const invoiceStatuses: ReadonlyArray<SoftStr> = [
  "Draft",
  "Issued",
  "Paid",
  "Overdue",
];

const memberStatuses: ReadonlyArray<SoftStr> = [
  "Available",
  "Allocated",
  "On leave",
];

const reportStatuses: ReadonlyArray<SoftStr> = [
  "Live",
  "Draft",
  "Archived",
];

/** A plain datum: edited as text, shown in the pane. */
const datum = (
  name: SoftStr,
  label: SoftStr,
  placeholder: SoftStr,
  required: boolean,
): SectionField => ({
  name,
  label,
  initial: "",
  input: text(placeholder, required),
  pane: some("datum"),
  refTo: none(),
});

/** The field that NAMES the record — never a pane row. */
const nameField = (
  placeholder: SoftStr,
): SectionField => ({
  name: "name",
  label: "Name",
  initial: "",
  input: text(placeholder, true),
  pane: none(),
  refTo: none(),
});

/** A datum whose value names a record of `to`. */
const refField = (
  name: SoftStr,
  label: SoftStr,
  placeholder: SoftStr,
  to: SectionId,
): SectionField => ({
  name,
  label,
  initial: "",
  input: text(placeholder, false),
  pane: some("datum"),
  refTo: some(to),
});

/** The categorical axis the search condition filters on. */
const statusField = (
  statuses: ReadonlyArray<SoftStr>,
  initial: SoftStr,
): SectionField => ({
  name: "status",
  label: "Status",
  initial,
  input: select(statuses),
  pane: some("datum"),
  refTo: none(),
});

const proseField = (
  name: SoftStr,
  label: SoftStr,
  placeholder: SoftStr,
): SectionField => ({
  name,
  label,
  initial: "",
  input: textarea(placeholder),
  pane: some("prose"),
  refTo: none(),
});

const clientsDef: SectionDef = {
  id: "clients",
  singular: "client",
  title: "Client",
  plural: "Clients",
  labelField: "name",
  statusField: "status",
  statuses: clientStatuses,
  statusParam: "cstatus",
  metaFields: ["status", "contact"],
  fields: [
    {
      name: "name",
      label: "Name",
      initial: "",
      input: text("Client name", true),
      pane: none(),
      refTo: none(),
    },
    {
      name: "status",
      label: "Status",
      initial: "Prospect",
      input: select(clientStatuses),
      pane: some("datum"),
      refTo: none(),
    },
    {
      name: "since",
      label: "Since",
      initial: "2026",
      input: text("2026", true),
      pane: some("datum"),
      refTo: none(),
    },
    {
      name: "contact",
      label: "Contact",
      initial: "",
      input: text("Name, department", true),
      pane: some("datum"),
      refTo: none(),
    },
    {
      // Derived, not edited: the recursion trail's
      // "Related Projects →" is the live answer to the
      // same question. Kept because the framework's row
      // still carries it.
      name: "projects",
      label: "Projects",
      initial: "No active projects",
      input: none(),
      pane: none(),
      refTo: none(),
    },
    {
      name: "notes",
      label: "Notes",
      initial: "",
      input: textarea("Optional notes"),
      pane: some("prose"),
      refTo: none(),
    },
  ],
};

const projectsDef: SectionDef = {
  id: "projects",
  singular: "project",
  title: "Project",
  plural: "Projects",
  labelField: "name",
  statusField: "status",
  statuses: projectStatuses,
  statusParam: "status",
  metaFields: ["status", "client"],
  fields: [
    {
      name: "name",
      label: "Name",
      initial: "",
      input: text("Project name", true),
      pane: none(),
      refTo: none(),
    },
    {
      // The ONE cross-reference declaration. A project
      // names its client; from this alone both directions
      // of the recursion follow — the project detail's
      // Client link (forward) and the client detail's
      // "Related Projects" (reverse, via `refsInto`).
      name: "client",
      label: "Client",
      initial: "",
      input: text("Client name", false),
      pane: some("datum"),
      refTo: some("clients"),
    },
    {
      name: "contract",
      label: "Contract",
      initial: "Fixed-price",
      input: select(projectContracts),
      pane: some("datum"),
      refTo: none(),
    },
    {
      name: "status",
      label: "Status",
      initial: "In progress",
      input: select(projectStatuses),
      pane: some("datum"),
      refTo: none(),
    },
    {
      name: "period",
      label: "Period",
      initial: "",
      input: text("2026-04 - 2026-09", false),
      pane: some("datum"),
      refTo: none(),
    },
    {
      name: "budget",
      label: "Budget",
      initial: "",
      input: text("¥8.4M", false),
      pane: some("datum"),
      refTo: none(),
    },
    // A lead IS a member, so it says so. The framework's row
    // cell and the pane's link both follow from this one word.
    refField("lead", "Lead", "Aoki", "members"),
  ],
};

const dealsDef: SectionDef = {
  id: "deals",
  // The section holds ESTIMATES — an estimate has an amount, a
  // state and a client. Naming it "Estimate" left it narrower
  // than its drawer only while the drawer was a stub holding an
  // MSA and a SOW beside them; those were placeholders for a
  // section that had never been decided. A contract is a
  // different kind of record from a quote for work, so the
  // estimates are what this section is, and the name now covers
  // exactly what it holds.
  singular: "estimate",
  title: "Estimate",
  plural: "Estimates",
  labelField: "name",
  statusField: "status",
  statuses: dealStatuses,
  statusParam: "dstatus",
  metaFields: ["status", "client"],
  fields: [
    nameField("EST-2046"),
    refField(
      "client",
      "Client",
      "Client name",
      "clients",
    ),
    refField(
      "project",
      "Project",
      "Project name",
      "projects",
    ),
    datum("amount", "Amount", "¥8.4M", true),
    statusField(dealStatuses, "Draft"),
    datum(
      "issued",
      "Issued",
      "2026-07-16",
      false,
    ),
    proseField(
      "notes",
      "Notes",
      "Optional notes",
    ),
  ],
};

const timesheetsDef: SectionDef = {
  id: "timesheets",
  singular: "timesheet",
  title: "Timesheet",
  plural: "Timesheets",
  labelField: "name",
  statusField: "status",
  statuses: timesheetStatuses,
  statusParam: "tstatus",
  metaFields: ["status", "member"],
  fields: [
    nameField("Week 28 — Aoki"),
    refField(
      "member",
      "Member",
      "Aoki",
      "members",
    ),
    refField(
      "project",
      "Project",
      "Project name",
      "projects",
    ),
    datum("week", "Week", "2026-W28", true),
    datum("hours", "Hours", "38.5", true),
    statusField(timesheetStatuses, "Draft"),
  ],
};

const invoicesDef: SectionDef = {
  id: "invoices",
  singular: "invoice",
  title: "Invoice",
  plural: "Invoices",
  labelField: "name",
  statusField: "status",
  statuses: invoiceStatuses,
  statusParam: "istatus",
  metaFields: ["status", "client"],
  fields: [
    nameField("INV-0194"),
    refField(
      "client",
      "Client",
      "Client name",
      "clients",
    ),
    refField(
      "project",
      "Project",
      "Project name",
      "projects",
    ),
    datum("amount", "Amount", "¥3.2M", true),
    statusField(invoiceStatuses, "Draft"),
    datum("due", "Due", "2026-08-31", false),
  ],
};

const membersDef: SectionDef = {
  id: "members",
  singular: "member",
  title: "Member",
  plural: "Members",
  labelField: "name",
  statusField: "status",
  statuses: memberStatuses,
  statusParam: "mstatus",
  metaFields: ["status", "role"],
  fields: [
    nameField("Member name"),
    datum("role", "Role", "Backend", true),
    statusField(memberStatuses, "Available"),
    datum(
      "allocation",
      "Allocation",
      "80%",
      false,
    ),
    datum("joined", "Joined", "2026", false),
    proseField(
      "notes",
      "Notes",
      "Optional notes",
    ),
  ],
};

const reportsDef: SectionDef = {
  id: "reports",
  singular: "report",
  title: "Report",
  plural: "Reports",
  labelField: "name",
  statusField: "status",
  statuses: reportStatuses,
  statusParam: "rstatus",
  metaFields: ["status", "owner"],
  fields: [
    nameField("Report name"),
    refField("owner", "Owner", "Aoki", "members"),
    statusField(reportStatuses, "Draft"),
    datum(
      "updated",
      "Updated",
      "2026-07-16",
      false,
    ),
    proseField(
      "notes",
      "Notes",
      "What the report answers",
    ),
  ],
};

/**
 * The catalog. `Record<SectionId, SectionDef>` is the
 * exhaustiveness proof: no id without a definition.
 */
export const SECTIONS: Record<
  SectionId,
  SectionDef
> = {
  projects: projectsDef,
  clients: clientsDef,
  deals: dealsDef,
  timesheets: timesheetsDef,
  invoices: invoicesDef,
  members: membersDef,
  reports: reportsDef,
};

/**
 * Every section id, in declared order — derived from the
 * table, so it cannot fall out of step with it.
 */
export const SECTION_IDS: ReadonlyArray<SectionId> =
  Object.values(SECTIONS).map(
    (d: SectionDef) => d.id,
  );

export const defOf = (
  section: SectionId,
): SectionDef => SECTIONS[section];

export const fieldsOf = (
  section: SectionId,
): ReadonlyArray<SectionField> =>
  SECTIONS[section].fields;

export const fieldOf = (
  section: SectionId,
  name: SoftStr,
): Option<SectionField> =>
  fromNullable(
    fieldsOf(section).find(
      (f: SectionField) => f.name === name,
    ),
  );

/** The fields the Add form edits, in declared order. */
export const formFieldsOf = (
  section: SectionId,
): ReadonlyArray<SectionField> =>
  fieldsOf(section).filter((f: SectionField) =>
    matchOption<FieldInput, boolean>(
      () => false,
      () => true,
    )(f.input),
  );

/**
 * The fields the framework's Row carries: every field except
 * the one that names the record (that becomes the Row's own
 * label).
 */
export const rowFieldsOf = (
  section: SectionId,
): ReadonlyArray<SectionField> =>
  fieldsOf(section).filter(
    (f: SectionField) =>
      f.name !== SECTIONS[section].labelField,
  );

/** The fields the app's detail pane shows, in order. */
export const paneFieldsOf = (
  section: SectionId,
): ReadonlyArray<SectionField> =>
  fieldsOf(section).filter((f: SectionField) =>
    matchOption<FieldDisplay, boolean>(
      () => false,
      () => true,
    )(f.pane),
  );

/** A section id, if the value names one this table defines. */
export const sectionIdOf = (
  value: SoftStr,
): Option<SectionId> =>
  fromNullable(
    SECTION_IDS.find(
      (id: SectionId) => id === value,
    ),
  );

/** The section whose `singular` an `add=` param names. */
export const sectionOfSingular = (
  value: SoftStr,
): Option<SectionId> =>
  fromNullable(
    SECTION_IDS.find(
      (id: SectionId) =>
        SECTIONS[id].singular === value,
    ),
  );

/**
 * One incoming reference: `section`'s `field` names a record
 * of the section this was asked about.
 *
 * This is the REVERSE of a `refTo` declaration, derived by
 * reading the table rather than hand-written. It is what lets
 * a client detail offer "Related Projects" without clients
 * knowing projects exist — and what will let any section join
 * the recursion by declaring one `refTo`.
 */
export type SectionRef = Readonly<{
  section: SectionId;
  field: SoftStr;
}>;

export const refsInto = (
  target: SectionId,
): ReadonlyArray<SectionRef> =>
  SECTION_IDS.flatMap(
    (id: SectionId): ReadonlyArray<SectionRef> =>
      fieldsOf(id).flatMap(
        (
          f: SectionField,
        ): ReadonlyArray<SectionRef> =>
          matchOption<
            SectionId,
            ReadonlyArray<SectionRef>
          >(
            () => [],
            (to: SectionId) =>
              to === target
                ? [{ section: id, field: f.name }]
                : [],
          )(f.refTo),
      ),
  );
