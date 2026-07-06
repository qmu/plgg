import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import {
  asRole,
  matchRole,
} from "plgg-auth/Account/model/Role";

test("asRole accepts admin and guest", () =>
  all([
    check(
      asRole("admin"),
      okThen((r) => check(r, toBe("admin"))),
    ),
    check(
      asRole("guest"),
      okThen((r) => check(r, toBe("guest"))),
    ),
  ]));

test("asRole rejects any other value", () =>
  all([
    check(
      asRole("root"),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
    check(
      asRole(1),
      errThen((e) =>
        check(e.__tag, toBe("InvalidError")),
      ),
    ),
  ]));

test("matchRole folds each variant", () =>
  all([
    check(
      matchRole(
        () => "A",
        () => "G",
      )("admin"),
      toBe("A"),
    ),
    check(
      matchRole(
        () => "A",
        () => "G",
      )("guest"),
      toBe("G"),
    ),
  ]));
