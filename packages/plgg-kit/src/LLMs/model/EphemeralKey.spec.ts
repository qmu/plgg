import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import { asEphemeralKey } from "plgg-kit/LLMs/model/EphemeralKey";

test("asEphemeralKey decodes the OpenAI realtime response", () => {
  const r = asEphemeralKey({
    client_secret: {
      value: "ek_abc",
      expires_at: 1_700_000_000,
    },
  });
  return all([
    check(isOk(r), toBe(true)),
    check(
      isOk(r) ? r.content.value : "",
      toBe("ek_abc"),
    ),
    check(
      isOk(r) ? r.content.expiresAt : 0,
      toBe(1_700_000_000),
    ),
  ]);
});

test("asEphemeralKey fails closed on a malformed response", () =>
  all([
    check(isErr(asEphemeralKey({})), toBe(true)),
    check(
      isErr(
        asEphemeralKey({
          client_secret: { value: "x" },
        }),
      ),
      toBe(true),
    ),
    check(
      isErr(
        asEphemeralKey({
          client_secret: {
            value: 5,
            expires_at: 1,
          },
        }),
      ),
      toBe(true),
    ),
    check(isErr(asEphemeralKey(5)), toBe(true)),
  ]));
