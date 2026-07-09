import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  asAssetStatus,
  matchAssetStatus,
  transitionAssetStatus,
} from "plgg-cms/content/Media/model/AssetStatus";
import {
  isAllowedMime,
  withinSizeLimit,
  isSafeAssetPath,
  MAX_ASSET_BYTES,
} from "plgg-cms/content/Media/model/MediaSafety";
import { asset } from "plgg-cms/content/Media/model/Asset";

test("asAssetStatus accepts every member and rejects the rest", () =>
  all([
    check(isOk(asAssetStatus("staged")), toBe(true)),
    check(isOk(asAssetStatus("exported")), toBe(true)),
    check(isOk(asAssetStatus("discarded")), toBe(true)),
    check(isErr(asAssetStatus("nope")), toBe(true)),
    check(isErr(asAssetStatus(5)), toBe(true)),
  ]));

test("matchAssetStatus folds every arm", () => {
  const f = matchAssetStatus(
    () => "s",
    () => "e",
    () => "d",
  );
  return all([
    check(f("staged"), toBe("s")),
    check(f("exported"), toBe("e")),
    check(f("discarded"), toBe("d")),
  ]);
});

test("transitionAssetStatus allows only staged→exported/discarded", () =>
  all([
    check(isOk(transitionAssetStatus("staged", "exported")), toBe(true)),
    check(isOk(transitionAssetStatus("staged", "discarded")), toBe(true)),
    // terminal + no-op
    check(isErr(transitionAssetStatus("exported", "staged")), toBe(true)),
    check(isErr(transitionAssetStatus("discarded", "exported")), toBe(true)),
    check(isErr(transitionAssetStatus("staged", "staged")), toBe(true)),
  ]));

test("the MIME allowlist accepts safe types and rejects the rest (incl. svg)", () =>
  all([
    check(isAllowedMime("image/png"), toBe(true)),
    check(isAllowedMime("image/jpeg"), toBe(true)),
    check(isAllowedMime("application/pdf"), toBe(true)),
    check(isAllowedMime("image/svg+xml"), toBe(false)),
    check(isAllowedMime("text/html"), toBe(false)),
  ]));

test("the size cap rejects empty, negative, and oversize", () =>
  all([
    check(withinSizeLimit(1), toBe(true)),
    check(withinSizeLimit(MAX_ASSET_BYTES), toBe(true)),
    check(withinSizeLimit(0), toBe(false)),
    check(withinSizeLimit(-1), toBe(false)),
    check(
      withinSizeLimit(MAX_ASSET_BYTES + 1),
      toBe(false),
    ),
  ]));

test("asset-path safety rejects absolute, empty, and .. escapes", () =>
  all([
    check(isSafeAssetPath("assets/logo.png"), toBe(true)),
    check(isSafeAssetPath("/etc/passwd"), toBe(false)),
    check(isSafeAssetPath("../secret.png"), toBe(false)),
    check(isSafeAssetPath(""), toBe(false)),
  ]));

test("asset is a passthrough constructor carrying its content-addressed fields", () => {
  const a = asset({
    id: 1,
    hash: "sha256-abc",
    contentPath: "assets/logo.png",
    mime: "image/png",
    size: 1234,
    status: "staged",
    createdBy: "guest-1",
    createdAt: 10,
    updatedAt: 10,
  });
  return all([
    check(a.hash, toBe("sha256-abc")),
    check(a.mime, toBe("image/png")),
    check(a.status, toBe("staged")),
  ]);
});
