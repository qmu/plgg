import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  hostName,
  isAllowedHost,
} from "plgg-bundle/Dev/usecase/allowedHost";

test("hostName strips a :port suffix", () =>
  all([
    check(
      hostName("localhost:5181"),
      toBe("localhost"),
    ),
    check(
      hostName("plgg-guide.qmu.dev"),
      toBe("plgg-guide.qmu.dev"),
    ),
  ]));

test("isAllowedHost accepts loopback by default", () =>
  all([
    check(
      isAllowedHost([])("localhost:5181"),
      toBe(true),
    ),
    check(
      isAllowedHost([])("127.0.0.1:5181"),
      toBe(true),
    ),
  ]));

test("isAllowedHost accepts a config-supplied tunnel host", () =>
  check(
    isAllowedHost(["plgg-guide.qmu.dev"])(
      "plgg-guide.qmu.dev",
    ),
    toBe(true),
  ));

test("isAllowedHost refuses an unlisted host", () =>
  check(
    isAllowedHost(["plgg-guide.qmu.dev"])(
      "evil.example.com",
    ),
    toBe(false),
  ));
