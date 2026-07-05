import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type Result, isErr } from "plgg";
import { sql, query, exec } from "plgg-sql";
import { isReversible } from "plgg-db-migration";
import { editingMigrations } from "plgg-content/Editing/usecase/editingMigrations";
import { openDraftStore } from "plgg-content/Editing/usecase/openDraftStore";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

test("the initial editing migration is reversible", () => {
  const migs = editingMigrations();
  const first = migs[0];
  return all([
    check(migs.length, toBe(1)),
    check(
      first === undefined
        ? false
        : isReversible(first),
      toBe(true),
    ),
  ]);
});

test("openDraftStore creates a usable drafts+revisions schema and cascades", async () => {
  const db = must(
    await openDraftStore(":memory:"),
  );
  must(
    await exec(db)(
      sql`INSERT INTO drafts (id, content_path, status, created_by, created_at, updated_at) VALUES (1, 'blog/x.md', 'draft', 'guest-1', 0, 0)`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO revisions (id, draft_id, ordinal, body, created_at) VALUES (1, 1, 1, 'hello', 0)`,
    ),
  );
  const before = must(
    await query(db)(
      sql`SELECT id FROM revisions`,
    ),
  );
  must(
    await exec(db)(
      sql`DELETE FROM drafts WHERE id = 1`,
    ),
  );
  const after = must(
    await query(db)(
      sql`SELECT id FROM revisions`,
    ),
  );
  return all([
    check(before.length, toBe(1)),
    check(after.length, toBe(0)),
  ]);
});

test("openDraftStore records the applied version", async () => {
  const db = must(
    await openDraftStore(":memory:"),
  );
  const applied = must(
    await query(db)(
      sql`SELECT version FROM schema_migrations`,
    ),
  );
  return check(applied.length, toBe(1));
});
