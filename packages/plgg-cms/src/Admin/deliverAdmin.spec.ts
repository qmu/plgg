import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  type Dict,
  type SoftStr,
  isErr,
  none,
  ok,
  err,
  box,
  matchResult,
} from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
  type HttpError,
  type Method,
  handle,
} from "plgg-server";
import {
  type Db,
  openIndex,
  registerCollection,
  collectionSchema,
  type ExportFs,
  type AssetExportFs,
  openStakeholderStore,
  openDraftStore,
  openAssetStore,
  uploadAsset,
  openDraft,
  submitDraft,
  ingest,
  ingestMessage,
  newConversation,
} from "plgg-cms/content";
import {
  type AccountStore,
  sqlAccountStore,
  ACCOUNT_SCHEMA,
  account,
  asUsername,
} from "plgg-auth";
import {
  type SettingsStore,
  memorySettingsStore,
  settingsError,
} from "plgg-cms/Admin/settingsStore";
import { deliverAdmin } from "plgg-cms/Admin/deliverAdmin";

const NOW = 1_700_000_000;
const clock = () => NOW;

const exportFs: ExportFs = {
  currentHash: async () => none(),
  writeSource: async () => ok(null),
};
const assetFs: AssetExportFs = {
  writeBytes: async () => ok(null),
};

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const settingsOf = (): SettingsStore =>
  memorySettingsStore((key: SoftStr) =>
    Promise.resolve(
      key.length > 0
        ? ok(null)
        : err(settingsError("empty")),
    ),
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
      collectionSchema("blog", []),
    ),
  );
  const accounts = sqlAccountStore(db);
  const alice = asUsername("alice");
  if (!isErr(alice)) {
    await accounts.saveAccount(
      account(
        box("Subject")("s1"),
        alice.content,
        box("PasswordHash")(
          "pbkdf2$sha256$600000$c2FsdA$ZGVyaXZlZA",
        ),
        0,
      ),
    );
  }
  const stakeholderDb = must(
    await openStakeholderStore(":memory:"),
  );
  must(
    await ingest(stakeholderDb, clock)(
      ingestMessage({
        conversationRef: newConversation({
          contentPath: none(),
          kind: "request",
          visibility: "public",
        }),
        body: "a request",
        authorKind: "guest",
        authorSubject: none(),
        source: "web",
      }),
    ),
  );
  const draftDb = must(
    await openDraftStore(":memory:"),
  );
  const dr = must(
    await openDraft(draftDb, clock)(
      "blog/edit.md",
      "guest-1",
      none(),
      "# draft",
    ),
  );
  must(
    await submitDraft(draftDb, clock)(
      dr.id,
      "guest-1",
    ),
  );
  const assetDb = must(
    await openAssetStore(":memory:"),
  );
  must(
    await uploadAsset(assetDb, clock)({
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

const req = (
  method: Method,
  path: string,
  headers: Dict<string, string> = {},
  body = "",
  query: Dict<string, string> = {},
): HttpRequest => ({
  method,
  path,
  query,
  headers,
  params: {},
  body,
  bytes: none(),
});

const outcome = (
  r: Result<HttpResponse, HttpError>,
): string =>
  matchResult<HttpResponse, HttpError, string>(
    (e: HttpError) => e.__tag,
    (res: HttpResponse) =>
      String(res.status.content),
  )(r);

// Pull the CSRF token the GET issued (cookie + control forms share it).
const csrfFrom = (res: HttpResponse): string => {
  const setCookie = res.headers["set-cookie"] ?? "";
  const m = /plgg_admin_csrf=([^;]+)/.exec(
    setCookie,
  );
  return m === null ? "" : m[1] ?? "";
};

test("GET renders the admin scene + control panel as an HTML document with a CSRF cookie", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const app = deliverAdmin(
    db,
    accounts,
    settingsOf(),
    clock,
    stakeholderDb,
    draftDb,
    exportFs,
    assetDb,
    assetFs,
  );
  const res: HttpResponse = must(
    await handle(app, req("GET", "/")),
  );
  const body = String(res.body);
  return all([
    check(res.status.content, toBe(200)),
    check(
      body.startsWith("<!doctype html"),
      toBe(true),
    ),
    check(body.includes("Content"), toBe(true)),
    check(body.includes("alice"), toBe(true)),
    check(
      body.includes("Mint a guest invite link"),
      toBe(true),
    ),
    check(
      csrfFrom(res).length > 0,
      toBe(true),
    ),
  ]);
});

const drive = async (
  verb: string,
  extra: string,
): Promise<{
  app: ReturnType<typeof deliverAdmin>;
  accounts: AccountStore;
  settings: SettingsStore;
  res: Result<HttpResponse, HttpError>;
}> => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const settings = settingsOf();
  const app = deliverAdmin(
    db,
    accounts,
    settings,
    clock,
    stakeholderDb,
    draftDb,
    exportFs,
    assetDb,
    assetFs,
  );
  const token = csrfFrom(
    must(await handle(app, req("GET", "/"))),
  );
  const res = await handle(
    app,
    req(
      "POST",
      "/act",
      {
        cookie: `plgg_admin_csrf=${token}`,
        "content-type":
          "application/x-www-form-urlencoded",
      },
      `csrf_token=${token}&verb=${verb}${extra}`,
    ),
  );
  return { app, accounts, settings, res };
};

test("a POST without the CSRF token is 403", async () => {
  const {
    db,
    accounts,
    stakeholderDb,
    draftDb,
    assetDb,
  } =
    await seed();
  const app = deliverAdmin(
    db,
    accounts,
    settingsOf(),
    clock,
    stakeholderDb,
    draftDb,
    exportFs,
    assetDb,
    assetFs,
  );
  return check(
    outcome(
      await handle(
        app,
        req(
          "POST",
          "/act",
          {
            "content-type":
              "application/x-www-form-urlencoded",
          },
          "verb=grant-admin&subject=s1",
        ),
      ),
    ),
    toBe("Forbidden"),
  );
});

test("grant-admin over a CSRF-valid POST sets the role and redirects", async () => {
  const { accounts, res } = await drive(
    "grant-admin",
    "&subject=s1",
  );
  const role = await accounts.findRole(
    box("Subject")("s1"),
  );
  return all([
    check(outcome(res), toBe("302")),
    check(
      !isErr(role) && role.__tag === "Some"
        ? role.content
        : "none",
      toBe("admin"),
    ),
  ]);
});

test("create-invite renders the plaintext link exactly once", async () => {
  const { res } = await drive(
    "create-invite",
    "",
  );
  const body = String(must(res).body);
  return all([
    check(must(res).status.content, toBe(200)),
    check(
      body.includes("shown once"),
      toBe(true),
    ),
    check(body.includes("<code>"), toBe(true)),
  ]);
});

test("set-llm-key stores a valid key (status → configured) and redirects", async () => {
  const { settings, res } = await drive(
    "set-llm-key",
    "&key=sk-operator-123",
  );
  return all([
    check(outcome(res), toBe("302")),
    check(
      settings.llmKeyStatus(),
      toBe("configured"),
    ),
  ]);
});

test("an unknown verb is 400", async () => {
  const { res } = await drive("frobnicate", "");
  return check(outcome(res), toBe("BadRequest"));
});

test("set-llm-key with no key field is 400", async () => {
  const { res } = await drive("set-llm-key", "");
  return check(outcome(res), toBe("BadRequest"));
});

test("set-llm-key with an empty (invalid) key is 400 and stores nothing", async () => {
  const { settings, res } = await drive(
    "set-llm-key",
    "&key=",
  );
  return all([
    check(outcome(res), toBe("BadRequest")),
    check(
      settings.llmKeyStatus(),
      toBe("absent"),
    ),
  ]);
});

test("a role action with no subject field is 400", async () => {
  const { res } = await drive("grant-admin", "");
  return check(outcome(res), toBe("BadRequest"));
});

test("set-status applies a legal conversation transition and redirects", async () => {
  const { res } = await drive(
    "set-status",
    "&conversation_id=1&status=addressed",
  );
  return check(outcome(res), toBe("302"));
});

test("set-status with a bad status value is 400", async () => {
  const { res } = await drive(
    "set-status",
    "&conversation_id=1&status=bogus",
  );
  return check(outcome(res), toBe("BadRequest"));
});

test("set-status with no conversation id is 400", async () => {
  const { res } = await drive(
    "set-status",
    "&status=closed",
  );
  return check(outcome(res), toBe("BadRequest"));
});

test("set-status with an illegal (same-state) transition is 400", async () => {
  const { res } = await drive(
    "set-status",
    "&conversation_id=1&status=open",
  );
  return check(outcome(res), toBe("BadRequest"));
});

test("publish-draft exports a submitted draft and redirects", async () => {
  const { res } = await drive(
    "publish-draft",
    "&draft_id=1",
  );
  return check(outcome(res), toBe("302"));
});

test("publish-draft with no draft id is 400", async () => {
  const { res } = await drive(
    "publish-draft",
    "",
  );
  return check(outcome(res), toBe("BadRequest"));
});

test("publish-asset exports a staged asset and redirects", async () => {
  const { res } = await drive(
    "publish-asset",
    "&asset_id=1",
  );
  return check(outcome(res), toBe("302"));
});

test("publish-asset with no asset id is 400", async () => {
  const { res } = await drive(
    "publish-asset",
    "",
  );
  return check(outcome(res), toBe("BadRequest"));
});

test("re-publishing an already-exported asset is 400", async () => {
  const s = await seed();
  const app = deliverAdmin(
    s.db,
    s.accounts,
    settingsOf(),
    clock,
    s.stakeholderDb,
    s.draftDb,
    exportFs,
    s.assetDb,
    assetFs,
  );
  const token = csrfFrom(
    must(await handle(app, req("GET", "/"))),
  );
  const publish = () =>
    handle(
      app,
      req(
        "POST",
        "/act",
        {
          cookie: `plgg_admin_csrf=${token}`,
          "content-type":
            "application/x-www-form-urlencoded",
        },
        `csrf_token=${token}&verb=publish-asset&asset_id=1`,
      ),
    );
  must(await publish());
  const second = await publish();
  return check(outcome(second), toBe("BadRequest"));
});

test("re-publishing an already-exported draft is 400", async () => {
  const s = await seed();
  const app = deliverAdmin(
    s.db,
    s.accounts,
    settingsOf(),
    clock,
    s.stakeholderDb,
    s.draftDb,
    exportFs,
    s.assetDb,
    assetFs,
  );
  const token = csrfFrom(
    must(await handle(app, req("GET", "/"))),
  );
  const publish = () =>
    handle(
      app,
      req(
        "POST",
        "/act",
        {
          cookie: `plgg_admin_csrf=${token}`,
          "content-type":
            "application/x-www-form-urlencoded",
        },
        `csrf_token=${token}&verb=publish-draft&draft_id=1`,
      ),
    );
  must(await publish());
  const second = await publish();
  return check(outcome(second), toBe("BadRequest"));
});
