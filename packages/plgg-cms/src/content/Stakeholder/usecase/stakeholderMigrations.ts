import { box, some } from "plgg";
import {
  type Migration,
  migration,
} from "plgg-db-migration";

/**
 * The initial durable schema. REVERSIBLE (up + down), NOT a
 * one-shot `execScript` or drop-and-recreate — this is PRIMARY
 * data (D4), so a schema change must migrate rows, never wipe
 * them. `conversations` links to an article by its durable
 * `content_path` (nullable), never by a FK into ticket 16's
 * derived index; `messages` cascade-delete with their
 * conversation. Indexed for the admin status filter and the
 * per-article lookup.
 */
const CREATE_UP = `
CREATE TABLE conversations (
  id INTEGER PRIMARY KEY,
  content_path TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  visibility TEXT NOT NULL DEFAULT 'private',
  created_by TEXT,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  author_subject TEXT,
  author_kind TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX conversations_status ON conversations(status);
CREATE INDEX conversations_content_path ON conversations(content_path);
`.trim();

const CREATE_DOWN = `
DROP TABLE messages;
DROP TABLE conversations;
`.trim();

/**
 * The stakeholder store's migrations, built in code (so they
 * ship in the dist and a same-process consumer can open the
 * store without an unpackaged migrations dir — the OP-schema
 * lesson from ticket 19). The version is a known-valid
 * 14-digit literal, so it is constructed through `box`
 * directly rather than the `asVersion` caster — no dead
 * validation branch.
 */
export const stakeholderMigrations =
  (): ReadonlyArray<Migration> => [
    migration({
      version: box("Version")("20260705000001"),
      name: "create_stakeholder_schema",
      up: CREATE_UP,
      down: some(CREATE_DOWN),
      upTransaction: true,
      downTransaction: true,
    }),
  ];
