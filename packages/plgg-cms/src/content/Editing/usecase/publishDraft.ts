import {
  type Num,
  type Option,
  type SoftStr,
  type PromisedResult,
  type InvalidError,
  type Defect,
  ok,
  err,
  proc,
  matchOption,
  invalidError,
} from "plgg";
import { type Db } from "plgg-sql";
import {
  type Draft,
} from "plgg-cms/content/Editing/model/Draft";
import {
  type Revision,
} from "plgg-cms/content/Editing/model/Revision";
import { transitionDraftStatus } from "plgg-cms/content/Editing/model/DraftStatus";
import { sqlDraftStore } from "plgg-cms/content/Editing/Sql/draftStore";
import { checkBase } from "plgg-cms/content/Editing/usecase/checkBase";

export type PublishError =
  | InvalidError
  | Defect
  | { content: { message: SoftStr } };

/** The verdict of a publish attempt. */
export type PublishOutcome =
  | "exported"
  | "conflicted";

const EXPORTED: PublishOutcome = "exported";
const CONFLICTED: PublishOutcome = "conflicted";

/**
 * The fs seam publish writes THROUGH — injected so the
 * reconciliation logic stays decoupled from `node:fs` and is
 * unit-testable; the real implementation (over `plgg-server/
 * ssg`, path-safe + atomic temp+rename) is wired at the serve
 * mount. `currentHash` is the target file's content_hash NOW
 * (`None` if no file is there); `writeSource` performs the
 * atomic write of the exported Markdown.
 */
export type ExportFs = Readonly<{
  currentHash: (
    relPath: SoftStr,
  ) => Promise<Option<SoftStr>>;
  writeSource: (
    relPath: SoftStr,
    content: SoftStr,
  ) => PromisedResult<null, Defect>;
}>;

/** Reject an absolute path, a `..` escape, or an empty path. */
const isSafePath = (p: SoftStr): boolean =>
  p.length > 0 &&
  !p.startsWith("/") &&
  !p.split("/").includes("..");

/**
 * Admin export-to-git reconciliation (D4, ticket 22): fold, in
 * order, the failure branches that make guest editing safe on
 * a git-primary corpus —
 * 1. resolve the draft (missing → Err) and its latest revision;
 * 2. PATH-SAFETY — reject an absolute/`..`/empty target (Err),
 *    so a draft can never write outside the content tree;
 * 3. re-run {@link checkBase} against the CURRENT source hash —
 *    a `conflict` (the source moved underneath) marks the draft
 *    `conflicted` and writes NOTHING;
 * 4. otherwise transition `submitted → exported` (an illegal
 *    source state → Err), write the Markdown atomically through
 *    the injected {@link ExportFs}, and record the export.
 * Never throws; every branch is a typed `Result`.
 */
export const publishDraft =
  (db: Db, fs: ExportFs, clock: () => Num) =>
  (
    draftId: Num,
  ): PromisedResult<
    PublishOutcome,
    PublishError
  > => {
    const store = sqlDraftStore(db);
    return proc(
      store.findDraft(draftId),
      (found: Option<Draft>) =>
        matchOption<
          Draft,
          PromisedResult<
            PublishOutcome,
            PublishError
          >
        >(
          () =>
            Promise.resolve(
              err(
                invalidError({
                  message: `draft ${draftId} not found`,
                }),
              ),
            ),
          (d: Draft) =>
            isSafePath(d.contentPath)
              ? proc(
                  store.latestRevision(draftId),
                  (
                    latest: Option<Revision>,
                  ) =>
                    matchOption<
                      Revision,
                      PromisedResult<
                        PublishOutcome,
                        PublishError
                      >
                    >(
                      () =>
                        Promise.resolve(
                          err(
                            invalidError({
                              message: `draft ${draftId} has no revision`,
                            }),
                          ),
                        ),
                      (rev: Revision) =>
                        reconcile(
                          store,
                          fs,
                          clock,
                          d,
                          rev,
                        ),
                    )(latest),
                )
              : Promise.resolve(
                  err(
                    invalidError({
                      message: `unsafe target path: ${d.contentPath}`,
                    }),
                  ),
                ),
        )(found),
    );
  };

/** Re-check the base, then either mark conflicted or write + mark exported. */
const reconcile = (
  store: ReturnType<typeof sqlDraftStore>,
  fs: ExportFs,
  clock: () => Num,
  d: Draft,
  rev: Revision,
): PromisedResult<PublishOutcome, PublishError> =>
  fs.currentHash(d.contentPath).then(
    (
      current: Option<SoftStr>,
    ): PromisedResult<
      PublishOutcome,
      PublishError
    > =>
      checkBase(d.baseRevisionHash, current) ===
      "conflict"
        ? proc(
            store.updateStatus(
              d.id,
              "conflicted",
              clock(),
            ),
            () => ok(CONFLICTED),
          )
        : proc(
            transitionDraftStatus(
              d.status,
              "exported",
            ),
            () =>
              proc(
                fs.writeSource(
                  d.contentPath,
                  rev.body,
                ),
                () =>
                  proc(
                    store.updateStatus(
                      d.id,
                      "exported",
                      clock(),
                    ),
                    () => ok(EXPORTED),
                  ),
              ),
          ),
    );
