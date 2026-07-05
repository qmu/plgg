import {
  type Option,
  type Box,
  type Num,
  type SoftStr,
  box,
  pattern,
} from "plgg";
import { type ConversationKind } from "plgg-content/Stakeholder/model/ConversationKind";
import { type Visibility } from "plgg-content/Stakeholder/model/Visibility";
import { type AuthorKind } from "plgg-content/Stakeholder/model/AuthorKind";
import { type MessageSource } from "plgg-content/Stakeholder/model/MessageSource";

/**
 * Where an {@link IngestMessage} lands: onto an EXISTING
 * conversation (by its durable id) or a NEW one (opened with
 * these attributes). A closed union folded with the `$`
 * matchers.
 */
export type ConversationRef =
  | Box<"ExistingConversation", Num>
  | Box<
      "NewConversation",
      Readonly<{
        contentPath: Option<SoftStr>;
        kind: ConversationKind;
        visibility: Visibility;
      }>
    >;

export const existingConversation = (
  id: Num,
): ConversationRef =>
  box("ExistingConversation")(id);

export const newConversation = (spec: {
  contentPath: Option<SoftStr>;
  kind: ConversationKind;
  visibility: Visibility;
}): ConversationRef =>
  box("NewConversation")(spec);

export const existingConversation$ = () =>
  pattern("ExistingConversation")();
export const newConversation$ = () =>
  pattern("NewConversation")();

/**
 * The ONE input every writer of the stakeholder store hands
 * in — the web submission surface, the admin console, and
 * (ticket 25) the voice agent's transcript. See the WRITTEN
 * INGESTION CONTRACT below.
 */
export type IngestMessage = Readonly<{
  conversationRef: ConversationRef;
  body: SoftStr;
  authorKind: AuthorKind;
  authorSubject: Option<SoftStr>;
  source: MessageSource;
}>;

/** Assemble an {@link IngestMessage}. Performs nothing. */
export const ingestMessage = (
  m: IngestMessage,
): IngestMessage => m;

/**
 * ## Written ingestion contract
 *
 * `ingest(store)(msg)` is the SINGLE entry point for adding to
 * the stakeholder store, and it guarantees:
 *
 * 1. **Atomicity** — a `NewConversation` opens the conversation
 *    AND writes its first message in ONE transaction; either
 *    both land or neither does. An `ExistingConversation` that
 *    is not found is a typed `Err`, never a silently-dropped
 *    or orphaned message.
 * 2. **Durability** — the store is PRIMARY data (D4): writes go
 *    to its own durable file that ticket 16's `rebuildIndex`
 *    never touches. No write is derived or reconstructable.
 * 3. **Provenance is recorded, not inferred** — `authorKind`
 *    and `source` are stored verbatim; the voice agent writes
 *    `{authorKind: "agent", source: "voice"}`, the web surface
 *    `{authorKind: "guest"|"admin", source: "web"}`. `body` is
 *    stored verbatim and is UNTRUSTED (the surface validates,
 *    the reader escapes).
 * 4. **Visibility gates the feed, not the store** — every
 *    message is durable regardless of visibility; only a
 *    `public` conversation projects into the RAG index
 *    (`feedsRag`). Flipping visibility never deletes durable
 *    rows, only what the derived index sees.
 * 5. **Lifecycle only through the machine** — a status change
 *    goes through `transitionStatus`; an illegal move is an
 *    `Err` and never reaches a row.
 *
 * Ticket 25's voice agent MUST land into this contract
 * unchanged — it is the stable seam between the agent and the
 * durable store.
 */
