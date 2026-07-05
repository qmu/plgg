import {
  type Option,
  type Num,
  type SoftStr,
  type PromisedResult,
  type InvalidError,
  type Defect,
} from "plgg";
import { type SqlError } from "plgg-sql";
import { type Conversation } from "plgg-content/Stakeholder/model/Conversation";
import { type Message } from "plgg-content/Stakeholder/model/Message";
import { type ConversationStatus } from "plgg-content/Stakeholder/model/ConversationStatus";

/** The admin/article filters over the durable conversation list. */
export type ConversationFilter = Readonly<{
  status: Option<ConversationStatus>;
  contentPath: Option<SoftStr>;
}>;

/**
 * The DB-PRIMARY stakeholder persistence seam (D4). Every read
 * decodes through casters (a mis-shaped row → `None`/dropped,
 * never garbage) and every method is a `Result`, never a
 * throw. `save*` return the DB-assigned id. `updateStatus`
 * takes an ALREADY-validated target (the ingest usecase runs
 * `transitionStatus` first), so the store never persists an
 * illegal lifecycle move.
 */
export type StakeholderStore = Readonly<{
  saveConversation: (
    c: Conversation,
  ) => PromisedResult<
    Num,
    SqlError | InvalidError | Defect
  >;
  findConversation: (
    id: Num,
  ) => PromisedResult<
    Option<Conversation>,
    SqlError | InvalidError | Defect
  >;
  listConversations: (
    filter: ConversationFilter,
  ) => PromisedResult<
    ReadonlyArray<Conversation>,
    SqlError | InvalidError | Defect
  >;
  saveMessage: (
    m: Message,
  ) => PromisedResult<
    Num,
    SqlError | InvalidError | Defect
  >;
  listMessages: (
    conversationId: Num,
  ) => PromisedResult<
    ReadonlyArray<Message>,
    SqlError | InvalidError | Defect
  >;
  updateStatus: (
    id: Num,
    status: ConversationStatus,
    updatedAt: Num,
  ) => PromisedResult<null, SqlError | Defect>;
}>;
