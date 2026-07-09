import {
  type Result,
  type Option,
  type InvalidError,
  ok,
  err,
  some,
  none,
  proc,
  matchResult,
} from "plgg";
import {
  type Db,
  sql,
  query,
  exec,
  decodeRow,
  decodeRows,
} from "plgg-sql";
import { type StakeholderStore } from "plgg-cms/content/Stakeholder/model/StakeholderStore";
import { type Conversation } from "plgg-cms/content/Stakeholder/model/Conversation";
import {
  asConversationRow,
  asMessageRow,
  asIdRow,
} from "plgg-cms/content/Stakeholder/Sql/stakeholderRows";

/** Decode the first row to an Option (empty → None). */
const firstOption = (
  rows: ReadonlyArray<unknown>,
): Result<Option<Conversation>, InvalidError> => {
  const head = rows[0];
  return head === undefined
    ? ok(none())
    : matchResult<
        Conversation,
        InvalidError,
        Result<Option<Conversation>, InvalidError>
      >(
        (e) => err(e),
        (c: Conversation) => ok(some(c)),
      )(asConversationRow(head));
};

/**
 * The {@link StakeholderStore} over a `Db` (the durable file
 * from {@link openStakeholderStore}). Every value is `sql`-
 * bound (no interpolation; an Option binds to NULL, a `Str` is
 * unwrapped), every row decoded through a caster, and `save*`
 * return the auto-assigned id via `RETURNING id`. Two-row
 * writes (a new conversation + its first message) are composed
 * by the ingest usecase inside a transaction; store methods
 * are single statements.
 */
export const sqlStakeholderStore = (
  db: Db,
): StakeholderStore => ({
  saveConversation: (c) =>
    proc(
      query(db)(
        sql`INSERT INTO conversations (content_path, kind, status, visibility, created_by, source, created_at, updated_at) VALUES (${c.contentPath}, ${c.kind}, ${c.status}, ${c.visibility}, ${c.createdBy}, ${c.source}, ${c.createdAt}, ${c.updatedAt}) RETURNING id`,
      ),
      decodeRow(asIdRow),
      (r: { id: number }) => ok(r.id),
    ),
  findConversation: (id) =>
    proc(
      query(db)(
        sql`SELECT * FROM conversations WHERE id = ${id}`,
      ),
      firstOption,
    ),
  listConversations: (filter) =>
    proc(
      query(db)(
        sql`SELECT * FROM conversations WHERE (${filter.status} IS NULL OR status = ${filter.status}) AND (${filter.contentPath} IS NULL OR content_path = ${filter.contentPath}) ORDER BY created_at DESC`,
      ),
      decodeRows(asConversationRow),
    ),
  saveMessage: (m) =>
    proc(
      query(db)(
        sql`INSERT INTO messages (conversation_id, author_subject, author_kind, body, source, created_at) VALUES (${m.conversationId}, ${m.authorSubject}, ${m.authorKind}, ${m.body}, ${m.source}, ${m.createdAt}) RETURNING id`,
      ),
      decodeRow(asIdRow),
      (r: { id: number }) => ok(r.id),
    ),
  listMessages: (conversationId) =>
    proc(
      query(db)(
        sql`SELECT * FROM messages WHERE conversation_id = ${conversationId} ORDER BY created_at ASC`,
      ),
      decodeRows(asMessageRow),
    ),
  updateStatus: (id, status, updatedAt) =>
    proc(
      exec(db)(
        sql`UPDATE conversations SET status = ${status}, updated_at = ${updatedAt} WHERE id = ${id}`,
      ),
      () => ok(null),
    ),
});
