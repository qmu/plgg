import {
  test,
  check,
  all,
  toBe,
  toHaveLength,
} from "plgg-test";
import { fingerprint } from "plgg-cms/domainCore/Domain/model/Fingerprint";

test("fingerprint is deterministic and 16 hex digits", () =>
  all([
    check(
      fingerprint("hello"),
      toBe(fingerprint("hello")),
    ),
    check(
      fingerprint("hello"),
      toHaveLength(16),
    ),
  ]));

test("fingerprint distinguishes different inputs", () =>
  check(
    fingerprint("a") !== fingerprint("b"),
    toBe(true),
  ));

test("fingerprint of the empty string is the FNV basis", () =>
  check(
    fingerprint(""),
    toBe("cbf29ce484222325"),
  ));
