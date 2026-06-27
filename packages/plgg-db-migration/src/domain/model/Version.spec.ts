import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  asVersion,
  isVersion,
  versionString,
  compareVersion,
} from "plgg-db-migration/domain/model/Version";

test("asVersion accepts a 14-digit timestamp", () =>
  check(
    asVersion("20260627181500"),
    okThen((v) =>
      check(
        versionString(v),
        toBe("20260627181500"),
      ),
    ),
  ));

test("asVersion rejects wrong length, non-digit, and non-string", () =>
  all([
    check(
      asVersion("2026"),
      errThen((e) =>
        check(
          e.content.kind,
          toBe("VersionShape"),
        ),
      ),
    ),
    check(
      asVersion("2026062718150X"),
      errThen((e) =>
        check(
          e.content.kind,
          toBe("VersionShape"),
        ),
      ),
    ),
    check(
      asVersion(20260627181500),
      errThen((e) =>
        check(
          e.content.kind,
          toBe("VersionShape"),
        ),
      ),
    ),
  ]));

test("asVersion is idempotent on an already-branded Version", () =>
  check(
    asVersion("20260627181500"),
    okThen((v) =>
      check(
        asVersion(v),
        okThen((again) =>
          check(
            versionString(again),
            toBe("20260627181500"),
          ),
        ),
      ),
    ),
  ));

test("isVersion guards branded values only", () =>
  all([
    check(
      isVersion("20260627181500"),
      toBe(false),
    ),
    check(
      asVersion("20260627181500"),
      okThen((v) =>
        check(isVersion(v), toBe(true)),
      ),
    ),
  ]));

test("compareVersion is a total order", () =>
  check(
    asVersion("20260101000000"),
    okThen((a) =>
      check(
        asVersion("20260102000000"),
        okThen((b) =>
          all([
            check(compareVersion(a, b), toBe(-1)),
            check(compareVersion(b, a), toBe(1)),
            check(compareVersion(a, a), toBe(0)),
          ]),
        ),
      ),
    ),
  ));
