import {
  test,
  check,
  toBe,
  okThen,
} from "plgg-test";
import {
  thumbprintKid,
  kidString,
} from "plgg-auth/index";
import { rfc7638Example } from "plgg-auth/Jose/testkit/rfcVectors";
import { b64 } from "plgg-auth/Jose/testkit/fixtures";

test("thumbprintKid reproduces the RFC 7638 §3.1 example", async () =>
  check(
    await thumbprintKid({
      n: b64(rfc7638Example.n),
      e: b64(rfc7638Example.e),
    }),
    okThen((kid) =>
      toBe(rfc7638Example.kid)(kidString(kid)),
    ),
  ));

test("thumbprintKid is deterministic", async () => {
  const material = {
    n: b64(rfc7638Example.n),
    e: b64(rfc7638Example.e),
  };
  const first = await thumbprintKid(material);
  return check(
    await thumbprintKid(material),
    okThen((kid) =>
      check(
        first.__tag === "Ok" &&
          kidString(first.content) ===
            kidString(kid),
        toBe(true),
      ),
    ),
  );
});
