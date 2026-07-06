import {
  type Result,
  type Option,
  type SoftStr,
  type InvalidError,
  ok,
  some,
  none,
  isErr,
  pipe,
  cast,
  mapResult,
  matchOption,
  fromNullable,
  asRawObj,
  asNum,
  asSoftStr,
  forProp,
} from "plgg";

/**
 * Decode a nullable TEXT column: a SQL NULL (JS `null`) is
 * `None`, a string is `Some` — `forOptionProp` can't be used
 * because SQLite always includes the column (present-but-null),
 * so nullability lives in the caster (mirrors ticket 16's
 * `asDocument`).
 */
const asOptionalText = (
  v: unknown,
): Result<Option<SoftStr>, InvalidError> =>
  matchOption<
    unknown,
    Result<Option<SoftStr>, InvalidError>
  >(
    () => ok(none()),
    (s: unknown) => {
      const r = asSoftStr(s);
      return isErr(r) ? r : ok(some(r.content));
    },
  )(fromNullable(v));
import {
  type Conversation,
  conversation,
} from "plgg-content/Stakeholder/model/Conversation";
import {
  type Message,
  message,
} from "plgg-content/Stakeholder/model/Message";
import { asConversationKind } from "plgg-content/Stakeholder/model/ConversationKind";
import { asConversationStatus } from "plgg-content/Stakeholder/model/ConversationStatus";
import { asVisibility } from "plgg-content/Stakeholder/model/Visibility";
import { asAuthorKind } from "plgg-content/Stakeholder/model/AuthorKind";
import { asMessageSource } from "plgg-content/Stakeholder/model/MessageSource";

/**
 * Decode a `conversations` row into a {@link Conversation} —
 * every column through a caster, nullable columns through
 * `forOptionProp`, so a mis-shaped or garbage row reads as an
 * `Err` (the store surfaces it as `None`), never a stored
 * lie. `asRawObj` (not `asObj`) tolerates NULL columns.
 */
export const asConversationRow = (
  row: unknown,
): Result<Conversation, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("id", asNum),
      forProp("content_path", asOptionalText),
      forProp("kind", asConversationKind),
      forProp("status", asConversationStatus),
      forProp("visibility", asVisibility),
      forProp("created_by", asOptionalText),
      forProp("source", asMessageSource),
      forProp("created_at", asNum),
      forProp("updated_at", asNum),
    ),
    mapResult((r) =>
      conversation({
        id: r.id,
        contentPath: r.content_path,
        kind: r.kind,
        status: r.status,
        visibility: r.visibility,
        createdBy: r.created_by,
        source: r.source,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }),
    ),
  );

/** Decode a `messages` row into a {@link Message}. */
export const asMessageRow = (
  row: unknown,
): Result<Message, InvalidError> =>
  pipe(
    cast(
      row,
      asRawObj,
      forProp("id", asNum),
      forProp("conversation_id", asNum),
      forProp("author_subject", asOptionalText),
      forProp("author_kind", asAuthorKind),
      forProp("body", asSoftStr),
      forProp("source", asMessageSource),
      forProp("created_at", asNum),
    ),
    mapResult((r) =>
      message({
        id: r.id,
        conversationId: r.conversation_id,
        authorSubject: r.author_subject,
        authorKind: r.author_kind,
        body: r.body,
        source: r.source,
        createdAt: r.created_at,
      }),
    ),
  );

/** Decode an `id` projection (from an INSERT … RETURNING id). */
export const asIdRow = (
  row: unknown,
): Result<{ id: number }, InvalidError> =>
  cast(row, asRawObj, forProp("id", asNum));
