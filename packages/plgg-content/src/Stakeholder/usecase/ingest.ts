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
  match,
  matchOption,
  invalidError,
} from "plgg";
import {
  type Db,
  type SqlError,
  transaction,
} from "plgg-sql";
import {
  type IngestMessage,
  existingConversation$,
  newConversation$,
} from "plgg-content/Stakeholder/model/Ingestion";
import {
  type Conversation,
  conversation,
} from "plgg-content/Stakeholder/model/Conversation";
import {
  type Message,
  message,
} from "plgg-content/Stakeholder/model/Message";
import { type ConversationKind } from "plgg-content/Stakeholder/model/ConversationKind";
import { type Visibility } from "plgg-content/Stakeholder/model/Visibility";
import { type StakeholderStore } from "plgg-content/Stakeholder/model/StakeholderStore";
import { sqlStakeholderStore } from "plgg-content/Stakeholder/Sql/stakeholderStore";

export type IngestError =
  | SqlError
  | InvalidError
  | Defect;

/** Append a message to a (known-existing) conversation, returning it with its id. */
const appendMessage = (
  store: StakeholderStore,
  conversationId: Num,
  msg: IngestMessage,
  now: Num,
): PromisedResult<Message, IngestError> =>
  proc(
    store.saveMessage(
      message({
        id: 0,
        conversationId,
        authorSubject: msg.authorSubject,
        authorKind: msg.authorKind,
        body: msg.body,
        source: msg.source,
        createdAt: now,
      }),
    ),
    (id: Num) =>
      ok(
        message({
          id,
          conversationId,
          authorSubject: msg.authorSubject,
          authorKind: msg.authorKind,
          body: msg.body,
          source: msg.source,
          createdAt: now,
        }),
      ),
  );

/**
 * The SINGLE entry point for writing to the stakeholder store
 * (the WRITTEN INGESTION CONTRACT). `ExistingConversation`
 * appends a message (a missing conversation is a typed `Err`,
 * never an orphaned message). `NewConversation` opens the
 * conversation AND writes its first message in ONE transaction
 * — either both land or neither. `body` is stored verbatim
 * (untrusted); provenance (`authorKind`/`source`) is recorded
 * as given. Never throws.
 */
export const ingest =
  (db: Db, clock: () => Num) =>
  (
    msg: IngestMessage,
  ): PromisedResult<Message, IngestError> => {
    const store = sqlStakeholderStore(db);
    const now = clock();
    return match(msg.conversationRef)(
      [
        existingConversation$(),
        ({ content }: { content: Num }) =>
          proc(
            store.findConversation(content),
            (found: Option<Conversation>) =>
              matchOption<
                Conversation,
                PromisedResult<
                  Message,
                  IngestError
                >
              >(
                () =>
                  Promise.resolve(
                    err(
                      invalidError({
                        message: `conversation ${content} not found`,
                      }),
                    ),
                  ),
                () =>
                  appendMessage(
                    store,
                    content,
                    msg,
                    now,
                  ),
              )(found),
          ),
      ],
      [
        newConversation$(),
        ({
          content: spec,
        }: {
          content: {
            contentPath: Option<SoftStr>;
            kind: ConversationKind;
            visibility: Visibility;
          };
        }) =>
          transaction<
            undefined,
            Message,
            IngestError
          >(db, () =>
            proc(
              store.saveConversation(
                conversation({
                  id: 0,
                  contentPath: spec.contentPath,
                  kind: spec.kind,
                  status: "open",
                  visibility: spec.visibility,
                  createdBy: msg.authorSubject,
                  source: msg.source,
                  createdAt: now,
                  updatedAt: now,
                }),
              ),
              (cid: Num) =>
                appendMessage(
                  store,
                  cid,
                  msg,
                  now,
                ),
            ),
          )(undefined),
      ],
    );
  };
