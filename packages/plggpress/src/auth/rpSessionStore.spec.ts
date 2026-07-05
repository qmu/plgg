import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  isErr,
  isSome,
  isNone,
} from "plgg";
import { openDb } from "plgg-content";
import {
  type RpSessionStore,
  sqlRpSessionStore,
  memoryRpSessionStore,
  initRpSessionSchema,
} from "plggpress/auth/rpSessionStore";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const session = {
  id: "sess-1",
  subject: "user-42",
  expiresAt: 1_700_000_000,
};

const roundTrip = async (
  store: RpSessionStore,
): Promise<boolean> => {
  must(await store.save(session));
  const found = must(await store.find("sess-1"));
  const taken = must(await store.take("sess-1"));
  const afterTake = must(
    await store.find("sess-1"),
  );
  return (
    isSome(found) &&
    isSome(taken) &&
    isNone(afterTake)
  );
};

test("memory store: save → find → take deletes", async () =>
  check(
    await roundTrip(memoryRpSessionStore()),
    toBe(true),
  ));

test("sql store: save → find → take deletes", async () => {
  const db = openDb(":memory:");
  must(await initRpSessionSchema(db));
  return check(
    await roundTrip(sqlRpSessionStore(db)),
    toBe(true),
  );
});

test("finding an unknown id is None (both stores)", async () => {
  const db = openDb(":memory:");
  must(await initRpSessionSchema(db));
  return all([
    check(
      isNone(
        must(
          await memoryRpSessionStore().find(
            "nope",
          ),
        ),
      ),
      toBe(true),
    ),
    check(
      isNone(
        must(
          await sqlRpSessionStore(db).find(
            "nope",
          ),
        ),
      ),
      toBe(true),
    ),
  ]);
});

test("save upserts by id (both stores)", async () => {
  const store = memoryRpSessionStore();
  must(await store.save(session));
  must(
    await store.save({
      ...session,
      subject: "user-99",
    }),
  );
  const found = must(await store.find("sess-1"));
  return check(
    isSome(found) && found.content.subject,
    toBe("user-99"),
  );
});
