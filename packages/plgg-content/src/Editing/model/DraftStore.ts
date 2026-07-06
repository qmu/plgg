import {
  type Option,
  type Num,
  type SoftStr,
  type PromisedResult,
  type InvalidError,
  type Defect,
} from "plgg";
import { type SqlError } from "plgg-sql";
import { type Draft } from "plgg-content/Editing/model/Draft";
import { type Revision } from "plgg-content/Editing/model/Revision";
import { type DraftStatus } from "plgg-content/Editing/model/DraftStatus";

/** The admin/guest filters over the draft list. */
export type DraftFilter = Readonly<{
  createdBy: Option<SoftStr>;
  status: Option<DraftStatus>;
}>;

/**
 * The DB-PRIMARY draft persistence seam (D4). Raw CRUD — the
 * ownership predicate, the revision-per-mutation append, and
 * the lifecycle transitions live in the usecases above it
 * (mirroring the stakeholder store). Every read decodes through
 * casters (a mis-shaped row → `None`/dropped), every method a
 * `Result`, never a throw. `save*` return the DB-assigned id;
 * `updateStatus` takes an ALREADY-validated target.
 */
export type DraftStore = Readonly<{
  saveDraft: (
    d: Draft,
  ) => PromisedResult<
    Num,
    SqlError | InvalidError | Defect
  >;
  findDraft: (
    id: Num,
  ) => PromisedResult<
    Option<Draft>,
    SqlError | InvalidError | Defect
  >;
  listDrafts: (
    filter: DraftFilter,
  ) => PromisedResult<
    ReadonlyArray<Draft>,
    SqlError | InvalidError | Defect
  >;
  updateStatus: (
    id: Num,
    status: DraftStatus,
    updatedAt: Num,
  ) => PromisedResult<null, SqlError | Defect>;
  saveRevision: (
    r: Revision,
  ) => PromisedResult<
    Num,
    SqlError | InvalidError | Defect
  >;
  latestRevision: (
    draftId: Num,
  ) => PromisedResult<
    Option<Revision>,
    SqlError | InvalidError | Defect
  >;
}>;
