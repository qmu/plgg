import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import { asEphemeralKey } from "plgg-kit/LLMs/model/EphemeralKey";

test("asEphemeralKey decodes the GA client_secrets response", () => {
  // GA shape: value/expires_at at the TOP level (the
  // pre-GA client_secret wrapper is retired — PoC 3
  // measured it live, 2026-07-12); extra fields like
  // `session` ride along and are ignored.
  const r = asEphemeralKey({
    value: "ek_abc",
    expires_at: 1_700_000_000,
    session: { type: "realtime" },
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
      isErr(asEphemeralKey({ value: "x" })),
      toBe(true),
    ),
    check(
      isErr(
        asEphemeralKey({
          value: 5,
          expires_at: 1,
        }),
      ),
      toBe(true),
    ),
    check(isErr(asEphemeralKey(5)), toBe(true)),
    // The retired pre-GA wrapper no longer decodes —
    // a stale upstream can't smuggle a key through.
    check(
      isErr(
        asEphemeralKey({
          client_secret: {
            value: "ek_old",
            expires_at: 1,
          },
        }),
      ),
      toBe(true),
    ),
  ]));
