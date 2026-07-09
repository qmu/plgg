import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import { match } from "plgg";
import {
  missingTable,
  missingColumn,
  columnTypeMismatch,
  primaryKeyMismatch,
  isRecoverable,
  describeMismatch,
  schemaOk,
  schemaDrift,
  schemaOk$,
  schemaLag$,
  schemaDrift$,
} from "plgg-cms/domainCore/Domain/model/Mismatch";

test("isRecoverable splits additive from irreconcilable mismatches", () =>
  all([
    check(
      isRecoverable(missingTable("users")),
      toBe(true),
    ),
    check(
      isRecoverable(
        missingColumn("users", "email"),
      ),
      toBe(true),
    ),
    check(
      isRecoverable(
        columnTypeMismatch(
          "users",
          "age",
          "INTEGER",
          "TEXT",
        ),
      ),
      toBe(false),
    ),
    check(
      isRecoverable(
        primaryKeyMismatch("users", ["id"], []),
      ),
      toBe(false),
    ),
  ]));

test("describeMismatch names each mismatch", () =>
  all([
    check(
      describeMismatch(missingTable("users")),
      toContain("users"),
    ),
    check(
      describeMismatch(
        missingColumn("users", "email"),
      ),
      toContain("email"),
    ),
    check(
      describeMismatch(
        columnTypeMismatch(
          "users",
          "age",
          "INTEGER",
          "TEXT",
        ),
      ),
      toContain("INTEGER"),
    ),
    check(
      describeMismatch(
        primaryKeyMismatch("users", ["id"], []),
      ),
      toContain("id"),
    ),
  ]));

test("SchemaCheck constructors carry their tag", () =>
  all([
    check(
      match(schemaOk("blog"))(
        [schemaOk$(), () => "ok"],
        [schemaLag$(), () => "lag"],
        [schemaDrift$(), () => "drift"],
      ),
      toBe("ok"),
    ),
    check(
      match(schemaDrift([missingTable("users")]))(
        [schemaOk$(), () => "ok"],
        [schemaLag$(), () => "lag"],
        [schemaDrift$(), () => "drift"],
      ),
      toBe("drift"),
    ),
  ]));
