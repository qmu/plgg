import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  contentModel,
  textField,
  numberField,
  booleanField,
  listField,
  groupField,
} from "plggpress/ContentModel/model/ContentModel";
import { casterOf } from "plggpress/ContentModel/usecase/casterOf";

const model = contentModel("post", [
  textField("title"),
  numberField("order", false),
  booleanField("draft", false),
  listField("tags", "text", false),
  groupField(
    "author",
    [textField("name"), booleanField("admin")],
    false,
  ),
]);

const validate = casterOf(model);

test("a fully-valid frontmatter payload passes", () =>
  check(
    isOk(
      validate({
        title: "Hello",
        order: 3,
        draft: true,
        tags: ["a", "b"],
        author: { name: "Ada", admin: true },
      }),
    ),
    toBe(true),
  ));

test("optional fields may be omitted", () =>
  check(
    isOk(
      validate({ title: "Only the required" }),
    ),
    toBe(true),
  ));

test("a missing REQUIRED field is an error", () =>
  check(
    isErr(validate({ order: 1 })),
    toBe(true),
  ));

test("a wrong-typed field is an error", () =>
  all([
    check(
      isErr(validate({ title: 42 })),
      toBe(true),
    ),
    check(
      isErr(
        validate({
          title: "x",
          order: "not a number",
        }),
      ),
      toBe(true),
    ),
  ]));

test("a group with a missing required sub-field is an error", () =>
  check(
    isErr(
      validate({
        title: "x",
        author: { admin: true },
      }),
    ),
    toBe(true),
  ));

test("a list of the wrong scalar kind is an error", () =>
  check(
    isErr(
      validate({
        title: "x",
        tags: [1, 2],
      }),
    ),
    toBe(true),
  ));
