import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  asHttpStatus,
  isHttpStatus,
  statusOf,
} from "plgg-http/index";

test("asHttpStatus accepts codes in 100-599", () =>
  check(
    asHttpStatus(404),
    okThen((s) =>
      all([
        check(s.__tag, toBe("HttpStatus")),
        check(s.content, toBe(404)),
      ]),
    ),
  ));

test("asHttpStatus rejects out-of-range and non-integers", () =>
  all([
    check(asHttpStatus(99), shouldBeErr()),
    check(asHttpStatus(600), shouldBeErr()),
    check(asHttpStatus(200.5), shouldBeErr()),
    check(asHttpStatus("200"), shouldBeErr()),
  ]));

test("asHttpStatus is idempotent on an existing HttpStatus", () =>
  check(
    asHttpStatus(201),
    okThen((first) =>
      check(
        asHttpStatus(first),
        okThen((again) =>
          toBe(201)(again.content),
        ),
      ),
    ),
  ));

test("isHttpStatus guards the branded value", () =>
  all([
    check(
      asHttpStatus(200),
      okThen((s) => toBe(true)(isHttpStatus(s))),
    ),
    check(isHttpStatus(200), toBe(false)),
    check(
      isHttpStatus({
        __tag: "HttpStatus",
        content: 7,
      }),
      toBe(false),
    ),
  ]));

test("statusOf keeps valid codes and degrades invalid ones to 500", () =>
  all([
    check(statusOf(200).content, toBe(200)),
    check(statusOf(700).content, toBe(500)),
  ]));
