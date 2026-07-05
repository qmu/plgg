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
import { type StakeholderStore } from "plgg-content/Stakeholder/model/StakeholderStore";
import { conversation } from "plgg-content/Stakeholder/model/Conversation";
import { message } from "plgg-content/Stakeholder/model/Message";
import { openStakeholderStore } from "plgg-content/Stakeholder/usecase/openStakeholderStore";
import { sqlStakeholderStore } from "plgg-content/Stakeholder/Sql/stakeholderStore";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const freshStore =
  async (): Promise<StakeholderStore> => {
    const db = must(
      await openStakeholderStore(":memory:"),
    );
    return sqlStakeholderStore(db);
  };

const openRequest = (path: string) =>
  conversation({
    id: 0,
    contentPath: some(path),
    kind: "request",
    status: "open",
    visibility: "public",
    createdBy: none(),
    source: "web",
    createdAt: 10,
    updatedAt: 10,
  });

test("save + find + list a conversation and its message round-trip", async () => {
  const store = await freshStore();
  const cid = must(
    await store.saveConversation(
      openRequest("blog/x.md"),
    ),
  );
  must(
    await store.saveMessage(
      message({
        id: 0,
        conversationId: cid,
        authorSubject: some("s1"),
        authorKind: "guest",
        body: "hello there",
        source: "web",
        createdAt: 11,
      }),
    ),
  );
  const found = must(
    await store.findConversation(cid),
  );
  const msgs = must(
    await store.listMessages(cid),
  );
  const byStatus = must(
    await store.listConversations({
      status: some("open"),
      contentPath: none(),
    }),
  );
  const byPath = must(
    await store.listConversations({
      status: none(),
      contentPath: some("blog/x.md"),
    }),
  );
  return all([
    check(
      isSome(found) &&
        found.content.kind === "request" &&
        found.content.visibility === "public",
      toBe(true),
    ),
    check(msgs.length, toBe(1)),
    check(
      msgs[0]?.body ?? "",
      toBe("hello there"),
    ),
    check(msgs[0]?.authorKind ?? "", toBe("guest")),
    check(byStatus.length, toBe(1)),
    check(byPath.length, toBe(1)),
  ]);
});

test("findConversation of an unknown id is None", async () => {
  const store = await freshStore();
  return check(
    isSome(must(await store.findConversation(999))),
    toBe(false),
  );
});

test("a filter that matches nothing returns an empty list", async () => {
  const store = await freshStore();
  must(
    await store.saveConversation(
      openRequest("blog/y.md"),
    ),
  );
  const closed = must(
    await store.listConversations({
      status: some("closed"),
      contentPath: none(),
    }),
  );
  return check(closed.length, toBe(0));
});

test("updateStatus persists a validated lifecycle move", async () => {
  const store = await freshStore();
  const cid = must(
    await store.saveConversation(
      openRequest("blog/z.md"),
    ),
  );
  must(
    await store.updateStatus(cid, "addressed", 20),
  );
  const found = must(
    await store.findConversation(cid),
  );
  return all([
    check(
      isSome(found) &&
        found.content.status === "addressed",
      toBe(true),
    ),
    check(
      isSome(found) &&
        found.content.updatedAt === 20,
      toBe(true),
    ),
  ]);
});
