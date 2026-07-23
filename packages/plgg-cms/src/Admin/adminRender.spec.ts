import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { type Result, isErr } from "plgg";
import { renderToString } from "plgg-view";
import {
  schedule,
  multiColumn,
  singleColumn,
  renderMode,
} from "plgg-cms/ui";
import {
  type Db,
  openIndex,
  openStakeholderStore,
  openDraftStore,
  openAssetStore,
} from "plgg-cms/content";
import {
  sqlAccountStore,
  ACCOUNT_SCHEMA,
} from "plgg-auth";
import { adminDeclaration } from "plgg-cms/Admin/adminDeclaration";

const must = <T>(r: Result<T, unknown>): T => {
  if (isErr(r)) {
    throw new Error(JSON.stringify(r.content));
  }
  return r.content;
};

// The root scene carries the menu; the sources aren't driven,
// so a bare index + account store is enough to render it.
const rootScene = async () => {
  const db: Db = must(await openIndex(":memory:"));
  await db.execScript(ACCOUNT_SCHEMA);
  const scheduled = schedule(
    adminDeclaration(
      db,
      sqlAccountStore(db),
      must(await openStakeholderStore(":memory:")),
      must(await openDraftStore(":memory:")),
      must(await openAssetStore(":memory:")),
    ),
  );
  const [model] = scheduled.init({
    path: "/",
    search: "",
  });
  return scheduled.scene(model);
};

// D10 mode-parity: ONE declaration, drawn by BOTH renderers,
// surfaces the SAME navigation landmarks.
test("one admin declaration renders the same menu in both modes", async () => {
  const scene = await rootScene();
  const multi = renderToString(multiColumn(scene));
  const single = renderToString(singleColumn(scene));
  return all([
    check(multi.includes("Content"), toBe(true)),
    check(multi.includes("Members"), toBe(true)),
    check(single.includes("Content"), toBe(true)),
    check(single.includes("Members"), toBe(true)),
  ]);
});

test("renderMode dispatches to each renderer over the same scene", async () => {
  const scene = await rootScene();
  return all([
    check(
      renderToString(
        renderMode("multiColumn")(scene),
      ),
      toBe(
        renderToString(multiColumn(scene)),
      ),
    ),
    check(
      renderToString(
        renderMode("singleColumn")(scene),
      ),
      toBe(
        renderToString(singleColumn(scene)),
      ),
    ),
  ]);
});

test("both renderers produce a non-empty div from the same scene", async () => {
  const scene = await rootScene();
  const multi = renderToString(multiColumn(scene));
  const single = renderToString(singleColumn(scene));
  return all([
    check(multi.length > 0, toBe(true)),
    check(single.length > 0, toBe(true)),
    check(multi.startsWith("<div"), toBe(true)),
    check(single.startsWith("<div"), toBe(true)),
  ]);
});
