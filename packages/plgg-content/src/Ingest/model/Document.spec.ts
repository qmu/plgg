import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import { isSome, isNone } from "plgg";
import {
  type Document,
  asDocument,
} from "plgg-content/Ingest/model/Document";

const row = (title: string | null) => ({
  id: 1,
  collection: "blog",
  path: "/blog/a",
  title,
  content_hash: "h",
  attributes_json: '{"draft":false}',
  updated_at: "2026-01-01",
});

test("asDocument decodes a row and parses attributes", () =>
  check(
    asDocument(row("Alpha")),
    okThen((d: Document) =>
      all([
        toBe("/blog/a")(d.path),
        toBe(true)(isSome(d.title)),
      ]),
    ),
  ));

test("asDocument maps a NULL title to None", () =>
  check(
    asDocument(row(null)),
    okThen((d: Document) =>
      toBe(true)(isNone(d.title)),
    ),
  ));

test("asDocument rejects unparseable attributes_json", () =>
  check(
    asDocument({
      ...row("x"),
      attributes_json: "{not json",
    }),
    shouldBeErr(),
  ));

test("asDocument rejects a non-record", () =>
  check(asDocument(42), shouldBeErr()));

test("asDocument rejects a non-string, non-null title", () =>
  check(
    asDocument({ ...row("x"), title: 42 }),
    shouldBeErr(),
  ));
