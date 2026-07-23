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
  some,
  none,
} from "plgg";
import { type Db } from "plgg-sql";
import { type StakeholderStore } from "plgg-cms/content/Stakeholder/model/StakeholderStore";
import {
  ingestMessage,
  newConversation,
  existingConversation,
} from "plgg-cms/content/Stakeholder/model/Ingestion";
import { openStakeholderStore } from "plgg-cms/content/Stakeholder/usecase/openStakeholderStore";
import { sqlStakeholderStore } from "plgg-cms/content/Stakeholder/Sql/stakeholderStore";
import { ingest } from "plgg-cms/content/Stakeholder/usecase/ingest";
import { changeStatus } from "plgg-cms/content/Stakeholder/usecase/changeStatus";

const NOW = 1_700_000_000;

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const fresh = async (): Promise<{
  db: Db;
  store: StakeholderStore;
}> => {
  const db = must(
    await openStakeholderStore(":memory:"),
  );
  return { db, store: sqlStakeholderStore(db) };
};

const newRequest = ingestMessage({
  conversationRef: newConversation({
    contentPath: some("blog/x.md"),
    kind: "request",
    visibility: "public",
  }),
  body: "please fix the typo",
  authorKind: "guest",
  authorSubject: some("s1"),
  source: "web",
});

test("ingest of a new conversation opens it and its first message atomically", async () => {
  const { db, store } = await fresh();
  const m = must(
    await ingest(db, () => NOW)(newRequest),
  );
  const convs = must(
    await store.listConversations({
      status: none(),
      contentPath: none(),
    }),
  );
  const msgs = must(
    await store.listMessages(m.conversationId),
  );
  return all([
    check(convs.length, toBe(1)),
    check(
      convs[0]?.status ?? "",
      toBe("open"),
    ),
    check(msgs.length, toBe(1)),
    check(
      msgs[0]?.body ?? "",
      toBe("please fix the typo"),
    ),
  ]);
});

test("ingest of an existing conversation appends a message", async () => {
  const { db, store } = await fresh();
  const first = must(
    await ingest(db, () => NOW)(newRequest),
  );
  must(
    await ingest(db, () => NOW)(
      ingestMessage({
        conversationRef: existingConversation(
          first.conversationId,
        ),
        body: "acknowledged",
        authorKind: "admin",
        authorSubject: none(),
        source: "admin",
      }),
    ),
  );
  const msgs = must(
    await store.listMessages(
      first.conversationId,
    ),
  );
  return check(msgs.length, toBe(2));
});

test("ingest to a missing conversation is an error, no message written", async () => {
  const { db, store } = await fresh();
  const r = await ingest(db, () => NOW)(
    ingestMessage({
      conversationRef: existingConversation(999),
      body: "orphan",
      authorKind: "guest",
      authorSubject: none(),
      source: "web",
    }),
  );
  const msgs = must(await store.listMessages(999));
  return all([
    check(isErr(r), toBe(true)),
    check(msgs.length, toBe(0)),
  ]);
});

test("changeStatus applies a legal move and rejects an illegal one", async () => {
  const { db, store } = await fresh();
  const first = must(
    await ingest(db, () => NOW)(newRequest),
  );
  const cid = first.conversationId;
  const legal = await changeStatus(
    db,
    () => NOW,
  )(cid, "addressed");
  // addressed -> addressed is a same-state no-op: illegal
  const illegal = await changeStatus(
    db,
    () => NOW,
  )(cid, "addressed");
  const conv = must(
    await store.findConversation(cid),
  );
  return all([
    check(isErr(legal), toBe(false)),
    check(isErr(illegal), toBe(true)),
    check(
      isSome(conv) &&
        conv.content.status === "addressed",
      toBe(true),
    ),
  ]);
});

test("changeStatus of a missing conversation is an error", async () => {
  const { db } = await fresh();
  return check(
    isErr(
      await changeStatus(db, () => NOW)(
        999,
        "closed",
      ),
    ),
    toBe(true),
  );
});
