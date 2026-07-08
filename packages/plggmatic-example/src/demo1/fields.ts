import {
  type SoftStr,
  matchOption,
  fromNullable,
} from "plgg";
import { type SearchableSection } from "./records.ts";
import {
  clientStatuses,
  projectStatuses,
  projectContracts,
} from "./sections.ts";

// --- One descriptor drives both live record sections ---
// `clients` and `projects` share every form, draft, parse,
// and submit code path; only their field list and record
// shape differ. A `SectionField` list per section is the
// single source those paths read from, replacing the two
// hand-written parallel blocks.
export type SectionFieldKind =
  "text" | "textarea" | "select";

export type FieldInputKind =
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

export type SectionField = Readonly<{
  name: SoftStr;
  label: SoftStr;
  kind: SectionFieldKind;
  placeholder: SoftStr;
  options: ReadonlyArray<SoftStr>;
  required: boolean;
  initial: SoftStr;
  input: FieldInputKind;
}>;

export const clientFields: ReadonlyArray<SectionField> =
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

export const projectFields: ReadonlyArray<SectionField> =
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

export const fieldsOf = (
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
export const targetOf = (
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
