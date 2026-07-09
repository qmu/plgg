import { test, check, all, toBe } from "plgg-test";
import {
  sqliteType,
  typeAffinity,
} from "plgg-cms/domainCore/Domain/model/ColumnKind";

test("sqliteType projects each kind to its storage", () =>
  all([
    check(sqliteType("text"), toBe("TEXT")),
    check(sqliteType("time"), toBe("TEXT")),
    check(sqliteType("int"), toBe("INTEGER")),
    check(sqliteType("bool"), toBe("INTEGER")),
    check(sqliteType("real"), toBe("REAL")),
  ]));

test("typeAffinity classifies declared types by SQLite rules", () =>
  all([
    check(
      typeAffinity("INTEGER"),
      toBe("INTEGER"),
    ),
    check(
      typeAffinity("varchar(20)"),
      toBe("TEXT"),
    ),
    check(typeAffinity("clob"), toBe("TEXT")),
    check(
      typeAffinity("DOUBLE PRECISION"),
      toBe("REAL"),
    ),
    check(typeAffinity("real"), toBe("REAL")),
    check(typeAffinity("blob"), toBe("OTHER")),
  ]));
