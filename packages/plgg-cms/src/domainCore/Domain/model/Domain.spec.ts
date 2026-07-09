import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
  okThen,
  errThen,
  someThen,
  shouldBeNone,
} from "plgg-test";
import { isOk } from "plgg";
import {
  asSqlIdent,
  sqlIdentString,
} from "plgg-sql";
import {
  asDomain,
  entityByName,
  type DomainSpec,
} from "plgg-cms/domainCore/Domain/model/Domain";

const twoEntities: DomainSpec = {
  name: "blog",
  entities: [
    {
      name: "users",
      fields: [
        {
          name: "id",
          kind: "int",
          primaryKey: true,
        },
      ],
    },
    {
      name: "posts",
      fields: [
        {
          name: "id",
          kind: "int",
          primaryKey: true,
        },
      ],
    },
  ],
};

const dupEntities: DomainSpec = {
  name: "blog",
  entities: [
    {
      name: "users",
      fields: [{ name: "id", kind: "int" }],
    },
    {
      name: "users",
      fields: [{ name: "id", kind: "int" }],
    },
  ],
};

test("asDomain validates a well-formed domain", () =>
  check(
    asDomain(twoEntities),
    okThen((d) =>
      all([
        check(d.name, toBe("blog")),
        check(d.entities, toHaveLength(2)),
      ]),
    ),
  ));

test("asDomain rejects an empty name", () =>
  check(
    asDomain({ ...twoEntities, name: "" }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asDomain rejects zero entities", () =>
  check(
    asDomain({ name: "blog", entities: [] }),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("asDomain rejects duplicate entity names", () =>
  check(
    asDomain(dupEntities),
    errThen((e) =>
      check(e.__tag, toBe("InvalidError")),
    ),
  ));

test("entityByName finds a present entity and misses an absent one", () => {
  const built = asDomain(twoEntities);
  const users = asSqlIdent("users");
  const ghost = asSqlIdent("ghost");
  return isOk(built) &&
    isOk(users) &&
    isOk(ghost)
    ? all([
        check(
          entityByName(
            built.content,
            users.content,
          ),
          someThen((e) =>
            check(
              sqlIdentString(e.name),
              toBe("users"),
            ),
          ),
        ),
        check(
          entityByName(
            built.content,
            ghost.content,
          ),
          shouldBeNone(),
        ),
      ])
    : check(false, toBe(true));
});
