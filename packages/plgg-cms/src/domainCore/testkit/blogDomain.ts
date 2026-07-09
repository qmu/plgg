import { isOk } from "plgg";
import {
  type Version,
  asVersion,
} from "plgg-db-migration";
import {
  type Domain,
  type Entity,
  asDomain,
  type DomainSpec,
} from "plgg-cms/domainCore/Domain/model";

/**
 * A small sample domain (users + posts) reused across usecase specs. Test-only:
 * the fixture is unwrapped eagerly and a mis-authored literal fails loudly at
 * spec load — this is test infrastructure, not domain code, so the throw is
 * acceptable here (and excluded from the vendor/coverage rules).
 */
const spec: DomainSpec = {
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
        {
          name: "email",
          kind: "text",
          unique: true,
        },
        {
          name: "bio",
          kind: "text",
          nullable: true,
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
        {
          name: "author_id",
          kind: "int",
          references: {
            entity: "users",
            field: "id",
          },
        },
        { name: "title", kind: "text" },
        { name: "published", kind: "bool" },
        { name: "created_at", kind: "time" },
      ],
    },
  ],
};

const built = asDomain(spec);
if (!isOk(built)) {
  throw new Error(
    "blogDomain test fixture is invalid",
  );
}

/** The unwrapped sample {@link Domain}. */
export const blogDomain: Domain = built.content;

const entityAt = (index: number): Entity => {
  const e = blogDomain.entities[index];
  if (e === undefined) {
    throw new Error("missing fixture entity");
  }
  return e;
};

/** The `users` entity of {@link blogDomain}. */
export const usersEntity: Entity = entityAt(0);

/** The `posts` entity of {@link blogDomain}. */
export const postsEntity: Entity = entityAt(1);

const v = asVersion("20260704143031");
if (!isOk(v)) {
  throw new Error(
    "blogVersion test fixture is invalid",
  );
}

/** A fixed migration version for schema-derivation specs. */
export const blogVersion: Version = v.content;
