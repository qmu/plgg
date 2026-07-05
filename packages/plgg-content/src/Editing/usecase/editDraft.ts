import {
  type Num,
  type Option,
  type SoftStr,
  type Result,
  type PromisedResult,
  type InvalidError,
  type Defect,
  ok,
  err,
  proc,
  matchOption,
  invalidError,
} from "plgg";
import {
  type Db,
  type SqlError,
  transaction,
} from "plgg-sql";
import {
  type Draft,
  draft,
} from "plgg-content/Editing/model/Draft";
import {
  type Revision,
  revision,
} from "plgg-content/Editing/model/Revision";
import {
  type DraftStatus,
  transitionDraftStatus,
} from "plgg-content/Editing/model/DraftStatus";
import { type DraftStore } from "plgg-content/Editing/model/DraftStore";
import { sqlDraftStore } from "plgg-content/Editing/Sql/draftStore";

export type EditError =
  | SqlError
  | InvalidError
  | Defect;

/** Resolve a draft and assert the caller owns it (a guest can't touch another's). */
const guardOwner = (
  store: DraftStore,
  id: Num,
  owner: SoftStr,
): PromisedResult<Draft, EditError> =>
  proc(
    store.findDraft(id),
    (
      found: Option<Draft>,
    ): Result<Draft, InvalidError> =>
      matchOption<
        Draft,
        Result<Draft, InvalidError>
      >(
        () =>
          err(
            invalidError({
              message: `draft ${id} not found`,
            }),
          ),
        (d: Draft) =>
          d.createdBy === owner
            ? ok(d)
            : err(
                invalidError({
                  message:
                    "not the draft owner",
                }),
              ),
      )(found),
  );

/**
 * Open a NEW draft against `contentPath` with its first
 * revision, in one transaction. `baseRevisionHash` is the
 * source's `content_hash` at open (`None` for a new page).
 */
export const openDraft =
  (db: Db, clock: () => Num) =>
  (
    contentPath: SoftStr,
    createdBy: SoftStr,
    baseRevisionHash: Option<SoftStr>,
    body: SoftStr,
  ): PromisedResult<Draft, EditError> => {
    const store = sqlDraftStore(db);
    const now = clock();
    return transaction<undefined, Draft, EditError>(
      db,
      () =>
        proc(
          store.saveDraft(
            draft({
              id: 0,
              contentPath,
              status: "draft",
              baseRevisionHash,
              createdBy,
              createdAt: now,
              updatedAt: now,
            }),
          ),
          (id: Num) =>
            proc(
              store.saveRevision(
                revision({
                  id: 0,
                  draftId: id,
                  ordinal: 1,
                  body,
                  createdAt: now,
                }),
              ),
              () =>
                ok(
                  draft({
                    id,
                    contentPath,
                    status: "draft",
                    baseRevisionHash,
                    createdBy,
                    createdAt: now,
                    updatedAt: now,
                  }),
                ),
            ),
        ),
    )(undefined);
  };

/**
 * Append a revision to an OWNED draft (autosave) and bump its
 * `updated_at`, in one transaction. Returns the revision id.
 */
export const autosave =
  (db: Db, clock: () => Num) =>
  (
    draftId: Num,
    owner: SoftStr,
    body: SoftStr,
  ): PromisedResult<Num, EditError> => {
    const store = sqlDraftStore(db);
    const now = clock();
    return proc(
      guardOwner(store, draftId, owner),
      (d: Draft) =>
        proc(
          store.latestRevision(draftId),
          (latest: Option<Revision>) => {
            const nextOrdinal = matchOption<
              Revision,
              Num
            >(
              () => 1,
              (r: Revision) => r.ordinal + 1,
            )(latest);
            return transaction<
              undefined,
              Num,
              EditError
            >(db, () =>
              proc(
                store.saveRevision(
                  revision({
                    id: 0,
                    draftId,
                    ordinal: nextOrdinal,
                    body,
                    createdAt: now,
                  }),
                ),
                (rid: Num) =>
                  proc(
                    store.updateStatus(
                      draftId,
                      d.status,
                      now,
                    ),
                    () => ok(rid),
                  ),
              ),
            )(undefined);
          },
        ),
    );
  };

/** Move an OWNED draft's status through {@link transitionDraftStatus}. */
const moveStatus =
  (db: Db, clock: () => Num) =>
  (
    draftId: Num,
    owner: SoftStr,
    target: DraftStatus,
  ): PromisedResult<DraftStatus, EditError> => {
    const store = sqlDraftStore(db);
    return proc(
      guardOwner(store, draftId, owner),
      (d: Draft) =>
        proc(
          transitionDraftStatus(
            d.status,
            target,
          ),
          (next: DraftStatus) =>
            proc(
              store.updateStatus(
                draftId,
                next,
                clock(),
              ),
              () => ok(next),
            ),
        ),
    );
  };

/** Guest hands an owned draft to an admin for review. */
export const submitDraft =
  (db: Db, clock: () => Num) =>
  (draftId: Num, owner: SoftStr) =>
    moveStatus(db, clock)(
      draftId,
      owner,
      "submitted",
    );

/** Guest abandons an owned draft. */
export const discardDraft =
  (db: Db, clock: () => Num) =>
  (draftId: Num, owner: SoftStr) =>
    moveStatus(db, clock)(
      draftId,
      owner,
      "discarded",
    );
