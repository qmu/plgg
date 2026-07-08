import { type SoftStr } from "plgg";
import { type Url } from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  type FormErrors,
} from "plggmatic";
import { type Scheme } from "plggmatic/style";
import { type SearchableSection } from "./store.ts";
import {
  type SectionField,
  type FieldInputKind,
  fieldsOf,
} from "./fields.ts";

// One form shape for both sections; drafts keyed by field
// name replace the per-record named draft fields.
export type SectionForm = Readonly<{
  open: boolean;
  drafts: Readonly<Record<string, SoftStr>>;
  errors: FormErrors;
}>;

export type SearchForm = Readonly<{
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

export const emptySectionForm = (
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

export const emptySearchForm = (
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
