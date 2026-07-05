import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type Result, isErr } from "plgg";
import { sql, query, exec } from "plgg-sql";
import { isReversible } from "plgg-db-migration";
import { assetMigrations } from "plgg-content/Media/usecase/assetMigrations";
import { openAssetStore } from "plgg-content/Media/usecase/openAssetStore";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

test("the initial media migration is reversible", () => {
  const migs = assetMigrations();
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

test("openAssetStore creates a usable assets schema with a UNIQUE hash (dedup)", async () => {
  const db = must(
    await openAssetStore(":memory:"),
  );
  must(
    await exec(db)(
      sql`INSERT INTO assets (hash, content_path, mime, size, status, created_by, created_at, updated_at, bytes_b64) VALUES ('h1', 'assets/a.png', 'image/png', 3, 'staged', 'g1', 0, 0, 'QUJD')`,
    ),
  );
  // a second insert of the SAME hash violates UNIQUE
  const dup = await exec(db)(
    sql`INSERT INTO assets (hash, content_path, mime, size, status, created_by, created_at, updated_at, bytes_b64) VALUES ('h1', 'assets/b.png', 'image/png', 3, 'staged', 'g1', 0, 0, 'QUJD')`,
  );
  const rows = must(
    await query(db)(
      sql`SELECT hash FROM assets`,
    ),
  );
  return all([
    check(isErr(dup), toBe(true)),
    check(rows.length, toBe(1)),
  ]);
});

test("openAssetStore records the applied version", async () => {
  const db = must(
    await openAssetStore(":memory:"),
  );
  const applied = must(
    await query(db)(
      sql`SELECT version FROM schema_migrations`,
    ),
  );
  return check(applied.length, toBe(1));
});
