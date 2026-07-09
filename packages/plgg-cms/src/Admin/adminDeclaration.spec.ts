import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type SoftStr,
  isErr,
  isOk,
  isSome,
  ok,
  some,
  none,
  box,
} from "plgg";
import { heading, para } from "plgg-md";
import {
  type Db,
  openIndex,
  registerCollection,
  indexDocument,
  collectionSchema,
  schemaField,
  openDb,
  openStakeholderStore,
  openDraftStore,
  openAssetStore,
  uploadAsset,
  openDraft,
  ingest,
  ingestMessage,
  newConversation,
} from "plgg-content";
import {
  type Source,
  type Row,
  type Path,
  type SchedulerMsg,
  schedule,
} from "plgg-ui";
import { type Cmd } from "plgg-view/client";
import {
  type AccountStore,
  sqlAccountStore,
  ACCOUNT_SCHEMA,
  account,
  asUsername,
} from "plgg-auth";
import { adminDeclaration } from "plgg-cms/Admin/adminDeclaration";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const HASH = box("PasswordHash")(
  "pbkdf2$sha256$600000$c2FsdA$ZGVyaXZlZA",
);

const seed = async (): Promise<{
  db: Db;
  accounts: AccountStore;
  stakeholderDb: Db;
  draftDb: Db;
  assetDb: Db;
}> => {
  const db = must(await openIndex(":memory:"));
  await db.execScript(ACCOUNT_SCHEMA);
  must(
    await registerCollection(db)(
      collectionSchema("blog", [
        schemaField("draft", "boolean", true),
      ]),
    ),
  );
  must(
    await indexDocument(db)({
      collection: "blog",
      path: "blog/hello.md",
      title: some("Hello"),
      attributesJson: '{"draft":false}',
      blocks: [heading(1, "Hello"), para("hi")],
      contentHash: "h1",
      updatedAt: "2026-01-01T00:00:00Z",
    }),
  );
  const accounts = sqlAccountStore(db);
  const alice = asUsername("alice");
  if (isOk(alice)) {
    await accounts.saveAccount(
      account(
        box("Subject")("s1"),
        alice.content,
        HASH,
        0,
      ),
    );
  }
  const stakeholderDb = must(
    await openStakeholderStore(":memory:"),
  );
  must(
    await ingest(stakeholderDb, () => 100)(
      ingestMessage({
        conversationRef: newConversation({
          contentPath: none(),
          kind: "request",
          visibility: "public",
        }),
        body: "a stakeholder request",
        authorKind: "guest",
        authorSubject: none(),
        source: "web",
      }),
    ),
  );
  const draftDb = must(
    await openDraftStore(":memory:"),
  );
  must(
    await openDraft(draftDb, () => 100)(
      "blog/edit.md",
      "guest-1",
      none(),
      "# draft body",
    ),
  );
  const assetDb = must(
    await openAssetStore(":memory:"),
  );
  must(
    await uploadAsset(assetDb, () => 100)({
      contentPath: "assets/a.png",
      mime: "image/png",
      size: 3,
      hash: "ah1",
      bytesB64: "QUJD",
      createdBy: "g1",
    }),
  );
  return { db, accounts, stakeholderDb, draftDb, assetDb };
};

const drive = (
  source: Source,
  path: Path,
): Promise<Result<ReadonlyArray<Row>, Error>> =>
  source.__tag === "Async"
    ? source.content(path)
    : source.__tag === "Sync"
      ? Promise.resolve(
          ok(source.content(path)),
        )
      : // Dynamic sources carry no read (consumer-owned
        // rows); the admin declaration uses none, so this
        // arm is unreachable here — resolve empty for
        // totality.
        Promise.resolve(ok([]));

const sourceOf = (
  db: Db,
  accounts: AccountStore,
  stakeholderDb: Db,
  draftDb: Db,
  assetDb: Db,
  id: SoftStr,
): Source => {
  const found = adminDeclaration(
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  ).collections.find((c) => c.id === id);
  if (found === undefined) {
    throw new Error(`no collection ${id}`);
  }
  return found.source;
};

/** Run a CmdEffect to its Msg (the only Cmd shape our actions emit). */
const runCmd = (
  cmd: Cmd<SchedulerMsg>,
): Promise<SchedulerMsg> =>
  cmd.__tag === "CmdEffect"
    ? cmd.content()
    : Promise.reject(
        new Error("not an effect"),
      );

const memberAction = (
  db: Db,
  accounts: AccountStore,
  stakeholderDb: Db,
  draftDb: Db,
  assetDb: Db,
  id: SoftStr,
) => {
  const members = adminDeclaration(
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  ).collections.find(
    (c) => c.id === "members",
  );
  const act = members?.actions.find(
    (a) => a.id === id,
  );
  if (act === undefined) {
    throw new Error(`no action ${id}`);
  }
  return act;
};

test("adminDeclaration schedules into a runnable program with content + members menus", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const scheduled = schedule(
    adminDeclaration(
      db,
      accounts,
      stakeholderDb,
      draftDb,
      assetDb,
    ),
  );
  const [model] = scheduled.init({
    path: "/",
    search: "",
  });
  return all([
    check(typeof scheduled.init, toBe("function")),
    check(typeof scheduled.scene, toBe("function")),
    check(Array.isArray(model.slots), toBe(true)),
  ]);
});

test("the collections source lists the registered models", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const rows = must(
    await drive(
      sourceOf(
      db,
      accounts,
      stakeholderDb,
      draftDb,
      assetDb,
      "collections"),
      [],
    ),
  );
  return all([
    check(rows.length, toBe(1)),
    check(rows[0]?.id ?? "", toBe("blog")),
  ]);
});

test("selecting a collection drills into its documents", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const rows = must(
    await drive(
      sourceOf(
      db,
      accounts,
      stakeholderDb,
      draftDb,
      assetDb,
      "documents"),
      ["blog"],
    ),
  );
  return all([
    check(rows.length, toBe(1)),
    check(rows[0]?.label ?? "", toBe("Hello")),
  ]);
});

test("an unknown parent selection yields no documents", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const rows = must(
    await drive(
      sourceOf(
      db,
      accounts,
      stakeholderDb,
      draftDb,
      assetDb,
      "documents"),
      ["does-not-exist"],
    ),
  );
  return check(rows.length, toBe(0));
});

test("the members source lists accounts", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const rows = must(
    await drive(
      sourceOf(
      db,
      accounts,
      stakeholderDb,
      draftDb,
      assetDb,
      "members"),
      [],
    ),
  );
  return all([
    check(rows.length, toBe(1)),
    check(rows[0]?.label ?? "", toBe("alice")),
  ]);
});

test("grant-admin sets the role and reloads members", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const msg = await runCmd(
    memberAction(
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
    "grant-admin").run(
      some("s1"),
    ),
  );
  const role = await accounts.findRole(
    box("Subject")("s1"),
  );
  return all([
    check(msg.__tag, toBe("Loaded")),
    check(
      isSome(role) && role.content === "admin",
      toBe(true),
    ),
  ]);
});

test("make-guest revokes to guest", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  await runCmd(
    memberAction(
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
    "grant-admin").run(
      some("s1"),
    ),
  );
  await runCmd(
    memberAction(
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
    "make-guest").run(
      some("s1"),
    ),
  );
  const role = await accounts.findRole(
    box("Subject")("s1"),
  );
  return check(
    isSome(role) && role.content === "guest",
    toBe(true),
  );
});

test("a role action with no target is a no-op reload", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const msg = await runCmd(
    memberAction(
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
    "grant-admin").run(
      none(),
    ),
  );
  const role = await accounts.findRole(
    box("Subject")("s1"),
  );
  return all([
    check(msg.__tag, toBe("Loaded")),
    // nothing was granted
    check(isSome(role), toBe(false)),
  ]);
});

test("both role actions are declared destructive (confirmation-as-data)", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const grant = memberAction(
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
    "grant-admin",
  );
  const guest = memberAction(
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
    "make-guest",
  );
  const isDestructive = (
    c: (typeof grant)["confirm"],
  ): boolean =>
    c.__tag === "Confirm"
      ? c.content.destructive
      : false;
  return all([
    check(isDestructive(grant.confirm), toBe(true)),
    check(isDestructive(guest.confirm), toBe(true)),
  ]);
});

test("the conversations source lists stakeholder conversations", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const rows = must(
    await drive(
      sourceOf(
        db,
        accounts,
        stakeholderDb,
        draftDb,
        assetDb,
        "conversations",
      ),
      [],
    ),
  );
  return all([
    check(rows.length, toBe(1)),
    check(
      (rows[0]?.label ?? "").includes("request"),
      toBe(true),
    ),
  ]);
});

test("selecting a conversation drills into its messages", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const rows = must(
    await drive(
      sourceOf(
        db,
        accounts,
        stakeholderDb,
        draftDb,
        assetDb,
        "conversationMessages",
      ),
      ["1"],
    ),
  );
  return all([
    check(rows.length, toBe(1)),
    check(
      (rows[0]?.label ?? "").includes(
        "stakeholder request",
      ),
      toBe(true),
    ),
  ]);
});

test("the conversation sources surface a store error (no schema)", async () => {
  const { db, accounts } = await seed();
  const broken = openDb(":memory:");
  const convs = await drive(
    sourceOf(
      db,
      accounts,
      broken,
      broken,
      broken,
      "conversations",
    ),
    [],
  );
  const msgs = await drive(
    sourceOf(
      db,
      accounts,
      broken,
      broken,
      broken,
      "conversationMessages",
    ),
    ["1"],
  );
  return all([
    check(isErr(convs), toBe(true)),
    check(isErr(msgs), toBe(true)),
  ]);
});

test("the drafts source lists drafts and surfaces a store error", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const rows = must(
    await drive(
      sourceOf(
        db,
        accounts,
        stakeholderDb,
        draftDb,
        assetDb,
        "drafts",
      ),
      [],
    ),
  );
  const broken = openDb(":memory:");
  const errored = await drive(
    sourceOf(
      db,
      accounts,
      stakeholderDb,
      broken,
      assetDb,
      "drafts",
    ),
    [],
  );
  return all([
    check(rows.length, toBe(1)),
    check(
      (rows[0]?.label ?? "").includes(
        "blog/edit.md",
      ),
      toBe(true),
    ),
    check(isErr(errored), toBe(true)),
  ]);
});

test("the assets source lists assets and surfaces a store error", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } = await seed();
  const rows = must(
    await drive(
      sourceOf(
        db,
        accounts,
        stakeholderDb,
        draftDb,
        assetDb,
        "assets",
      ),
      [],
    ),
  );
  const broken = openDb(":memory:");
  const errored = await drive(
    sourceOf(
      db,
      accounts,
      stakeholderDb,
      draftDb,
      broken,
      "assets",
    ),
    [],
  );
  return all([
    check(rows.length, toBe(1)),
    check(
      (rows[0]?.label ?? "").includes(
        "assets/a.png",
      ),
      toBe(true),
    ),
    check(isErr(errored), toBe(true)),
  ]);
});
