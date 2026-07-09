import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type Result, isErr } from "plgg";
import { sql, query, exec } from "plgg-sql";
import { isReversible } from "plgg-db-migration";
import { stakeholderMigrations } from "plgg-cms/content/Stakeholder/usecase/stakeholderMigrations";
import { openStakeholderStore } from "plgg-cms/content/Stakeholder/usecase/openStakeholderStore";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

test("the initial migration is reversible (carries a down section)", () => {
  const migs = stakeholderMigrations();
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

test("openStakeholderStore creates a usable conversations+messages schema and cascades", async () => {
  const db = must(
    await openStakeholderStore(":memory:"),
  );
  must(
    await exec(db)(
      sql`INSERT INTO conversations (id, kind, status, visibility, source, created_at, updated_at) VALUES (1, 'request', 'open', 'private', 'web', 0, 0)`,
    ),
  );
  must(
    await exec(db)(
      sql`INSERT INTO messages (id, conversation_id, author_kind, body, source, created_at) VALUES (1, 1, 'guest', 'please fix', 'web', 0)`,
    ),
  );
  const before = must(
    await query(db)(
      sql`SELECT id FROM messages`,
    ),
  );
  // deleting the conversation cascades to its messages (FK ON DELETE CASCADE)
  must(
    await exec(db)(
      sql`DELETE FROM conversations WHERE id = 1`,
    ),
  );
  const after = must(
    await query(db)(
      sql`SELECT id FROM messages`,
    ),
  );
  return all([
    check(before.length, toBe(1)),
    check(after.length, toBe(0)),
  ]);
});

test("openStakeholderStore records the applied version (re-open is idempotent)", async () => {
  const db = must(
    await openStakeholderStore(":memory:"),
  );
  const applied = must(
    await query(db)(
      sql`SELECT version FROM schema_migrations`,
    ),
  );
  return check(applied.length, toBe(1));
});
