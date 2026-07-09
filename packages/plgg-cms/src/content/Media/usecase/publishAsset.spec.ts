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
  ok,
} from "plgg";
import { asset } from "plgg-cms/content/Media/model/Asset";
import { openAssetStore } from "plgg-cms/content/Media/usecase/openAssetStore";
import { sqlAssetStore } from "plgg-cms/content/Media/Sql/assetStore";
import { uploadAsset } from "plgg-cms/content/Media/usecase/uploadAsset";
import {
  type AssetExportFs,
  publishAsset,
} from "plgg-cms/content/Media/usecase/publishAsset";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

const fsStub = () => {
  const writes: Array<{
    path: string;
    b64: string;
  }> = [];
  const fs: AssetExportFs = {
    writeBytes: async (path, b64) => {
      writes.push({ path, b64 });
      return ok(null);
    },
  };
  return { fs, writes };
};

test("a staged asset exports: writes its bytes + marks exported", async () => {
  const db = must(
    await openAssetStore(":memory:"),
  );
  const a = must(
    await uploadAsset(db, () => 100)({
      contentPath: "assets/x.png",
      mime: "image/png",
      size: 3,
      hash: "h1",
      bytesB64: "QUJD",
      createdBy: "g1",
    }),
  );
  const { fs, writes } = fsStub();
  const outcome = must(
    await publishAsset(db, fs, () => 200)(a.id),
  );
  const found = must(
    await sqlAssetStore(db).findAsset(a.id),
  );
  return all([
    check(outcome, toBe("exported")),
    check(writes.length, toBe(1)),
    check(writes[0]?.b64 ?? "", toBe("QUJD")),
    check(
      isSome(found) &&
        found.content.status === "exported",
      toBe(true),
    ),
  ]);
});

test("an already-exported asset cannot be re-published", async () => {
  const db = must(
    await openAssetStore(":memory:"),
  );
  const a = must(
    await uploadAsset(db, () => 100)({
      contentPath: "assets/y.png",
      mime: "image/png",
      size: 3,
      hash: "h2",
      bytesB64: "QUJD",
      createdBy: "g1",
    }),
  );
  const { fs } = fsStub();
  must(
    await publishAsset(db, fs, () => 200)(a.id),
  );
  const again = await publishAsset(
    db,
    fs,
    () => 300,
  )(a.id);
  return check(isErr(again), toBe(true));
});

test("an unsafe target path is rejected with no write", async () => {
  const db = must(
    await openAssetStore(":memory:"),
  );
  // insert directly to bypass uploadAsset's path guard
  const id = must(
    await sqlAssetStore(db).saveAsset(
      asset({
        id: 0,
        hash: "h3",
        contentPath: "../escape.png",
        mime: "image/png",
        size: 3,
        status: "staged",
        createdBy: "g1",
        createdAt: 0,
        updatedAt: 0,
      }),
      "QUJD",
    ),
  );
  const { fs, writes } = fsStub();
  const r = await publishAsset(db, fs, () => 200)(
    id,
  );
  return all([
    check(isErr(r), toBe(true)),
    check(writes.length, toBe(0)),
  ]);
});

test("publishing an unknown asset errors", async () => {
  const db = must(
    await openAssetStore(":memory:"),
  );
  const { fs } = fsStub();
  return check(
    isErr(
      await publishAsset(db, fs, () => 200)(999),
    ),
    toBe(true),
  );
});
