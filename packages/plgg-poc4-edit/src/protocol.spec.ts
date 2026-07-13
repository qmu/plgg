import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk } from "plgg";
import {
  asSessionGrant,
  asEditRequest,
  asEditReply,
} from "./protocol.ts";

test("the mint grant decodes value + expiresAt and rejects the rest", () =>
  all([
    check(
      isOk(
        asSessionGrant({
          value: "ek_abc",
          expiresAt: 1752300000,
        }),
      ),
      toBe(true),
    ),
    check(
      isOk(asSessionGrant({ value: "ek_abc" })),
      toBe(false),
    ),
    check(
      isOk(asSessionGrant("nope")),
      toBe(false),
    ),
  ]));

test("the edit request decodes path + content and rejects the rest", () =>
  all([
    check(
      isOk(
        asEditRequest({
          path: "concepts/result.md",
          content: "# Result\n",
        }),
      ),
      toBe(true),
    ),
    check(
      isOk(
        asEditRequest({
          path: "concepts/result.md",
        }),
      ),
      toBe(false),
    ),
    check(isOk(asEditRequest(null)), toBe(false)),
  ]));

test("the edit reply decodes the landed path", () =>
  all([
    check(
      isOk(
        asEditReply({
          path: "concepts/result.md",
        }),
      ),
      toBe(true),
    ),
    check(isOk(asEditReply({})), toBe(false)),
  ]));
