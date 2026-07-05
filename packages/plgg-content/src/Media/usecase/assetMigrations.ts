import { box, some } from "plgg";
import {
  type Migration,
  migration,
} from "plgg-db-migration";

/**
 * The asset durable schema. REVERSIBLE (up + down), a table
 * namespace DISTINCT from ticket 16's derived index — an
 * uploaded asset is PRIMARY, DB-only staged data until export
 * (ticket 23, D4). CONTENT-ADDRESSED: `hash` is UNIQUE, so an
 * identical re-upload dedupes to the same row; `bytes` is the
 * raw BLOB. Indexed for the per-status + per-uploader admin
 * lists.
 */
const CREATE_UP = `
CREATE TABLE assets (
  id INTEGER PRIMARY KEY,
  hash TEXT NOT NULL UNIQUE,
  content_path TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'staged',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  bytes BLOB NOT NULL
);
CREATE INDEX assets_status ON assets(status);
CREATE INDEX assets_created_by ON assets(created_by);
CREATE INDEX assets_content_path ON assets(content_path);
`.trim();

const CREATE_DOWN = `
DROP TABLE assets;
`.trim();

/**
 * The asset store's migrations, built in code (so they ship in
 * the dist and a same-process consumer opens the store without
 * an unpackaged migrations dir). The version is a known-valid
 * literal, `box`-constructed — no dead `asVersion` branch.
 */
export const assetMigrations =
  (): ReadonlyArray<Migration> => [
    migration({
      version: box("Version")("20260705000003"),
      name: "create_media_schema",
      up: CREATE_UP,
      down: some(CREATE_DOWN),
      upTransaction: true,
      downTransaction: true,
    }),
  ];
