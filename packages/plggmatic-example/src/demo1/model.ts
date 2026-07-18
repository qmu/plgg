import { type SoftStr } from "plgg";
import { type Url } from "plgg-view/client";
import {
  type ScheduledModel,
  type SchedulerMsg,
  type FormErrors,
} from "plggmatic";
import { type Scheme } from "plggmatic/style";
import {
  type SectionId,
  type SectionField,
  formFieldsOf,
} from "./catalog.ts";
import { type Records } from "./records.ts";

// One form shape for every section; drafts keyed by field
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

/**
 * One hop of the URL-carried recursion trail (see `url.ts`).
 * A hop is one of two things, and both name the section they
 * are about rather than encoding it in the hop's letter:
 *
 * - `detail` — the record `id` of `section`.
 * - `refList` — the records of `section` whose `field` names
 *   the record `id` (of the section that field refs). The
 *   reverse walk: "this client's projects".
 *
 * Defined here (not in `url.ts`) so the Model can hold the
 * trail without a model↔url import cycle.
 */
export type TrailStep =
  | Readonly<{
      kind: "detail";
      section: SectionId;
      id: SoftStr;
    }>
  | Readonly<{
      kind: "refList";
      section: SectionId;
      field: SoftStr;
      id: SoftStr;
    }>;

export type Model = Readonly<{
  scheme: Scheme;
  scheduled: ScheduledModel;
  // The record collections + their id counters live in the
  // Model (was module-global `store.ts`): a `dynamic`
  // scheduler source reads them via `withRows`, so `update()`
  // is pure and two `makeApp()` instances share no created
  // records (ticket 20260708192518).
  //
  // Keyed by section, not named per section: `clients` /
  // `projects` / `clientCount` / `projectCount` /
  // `clientForm` / `projectForm` were six slots that five more
  // sections would have made twenty-one.
  records: Records;
  counts: Readonly<Record<SectionId, number>>;
  forms: Readonly<Record<SectionId, SectionForm>>;
  search: SearchForm;
  // The URL-carried recursion trail (empty = not recursing).
  trail: ReadonlyArray<TrailStep>;
}>;

/**
 * The twelve `FieldInputKind` literals and the two
 * `*FormSubmit` messages are gone. A message now CARRIES its
 * target — which is what deleted `targetOf`, the binary guess
 * that asked "in `clientFields`? then clients, else projects"
 * and would have mis-routed silently on the third section.
 * There is nothing left to guess from.
 */
export type Msg =
  | Readonly<{
      kind: "scheduler";
      msg: SchedulerMsg;
    }>
  | Readonly<{ kind: "toggleScheme" }>
  | Readonly<{ kind: "schemeApplied" }>
  // A no-op ack the column-advance scroll effect resolves to
  // (the seek-head scroll runs in the Cmd, not in `update`).
  | Readonly<{ kind: "columnsAdvanced" }>
  | Readonly<{ kind: "urlChanged"; url: Url }>
  | Readonly<{
      kind: "fieldInput";
      section: SectionId;
      field: SoftStr;
      value: SoftStr;
    }>
  | Readonly<{
      kind: "formSubmit";
      section: SectionId;
    }>
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
  section: SectionId,
  open: boolean,
): SectionForm => ({
  open,
  drafts: Object.fromEntries(
    formFieldsOf(section).map(
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
