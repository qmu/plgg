import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  textField,
  numberField,
  booleanField,
  listField,
  groupField,
  contentModel,
  bindModel,
} from "plggpress/ContentModel/model/ContentModel";
import {
  asFieldType,
  asContentModelBinding,
  asBindings,
} from "plggpress/ContentModel/usecase/asContentModel";

test("asFieldType round-trips every builder value", () =>
  all([
    check(
      isOk(asFieldType(textField("x").type)),
      toBe(true),
    ),
    check(
      isOk(asFieldType(numberField("x").type)),
      toBe(true),
    ),
    check(
      isOk(asFieldType(booleanField("x").type)),
      toBe(true),
    ),
    check(
      isOk(
        asFieldType(
          listField("x", "number").type,
        ),
      ),
      toBe(true),
    ),
    check(
      isOk(
        asFieldType(
          groupField("g", [textField("n")]).type,
        ),
      ),
      toBe(true),
    ),
  ]));

test("asFieldType rejects a non-builder or unknown value", () =>
  all([
    check(isErr(asFieldType({})), toBe(true)),
    check(
      isErr(asFieldType("TextField")),
      toBe(true),
    ),
    // a ListField carrying a bad scalar kind
    check(
      isErr(
        asFieldType({
          __tag: "ListField",
          content: "date",
        }),
      ),
      toBe(true),
    ),
  ]));

test("asContentModelBinding validates a well-formed binding", () =>
  check(
    isOk(
      asContentModelBinding(
        bindModel(
          "/blog/",
          contentModel("post", [
            textField("title"),
          ]),
        ),
      ),
    ),
    toBe(true),
  ));

test("asBindings validates the config models list", () =>
  all([
    check(
      isOk(
        asBindings([
          bindModel(
            "/blog/",
            contentModel("post", [
              numberField("order"),
            ]),
          ),
        ]),
      ),
      toBe(true),
    ),
    check(
      isErr(asBindings([{ prefix: "/x/" }])),
      toBe(true),
    ),
  ]));
