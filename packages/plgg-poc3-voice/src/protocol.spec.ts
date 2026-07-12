import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { isErr } from "plgg";
import { asSessionGrant } from "./protocol.ts";

test("asSessionGrant decodes the mint response", () =>
  check(
    asSessionGrant({
      value: "ek_test",
      expiresAt: 1234,
    }),
    okThen((grant) =>
      all([
        toBe("ek_test")(grant.value),
        toBe(1234)(grant.expiresAt),
      ]),
    ),
  ));

test("asSessionGrant rejects a partial grant", () =>
  check(
    isErr(asSessionGrant({ value: "ek" })),
    toBe(true),
  ));
