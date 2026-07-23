import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import { isOk, isErr } from "plgg";
import {
  asEditRequest,
  asEditReply,
  asSessionGrant,
} from "./protocol.ts";

// The wire boundary: every seam decodes `unknown` inward.
// A valid shape passes; a missing/mistyped field is a
// typed error, never an `as`.

test("asEditRequest accepts a granular {path, edits} body", () =>
  all([
    check(
      isOk(
        asEditRequest({
          path: "concepts/result.md",
          edits: [
            { find: "throw", replace: "return" },
          ],
        }),
      ),
      toBe(true),
    ),
    // An empty edits list is a valid SHAPE (the applier
    // is what rejects it as a no-op / error, not the
    // decoder).
    check(
      isOk(
        asEditRequest({
          path: "a.md",
          edits: [],
        }),
      ),
      toBe(true),
    ),
  ]));

test("asEditRequest rejects a missing path, a non-array edits, and a malformed op", () =>
  all([
    check(
      isErr(asEditRequest({ edits: [] })),
      toBe(true),
    ),
    check(
      isErr(
        asEditRequest({
          path: "a.md",
          edits: "nope",
        }),
      ),
      toBe(true),
    ),
    check(
      isErr(
        asEditRequest({
          path: "a.md",
          edits: [{ find: "x" }],
        }),
      ),
      toBe(true),
    ),
  ]));

test("asEditReply accepts {path, text, segments} and decodes both segment kinds", () =>
  all([
    check(
      isOk(
        asEditReply({
          path: "a.md",
          text: "the dog sat",
          segments: [
            { kind: "kept", text: "the " },
            {
              kind: "changed",
              before: "cat",
              after: "dog",
            },
            { kind: "kept", text: " sat" },
          ],
        }),
      ),
      toBe(true),
    ),
    // An unknown segment kind is refused.
    check(
      isErr(
        asEditReply({
          path: "a.md",
          text: "x",
          segments: [{ kind: "mystery" }],
        }),
      ),
      toBe(true),
    ),
  ]));

test("asSessionGrant validates the mint reply", () =>
  all([
    check(
      isOk(
        asSessionGrant({
          value: "ek_123",
          expiresAt: 1234567890,
        }),
      ),
      toBe(true),
    ),
    check(
      isErr(asSessionGrant({ value: "ek_123" })),
      toBe(true),
    ),
  ]));
