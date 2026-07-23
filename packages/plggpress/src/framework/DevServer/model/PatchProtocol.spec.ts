import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  PATCH_PATH,
  asPatchRequest,
} from "plggpress/framework/DevServer/model/PatchProtocol";

test("PATCH_PATH is the plggpress-owned live-edit route", () =>
  check(PATCH_PATH, toBe("/__plggpress_patch")));

test("decodes a well-formed patch body", () =>
  check(
    asPatchRequest({
      path: "guide.md",
      edits: [{ find: "old", replace: "new" }],
    }),
    okThen((r) =>
      all([
        toBe("guide.md")(r.path),
        toBe(1)(r.edits.length),
      ]),
    ),
  ));

test("rejects a body missing the path", () =>
  check(
    asPatchRequest({ edits: [] }),
    shouldBeErr(),
  ));

test("rejects a body whose edits are not {find, replace} ops", () =>
  check(
    asPatchRequest({
      path: "a.md",
      edits: [{ find: "x" }],
    }),
    shouldBeErr(),
  ));

test("rejects a non-object body", () =>
  check(asPatchRequest("nope"), shouldBeErr()));
