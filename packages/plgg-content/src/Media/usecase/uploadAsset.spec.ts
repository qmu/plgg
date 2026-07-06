import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  isErr,
  none,
} from "plgg";
import { type Db } from "plgg-sql";
import { MAX_ASSET_BYTES } from "plgg-content/Media/model/MediaSafety";
import { openAssetStore } from "plgg-content/Media/usecase/openAssetStore";
import { sqlAssetStore } from "plgg-content/Media/Sql/assetStore";
import { uploadAsset } from "plgg-content/Media/usecase/uploadAsset";

const NOW = 1000;

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const fresh = async (): Promise<Db> =>
  must(await openAssetStore(":memory:"));

const input = (
  hash: string,
  mime: string,
  size: number,
  path: string,
) => ({
  contentPath: path,
  mime,
  size,
  hash,
  bytesB64: "QUJD",
  createdBy: "g1",
});

test("a valid upload stores a staged content-addressed asset", async () => {
  const db = await fresh();
  const a = must(
    await uploadAsset(db, () => NOW)(
      input("h1", "image/png", 3, "assets/x.png"),
    ),
  );
  return all([
    check(a.status, toBe("staged")),
    check(a.hash, toBe("h1")),
    check(a.id > 0, toBe(true)),
  ]);
});

test("an identical upload dedupes to the same asset (one row)", async () => {
  const db = await fresh();
  const a = must(
    await uploadAsset(db, () => NOW)(
      input("h1", "image/png", 3, "assets/x.png"),
    ),
  );
  const b = must(
    await uploadAsset(db, () => NOW)(
      input("h1", "image/png", 3, "assets/x.png"),
    ),
  );
  const rows = must(
    await sqlAssetStore(db).listAssets({
      createdBy: none(),
      status: none(),
    }),
  );
  return all([
    check(a.id, toBe(b.id)),
    check(rows.length, toBe(1)),
  ]);
});

test("a disallowed mime / oversize / unsafe path is rejected, nothing stored", async () => {
  const db = await fresh();
  const store = sqlAssetStore(db);
  const badMime = await uploadAsset(db, () => NOW)(
    input("h1", "image/svg+xml", 3, "assets/x.svg"),
  );
  const oversize = await uploadAsset(db, () => NOW)(
    input(
      "h2",
      "image/png",
      MAX_ASSET_BYTES + 1,
      "assets/x.png",
    ),
  );
  const unsafe = await uploadAsset(db, () => NOW)(
    input("h3", "image/png", 3, "../escape.png"),
  );
  const rows = must(
    await store.listAssets({
      createdBy: none(),
      status: none(),
    }),
  );
  return all([
    check(isErr(badMime), toBe(true)),
    check(isErr(oversize), toBe(true)),
    check(isErr(unsafe), toBe(true)),
    check(rows.length, toBe(0)),
  ]);
});
