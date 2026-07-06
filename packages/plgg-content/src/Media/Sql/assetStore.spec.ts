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
import { type AssetStore } from "plgg-content/Media/model/AssetStore";
import { asset } from "plgg-content/Media/model/Asset";
import { openAssetStore } from "plgg-content/Media/usecase/openAssetStore";
import { sqlAssetStore } from "plgg-content/Media/Sql/assetStore";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const freshStore =
  async (): Promise<AssetStore> => {
    const db = must(
      await openAssetStore(":memory:"),
    );
    return sqlAssetStore(db);
  };

const anAsset = (hash: string, by: string) =>
  asset({
    id: 0,
    hash,
    contentPath: "assets/x.png",
    mime: "image/png",
    size: 3,
    status: "staged",
    createdBy: by,
    createdAt: 10,
    updatedAt: 10,
  });

test("save + find-by-hash + find + loadBytes + list round-trip", async () => {
  const store = await freshStore();
  const id = must(
    await store.saveAsset(
      anAsset("h1", "g1"),
      "QUJD",
    ),
  );
  const byHash = must(
    await store.findByHash("h1"),
  );
  const byId = must(await store.findAsset(id));
  const bytes = must(await store.loadBytes(id));
  const staged = must(
    await store.listAssets({
      createdBy: some("g1"),
      status: some("staged"),
    }),
  );
  return all([
    check(
      isSome(byHash) &&
        byHash.content.mime === "image/png",
      toBe(true),
    ),
    check(isSome(byId), toBe(true)),
    check(
      isSome(bytes) &&
        bytes.content === "QUJD",
      toBe(true),
    ),
    check(staged.length, toBe(1)),
  ]);
});

test("find-by-hash / find / loadBytes of an unknown are None", async () => {
  const store = await freshStore();
  return all([
    check(
      isSome(
        must(await store.findByHash("nope")),
      ),
      toBe(false),
    ),
    check(
      isSome(must(await store.findAsset(999))),
      toBe(false),
    ),
    check(
      isSome(must(await store.loadBytes(999))),
      toBe(false),
    ),
  ]);
});

test("a filter matching nothing returns empty", async () => {
  const store = await freshStore();
  must(
    await store.saveAsset(
      anAsset("h2", "g2"),
      "QUJD",
    ),
  );
  const exported = must(
    await store.listAssets({
      createdBy: none(),
      status: some("exported"),
    }),
  );
  return check(exported.length, toBe(0));
});

test("updateStatus persists a validated move", async () => {
  const store = await freshStore();
  const id = must(
    await store.saveAsset(
      anAsset("h3", "g1"),
      "QUJD",
    ),
  );
  must(
    await store.updateStatus(id, "exported", 20),
  );
  const found = must(await store.findAsset(id));
  return all([
    check(
      isSome(found) &&
        found.content.status === "exported",
      toBe(true),
    ),
    check(
      isSome(found) &&
        found.content.updatedAt === 20,
      toBe(true),
    ),
  ]);
});
