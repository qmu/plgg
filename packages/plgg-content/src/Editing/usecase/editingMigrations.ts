import { box, some } from "plgg";
import {
  type Migration,
  migration,
} from "plgg-db-migration";

/**
 * The draft/revision durable schema. REVERSIBLE (up + down),
 * in a table namespace DISTINCT from ticket 16's derived index
 * — a draft is authored content NOT in git, so it is PRIMARY,
 * non-rebuildable data (ticket 22, D4). `revisions` cascade
 * with their draft. Indexed for the per-author + per-status +
 * per-path admin/guest lists.
 */
const CREATE_UP = `
CREATE TABLE drafts (
  id INTEGER PRIMARY KEY,
  content_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  base_revision_hash TEXT,
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE revisions (
  id INTEGER PRIMARY KEY,
  draft_id INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX drafts_created_by ON drafts(created_by);
CREATE INDEX drafts_status ON drafts(status);
CREATE INDEX drafts_content_path ON drafts(content_path);
CREATE INDEX revisions_draft_id ON revisions(draft_id);
`.trim();

const CREATE_DOWN = `
DROP TABLE revisions;
DROP TABLE drafts;
`.trim();

/**
 * The draft store's migrations, built in code (so they ship in
 * the dist and a same-process consumer opens the store without
 * an unpackaged migrations dir). The version is a known-valid
 * literal, so it is `box`-constructed — no dead `asVersion`
 * branch.
 */
export const editingMigrations =
  (): ReadonlyArray<Migration> => [
    migration({
      version: box("Version")("20260705000002"),
      name: "create_editing_schema",
      up: CREATE_UP,
      down: some(CREATE_DOWN),
      upTransaction: true,
      downTransaction: true,
    }),
  ];
