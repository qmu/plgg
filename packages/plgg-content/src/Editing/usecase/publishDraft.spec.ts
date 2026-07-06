import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type Option,
  type SoftStr,
  isErr,
  isSome,
  ok,
  some,
  none,
} from "plgg";
import { type Db } from "plgg-sql";
import { openDraftStore } from "plgg-content/Editing/usecase/openDraftStore";
import { sqlDraftStore } from "plgg-content/Editing/Sql/draftStore";
import {
  openDraft,
  submitDraft,
} from "plgg-content/Editing/usecase/editDraft";
import {
  type ExportFs,
  publishDraft,
} from "plgg-content/Editing/usecase/publishDraft";

const NOW = 1000;

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const fsStub = (current: Option<SoftStr>) => {
  const writes: Array<{
    path: SoftStr;
    content: SoftStr;
  }> = [];
  const fs: ExportFs = {
    currentHash: async () => current,
    writeSource: async (
      path: SoftStr,
      content: SoftStr,
    ) => {
      writes.push({ path, content });
      return ok(null);
    },
  };
  return { fs, writes };
};

/** Seed a SUBMITTED draft owned by guest-1 at `path` with base hash `base`. */
const submittedDraft = async (
  db: Db,
  path: string,
  base: Option<SoftStr>,
  body: string,
): Promise<number> => {
  const d = must(
    await openDraft(db, () => NOW)(
      path,
      "guest-1",
      base,
      body,
    ),
  );
  must(
    await submitDraft(db, () => NOW)(
      d.id,
      "guest-1",
    ),
  );
  return d.id;
};

test("a clean base exports the draft: writes the file + marks exported", async () => {
  const db = must(
    await openDraftStore(":memory:"),
  );
  const id = await submittedDraft(
    db,
    "blog/x.md",
    some("hash-1"),
    "# Edited body",
  );
  const { fs, writes } = fsStub(some("hash-1"));
  const outcome = must(
    await publishDraft(db, fs, () => 2000)(id),
  );
  const found = must(
    await sqlDraftStore(db).findDraft(id),
  );
  return all([
    check(outcome, toBe("exported")),
    check(writes.length, toBe(1)),
    check(
      writes[0]?.content ?? "",
      toBe("# Edited body"),
    ),
    check(
      isSome(found) &&
        found.content.status === "exported",
      toBe(true),
    ),
  ]);
});

test("a changed base marks conflicted and writes NOTHING", async () => {
  const db = must(
    await openDraftStore(":memory:"),
  );
  const id = await submittedDraft(
    db,
    "blog/y.md",
    some("hash-1"),
    "body",
  );
  const { fs, writes } = fsStub(
    some("hash-CHANGED"),
  );
  const outcome = must(
    await publishDraft(db, fs, () => 2000)(id),
  );
  const found = must(
    await sqlDraftStore(db).findDraft(id),
  );
  return all([
    check(outcome, toBe("conflicted")),
    check(writes.length, toBe(0)),
    check(
      isSome(found) &&
        found.content.status === "conflicted",
      toBe(true),
    ),
  ]);
});

test("an unsafe target path is rejected with no write", async () => {
  const db = must(
    await openDraftStore(":memory:"),
  );
  const id = await submittedDraft(
    db,
    "../escape.md",
    none(),
    "body",
  );
  const { fs, writes } = fsStub(none());
  const r = await publishDraft(
    db,
    fs,
    () => 2000,
  )(id);
  return all([
    check(isErr(r), toBe(true)),
    check(writes.length, toBe(0)),
  ]);
});

test("publishing an unknown draft errors", async () => {
  const db = must(
    await openDraftStore(":memory:"),
  );
  const { fs } = fsStub(none());
  return check(
    isErr(
      await publishDraft(db, fs, () => NOW)(999),
    ),
    toBe(true),
  );
});
