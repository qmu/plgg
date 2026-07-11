import {
  test,
  check,
  all,
  toEqual,
} from "plgg-test";
import { pipe, matchResult } from "plgg";
import { SemDiagnostic } from "plgg-ir-language";
import { compileManifest } from "plgg-ir-manifest/domain/usecase/compileManifest";

/**
 * Compiles a module wrapping the given children,
 * mapping the outcome to diagnostic codes (`["ok"]`
 * on success).
 */
const codesOf = (
  moduleChildren: string,
): ReadonlyArray<string> =>
  pipe(
    compileManifest(
      `(plgg-ir 1 (module m ${moduleChildren}))`,
    ),
    matchResult(
      (diags: ReadonlyArray<SemDiagnostic>) =>
        diags.map((d) => d.code),
      (): ReadonlyArray<string> => ["ok"],
    ),
  );

/**
 * The design §14 client/project pair with proper
 * inverses.
 */
const CLIENT_PROJECT =
  "(entity client (relation projects (target project) (cardinality many) (inverse client))) (entity project (relation client (target client) (cardinality one) (inverse projects)))";

test("mutual inverse relations verify (§16.5)", () =>
  check(
    codesOf(CLIENT_PROJECT),
    toEqual(["ok"]),
  ));

test("a one-sided inverse also verifies when it points back", () =>
  check(
    codesOf(
      "(entity client (relation projects (target project) (cardinality many) (inverse client))) (entity project (relation client (target client) (cardinality one)))",
    ),
    toEqual(["ok"]),
  ));

test("an unknown relation target is a compile error", () =>
  check(
    codesOf(
      "(entity e (relation r (target ghost) (cardinality one)))",
    ),
    toEqual(["manifest.relation.unknown-target"]),
  ));

test("a bad inverse is diagnosed in each failure shape", () =>
  all([
    // the inverse names no relation on the target
    check(
      codesOf(
        "(entity a (relation to-b (target b) (cardinality one) (inverse ghost))) (entity b)",
      ),
      toEqual(["manifest.relation.bad-inverse"]),
    ),
    // the inverse's relation targets a third entity
    check(
      codesOf(
        "(entity a (relation to-b (target b) (cardinality one) (inverse back))) (entity b (relation back (target c) (cardinality one))) (entity c)",
      ),
      toEqual(["manifest.relation.bad-inverse"]),
    ),
    // both declare inverses but not each other
    check(
      codesOf(
        "(entity a (relation to-b (target b) (cardinality one) (inverse back)) (relation second (target b) (cardinality one))) (entity b (relation back (target a) (cardinality one) (inverse second)))",
      ),
      toEqual(["manifest.relation.bad-inverse"]),
    ),
  ]));

test("aggregates verify structurally (§16.6)", () =>
  all([
    check(
      codesOf(
        `${CLIENT_PROJECT} (aggregate client-aggregate (root client) (members project) (consistency immediate))`,
      ),
      toEqual(["ok"]),
    ),
    check(
      codesOf(
        "(entity e) (aggregate a (root ghost))",
      ),
      toEqual([
        "manifest.aggregate.unknown-entity",
      ]),
    ),
    check(
      codesOf(
        "(entity e) (aggregate a (root e) (members ghost))",
      ),
      toEqual([
        "manifest.aggregate.unknown-entity",
      ]),
    ),
    // a member with no relation to its root
    check(
      codesOf(
        "(entity e) (entity stranger) (aggregate a (root e) (members stranger))",
      ),
      toEqual([
        "manifest.aggregate.unrelated-member",
      ]),
    ),
    check(
      codesOf("(entity e) (aggregate a)"),
      toEqual(["manifest.aggregate.malformed"]),
    ),
    check(
      codesOf(
        "(entity e) (aggregate a (root e) (consistency someday))",
      ),
      toEqual(["manifest.aggregate.malformed"]),
    ),
  ]));

test("an entity may belong to one aggregate only (§16.6)", () =>
  all([
    check(
      codesOf(
        `${CLIENT_PROJECT} (aggregate one (root client) (members project)) (aggregate two (root client) (members project))`,
      ),
      toEqual([
        "manifest.aggregate.duplicate-member",
      ]),
    ),
    // the same member twice in ONE aggregate
    check(
      codesOf(
        `${CLIENT_PROJECT} (aggregate one (root client) (members project project))`,
      ),
      toEqual([
        "manifest.aggregate.duplicate-member",
      ]),
    ),
  ]));
