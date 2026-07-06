import {
  test,
  check,
  all,
  toEqual,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { some, none } from "plgg";
import {
  exportToJson,
  exportFromJson,
  DomainExport,
} from "plgg-domain/Domain/model/DomainExport";

const withHead: DomainExport = {
  manifest: {
    domainVersion: "abc123",
    derivationVersion: "1",
    schemaHead: some("20260101000000"),
  },
  entities: [
    {
      entity: "users",
      rows: [
        { id: 1, email: "a@b.c", active: true },
        { id: 2, email: "x@y.z", active: false },
      ],
    },
  ],
};

const noHead: DomainExport = {
  manifest: {
    domainVersion: "def456",
    derivationVersion: "1",
    schemaHead: none(),
  },
  entities: [{ entity: "posts", rows: [] }],
};

test("exportToJson → exportFromJson round-trips (with head)", () =>
  check(
    exportFromJson(exportToJson(withHead)),
    okThen((parsed) =>
      check(parsed, toEqual(withHead)),
    ),
  ));

test("exportToJson → exportFromJson round-trips (no head omitted)", () =>
  check(
    exportFromJson(exportToJson(noHead)),
    okThen((parsed) =>
      check(parsed, toEqual(noHead)),
    ),
  ));

test("exportFromJson rejects malformed JSON", () =>
  check(
    exportFromJson("{not json"),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("exportFromJson rejects non-array entities or rows", () =>
  all([
    check(
      exportFromJson(
        JSON.stringify({
          manifest: {
            domainVersion: "x",
            derivationVersion: "1",
          },
          entities: "nope",
        }),
      ),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      exportFromJson(
        JSON.stringify({
          manifest: {
            domainVersion: "x",
            derivationVersion: "1",
          },
          entities: [
            { entity: "users", rows: "nope" },
          ],
        }),
      ),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("exportFromJson rejects a missing manifest", () =>
  check(
    exportFromJson(
      JSON.stringify({ entities: [] }),
    ),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("exportFromJson rejects a non-scalar row value", () =>
  check(
    exportFromJson(
      JSON.stringify({
        manifest: {
          domainVersion: "x",
          derivationVersion: "1",
        },
        entities: [
          {
            entity: "users",
            rows: [{ id: { nested: true } }],
          },
        ],
      }),
    ),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));
