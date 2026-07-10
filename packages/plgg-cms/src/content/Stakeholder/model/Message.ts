import {
  type Option,
  type Num,
  type SoftStr,
} from "plgg";
import { type AuthorKind } from "plgg-cms/content/Stakeholder/model/AuthorKind";
import { type MessageSource } from "plgg-cms/content/Stakeholder/model/MessageSource";

/**
 * One message in a {@link Conversation} — PRIMARY data (D4).
 * `authorSubject` is the opaque subject identifier (a `SoftStr`,
 * `None` for an anonymous or agent write), `authorKind` names
 * who wrote it, `source` how it arrived. `body` is stored
 * verbatim and is UNTRUSTED — the submission surface validates
 * and the reader escapes; the store never interprets it. Pure
 * data: the {@link message} constructor performs nothing.
 */
export type Message = Readonly<{
  id: Num;
  conversationId: Num;
  authorSubject: Option<SoftStr>;
  authorKind: AuthorKind;
  body: SoftStr;
  source: MessageSource;
  createdAt: Num;
}>;

/** Assemble a {@link Message}. Performs nothing. */
export const message = (m: Message): Message => m;
