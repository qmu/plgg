import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  collectionSchema,
  schemaField,
  asCollectionSchema,
  asSchemaField,
} from "plgg-cms/content/Query/model/CollectionSchema";

test("asCollectionSchema round-trips a built schema", () =>
  check(
    isOk(
      asCollectionSchema(
        collectionSchema("post", [
          schemaField("title", "text", true),
          schemaField("order", "number", false),
          schemaField("tags", "list", false),
          schemaField("author", "group", false),
          schemaField("draft", "boolean", true),
        ]),
      ),
    ),
    toBe(true),
  ));

test("asSchemaField rejects an unknown field type", () =>
  check(
    isErr(
      asSchemaField({
        name: "x",
        type: "date",
        required: true,
      }),
    ),
    toBe(true),
  ));

test("asCollectionSchema rejects a malformed payload", () =>
  all([
    check(
      isErr(asCollectionSchema({ name: 1 })),
      toBe(true),
    ),
    check(
      isErr(asCollectionSchema(null)),
      toBe(true),
    ),
    check(
      isErr(
        asCollectionSchema({
          name: "x",
          fields: [{ name: "y" }],
        }),
      ),
      toBe(true),
    ),
  ]));
