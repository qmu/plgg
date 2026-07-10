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
import { type DraftStore } from "plgg-cms/content/Editing/model/DraftStore";
import { draft } from "plgg-cms/content/Editing/model/Draft";
import { revision } from "plgg-cms/content/Editing/model/Revision";
import { openDraftStore } from "plgg-cms/content/Editing/usecase/openDraftStore";
import { sqlDraftStore } from "plgg-cms/content/Editing/Sql/draftStore";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const freshStore =
  async (): Promise<DraftStore> => {
    const db = must(
      await openDraftStore(":memory:"),
    );
    return sqlDraftStore(db);
  };

const aDraft = (
  path: string,
  by: string,
) =>
  draft({
    id: 0,
    contentPath: path,
    status: "draft",
    baseRevisionHash: some("h1"),
    createdBy: by,
    createdAt: 10,
    updatedAt: 10,
  });

test("save + find + list a draft and its revisions round-trip", async () => {
  const store = await freshStore();
  const id = must(
    await store.saveDraft(
      aDraft("blog/x.md", "guest-1"),
    ),
  );
  must(
    await store.saveRevision(
      revision({
        id: 0,
        draftId: id,
        ordinal: 1,
        body: "v1",
        createdAt: 11,
      }),
    ),
  );
  must(
    await store.saveRevision(
      revision({
        id: 0,
        draftId: id,
        ordinal: 2,
        body: "v2 latest",
        createdAt: 12,
      }),
    ),
  );
  const found = must(await store.findDraft(id));
  const latest = must(
    await store.latestRevision(id),
  );
  const byAuthor = must(
    await store.listDrafts({
      createdBy: some("guest-1"),
      status: none(),
    }),
  );
  const byStatus = must(
    await store.listDrafts({
      createdBy: none(),
      status: some("draft"),
    }),
  );
  return all([
    check(
      isSome(found) &&
        found.content.contentPath ===
          "blog/x.md",
      toBe(true),
    ),
    // latest = the highest ordinal
    check(
      isSome(latest) &&
        latest.content.body === "v2 latest",
      toBe(true),
    ),
    check(byAuthor.length, toBe(1)),
    check(byStatus.length, toBe(1)),
  ]);
});

test("findDraft / latestRevision of an unknown id are None", async () => {
  const store = await freshStore();
  return all([
    check(
      isSome(must(await store.findDraft(999))),
      toBe(false),
    ),
    check(
      isSome(
        must(await store.latestRevision(999)),
      ),
      toBe(false),
    ),
  ]);
});

test("a filter matching nothing returns empty", async () => {
  const store = await freshStore();
  must(
    await store.saveDraft(
      aDraft("blog/y.md", "guest-2"),
    ),
  );
  const exported = must(
    await store.listDrafts({
      createdBy: none(),
      status: some("exported"),
    }),
  );
  return check(exported.length, toBe(0));
});

test("updateStatus persists a validated move", async () => {
  const store = await freshStore();
  const id = must(
    await store.saveDraft(
      aDraft("blog/z.md", "guest-1"),
    ),
  );
  must(
    await store.updateStatus(id, "submitted", 20),
  );
  const found = must(await store.findDraft(id));
  return all([
    check(
      isSome(found) &&
        found.content.status === "submitted",
      toBe(true),
    ),
    check(
      isSome(found) &&
        found.content.updatedAt === 20,
      toBe(true),
    ),
  ]);
});
