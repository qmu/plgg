import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { none } from "plgg";
import {
  asDomain,
  type DomainSpec,
} from "plgg-cms/domainCore/Domain/model/Domain";
import {
  canonicalDomain,
  fingerprintDomain,
  domainManifest,
  sameGeneration,
  DERIVATION_VERSION,
} from "plgg-cms/domainCore/Domain/model/DomainManifest";

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
  ],
};

test("canonicalDomain is stable and includes structure", () =>
  check(
    asDomain(spec),
    okThen((d) =>
      all([
        check(
          canonicalDomain(d),
          toBe(canonicalDomain(d)),
        ),
        check(
          canonicalDomain(d).includes("users"),
          toBe(true),
        ),
      ]),
    ),
  ));

test("domainManifest records fingerprint, derivation, and head", () =>
  check(
    asDomain(spec),
    okThen((d) => {
      const m = domainManifest(d, none());
      return all([
        check(
          m.domainVersion,
          toBe(fingerprintDomain(d)),
        ),
        check(
          m.derivationVersion,
          toBe(DERIVATION_VERSION),
        ),
        check(
          sameGeneration(
            m,
            domainManifest(d, none()),
          ),
          toBe(true),
        ),
      ]);
    }),
  ));
