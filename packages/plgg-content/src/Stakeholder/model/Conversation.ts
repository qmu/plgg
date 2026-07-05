import {
  type Option,
  type Num,
  type SoftStr,
} from "plgg";
import { type ConversationKind } from "plgg-content/Stakeholder/model/ConversationKind";
import { type ConversationStatus } from "plgg-content/Stakeholder/model/ConversationStatus";
import { type Visibility } from "plgg-content/Stakeholder/model/Visibility";
import { type MessageSource } from "plgg-content/Stakeholder/model/MessageSource";

/**
 * A stakeholder conversation — a request, comment, or thread
 * (its {@link ConversationKind}) — PRIMARY, irreplaceable data
 * (D4). It links to an article by its durable **content path**
 * (`contentPath`), NEVER by a foreign key into ticket 16's
 * derived `documents.id` (which is re-numbered on rebuild).
 * `createdBy` is the opaque subject identifier of the author
 * (a `SoftStr`, not a plgg-auth `Subject`, to keep plgg-content
 * decoupled from the auth package). Pure data: the
 * {@link conversation} constructor performs nothing.
 */
export type Conversation = Readonly<{
  id: Num;
  contentPath: Option<SoftStr>;
  kind: ConversationKind;
  status: ConversationStatus;
  visibility: Visibility;
  createdBy: Option<SoftStr>;
  source: MessageSource;
  createdAt: Num;
  updatedAt: Num;
}>;

/** Assemble a {@link Conversation}. Performs nothing. */
export const conversation = (
  c: Conversation,
): Conversation => c;
