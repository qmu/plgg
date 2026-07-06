import {
  type Num,
  type Option,
  type PromisedResult,
  ok,
  err,
  proc,
  matchOption,
  invalidError,
} from "plgg";
import { type Db } from "plgg-sql";
import {
  type Conversation,
} from "plgg-content/Stakeholder/model/Conversation";
import {
  type ConversationStatus,
  transitionStatus,
} from "plgg-content/Stakeholder/model/ConversationStatus";
import { type IngestError } from "plgg-content/Stakeholder/usecase/ingest";
import { sqlStakeholderStore } from "plgg-content/Stakeholder/Sql/stakeholderStore";

/**
 * Move a conversation's lifecycle status — the ONLY sanctioned
 * status write. It resolves the conversation (a missing one is
 * a typed `Err`), runs {@link transitionStatus} against its
 * CURRENT status (an illegal move is an `Err` and never
 * reaches the store), then persists the validated target and
 * bumps `updated_at`. Never throws.
 */
export const changeStatus =
  (db: Db, clock: () => Num) =>
  (
    id: Num,
    target: ConversationStatus,
  ): PromisedResult<
    ConversationStatus,
    IngestError
  > => {
    const store = sqlStakeholderStore(db);
    return proc(
      store.findConversation(id),
      (found: Option<Conversation>) =>
        matchOption<
          Conversation,
          PromisedResult<
            ConversationStatus,
            IngestError
          >
        >(
          () =>
            Promise.resolve(
              err(
                invalidError({
                  message: `conversation ${id} not found`,
                }),
              ),
            ),
          (conv: Conversation) =>
            proc(
              transitionStatus(
                conv.status,
                target,
              ),
              (next: ConversationStatus) =>
                proc(
                  store.updateStatus(
                    id,
                    next,
                    clock(),
                  ),
                  () => ok(next),
                ),
            ),
        )(found),
    );
  };
