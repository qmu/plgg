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
import { openDraftStore } from "plgg-cms/content/Editing/usecase/openDraftStore";
import { sqlDraftStore } from "plgg-cms/content/Editing/Sql/draftStore";
import { checkBase } from "plgg-cms/content/Editing/usecase/checkBase";
import {
  openDraft,
  autosave,
  submitDraft,
  discardDraft,
} from "plgg-cms/content/Editing/usecase/editDraft";

const NOW = 1000;

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const fresh = async (): Promise<Db> =>
  must(await openDraftStore(":memory:"));

test("checkBase folds every base/current combination", () =>
  all([
    check(checkBase(none(), none()), toBe("clean")),
    check(
      checkBase(some("h"), some("h")),
      toBe("clean"),
    ),
    check(
      checkBase(some("h"), some("x")),
      toBe("conflict"),
    ),
    check(
      checkBase(none(), some("h")),
      toBe("conflict"),
    ),
    check(
      checkBase(some("h"), none()),
      toBe("conflict"),
    ),
  ]));

test("openDraft creates a draft with its first revision", async () => {
  const db = await fresh();
  const d = must(
    await openDraft(db, () => NOW)(
      "blog/x.md",
      "guest-1",
      some("base"),
      "# hello",
    ),
  );
  const latest = must(
    await sqlDraftStore(db).latestRevision(d.id),
  );
  return all([
    check(d.status, toBe("draft")),
    check(d.createdBy, toBe("guest-1")),
    check(
      isSome(latest) &&
        latest.content.body === "# hello",
      toBe(true),
    ),
  ]);
});

test("autosave appends the owner's next revision", async () => {
  const db = await fresh();
  const d = must(
    await openDraft(db, () => NOW)(
      "blog/x.md",
      "guest-1",
      none(),
      "v1",
    ),
  );
  must(
    await autosave(db, () => 2000)(
      d.id,
      "guest-1",
      "v2",
    ),
  );
  const latest = must(
    await sqlDraftStore(db).latestRevision(d.id),
  );
  return all([
    check(
      isSome(latest) &&
        latest.content.ordinal === 2,
      toBe(true),
    ),
    check(
      isSome(latest) &&
        latest.content.body === "v2",
      toBe(true),
    ),
  ]);
});

test("a non-owner cannot autosave or submit another guest's draft", async () => {
  const db = await fresh();
  const d = must(
    await openDraft(db, () => NOW)(
      "blog/x.md",
      "guest-1",
      none(),
      "v1",
    ),
  );
  return all([
    check(
      isErr(
        await autosave(db, () => NOW)(
          d.id,
          "intruder",
          "x",
        ),
      ),
      toBe(true),
    ),
    check(
      isErr(
        await submitDraft(db, () => NOW)(
          d.id,
          "intruder",
        ),
      ),
      toBe(true),
    ),
  ]);
});

test("submit + discard follow the lifecycle; a repeated submit is illegal", async () => {
  const db = await fresh();
  const d = must(
    await openDraft(db, () => NOW)(
      "blog/x.md",
      "guest-1",
      none(),
      "v1",
    ),
  );
  const submitted = await submitDraft(
    db,
    () => NOW,
  )(d.id, "guest-1");
  const again = await submitDraft(db, () => NOW)(
    d.id,
    "guest-1",
  );
  const found = must(
    await sqlDraftStore(db).findDraft(d.id),
  );
  return all([
    check(isErr(submitted), toBe(false)),
    // submitted -> submitted is illegal
    check(isErr(again), toBe(true)),
    check(
      isSome(found) &&
        found.content.status === "submitted",
      toBe(true),
    ),
  ]);
});

test("discard of an owned draft moves it to discarded", async () => {
  const db = await fresh();
  const d = must(
    await openDraft(db, () => NOW)(
      "blog/x.md",
      "guest-1",
      none(),
      "v1",
    ),
  );
  must(
    await discardDraft(db, () => NOW)(
      d.id,
      "guest-1",
    ),
  );
  const found = must(
    await sqlDraftStore(db).findDraft(d.id),
  );
  return check(
    isSome(found) &&
      found.content.status === "discarded",
    toBe(true),
  );
});

test("submit of an unknown draft errors", async () => {
  const db = await fresh();
  return check(
    isErr(
      await submitDraft(db, () => NOW)(
        999,
        "guest-1",
      ),
    ),
    toBe(true),
  );
});
