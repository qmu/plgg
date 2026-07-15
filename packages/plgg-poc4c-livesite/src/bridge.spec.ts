import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type Result,
  type InvalidError,
  pipe,
  matchResult,
} from "plgg";
import {
  type PatchMessage,
  type PatchReport,
  CHANNEL,
  asPatchMessage,
  asPatchReport,
  patchEnvelope,
  reportEnvelope,
} from "./bridge.ts";

// The seam that only exists because 4c's page is not its
// own: postMessage carries `unknown`, exactly like HTTP,
// so both directions are decoded rather than trusted. The
// channel tag is what stops any other script on the real
// rendered page from driving this one.

const kindOf = (
  result: Result<
    PatchMessage | PatchReport,
    InvalidError
  >,
): string =>
  pipe(
    result,
    matchResult(
      (): string => "rejected",
      (
        m: PatchMessage | PatchReport,
      ): string => m.kind,
    ),
  );

/* ------------------------------------------------ *
 * Shell → injected client                           *
 * ------------------------------------------------ */

test("arm and drop round-trip through their envelopes", () =>
  all([
    check(
      kindOf(
        asPatchMessage(
          patchEnvelope({ kind: "arm" }),
        ),
      ),
      toBe("arm"),
    ),
    check(
      kindOf(
        asPatchMessage(
          patchEnvelope({ kind: "drop" }),
        ),
      ),
      toBe("drop"),
    ),
  ]));

test("a patch round-trips with its ops intact — the same ops the server applied to disk", () =>
  check(
    pipe(
      asPatchMessage(
        patchEnvelope({
          kind: "patch",
          ops: [
            { find: "cat", replace: "dog" },
          ],
        }),
      ),
      matchResult(
        (): unknown => "rejected",
        (m: PatchMessage): unknown =>
          m.kind === "patch" ? m.ops : "wrong",
      ),
    ),
    toEqual([{ find: "cat", replace: "dog" }]),
  ));

test("a message on another channel is REJECTED — the real page runs the site's own scripts too", () =>
  check(
    kindOf(
      asPatchMessage({
        channel: "something-else",
        kind: "arm",
      }),
    ),
    toBe("rejected"),
  ));

test("an untagged or unknown message is rejected, never guessed at", () =>
  all([
    check(
      kindOf(asPatchMessage({ kind: "arm" })),
      toBe("rejected"),
    ),
    check(
      kindOf(
        asPatchMessage({
          channel: CHANNEL,
          kind: "detonate",
        }),
      ),
      toBe("rejected"),
    ),
    check(
      kindOf(asPatchMessage("hello")),
      toBe("rejected"),
    ),
    check(
      kindOf(asPatchMessage(null)),
      toBe("rejected"),
    ),
  ]));

test("a patch whose ops are malformed is rejected rather than half-applied", () =>
  all([
    check(
      kindOf(
        asPatchMessage({
          channel: CHANNEL,
          kind: "patch",
          ops: [{ find: "cat" }],
        }),
      ),
      toBe("rejected"),
    ),
    check(
      kindOf(
        asPatchMessage({
          channel: CHANNEL,
          kind: "patch",
          ops: "not an array",
        }),
      ),
      toBe("rejected"),
    ),
  ]));

/* ------------------------------------------------ *
 * Injected client → shell                           *
 * ------------------------------------------------ */

test("an applied report round-trips with its span count", () =>
  check(
    pipe(
      asPatchReport(
        reportEnvelope({
          kind: "applied",
          spans: 3,
        }),
      ),
      matchResult(
        (): number => -1,
        (r: PatchReport): number =>
          r.kind === "applied" ? r.spans : -1,
      ),
    ),
    toBe(3),
  ));

test("an unmapped report round-trips WITH its failure kind and reason — the measurement the PoC exists for", () =>
  check(
    pipe(
      asPatchReport(
        reportEnvelope({
          kind: "unmapped",
          failure: "NotInDom",
          reason: "the renderer split it",
        }),
      ),
      matchResult(
        (): unknown => "rejected",
        (r: PatchReport): unknown =>
          r.kind === "unmapped"
            ? [r.failure, r.reason]
            : "wrong",
      ),
    ),
    toEqual([
      "NotInDom",
      "the renderer split it",
    ]),
  ));

test("a report on another channel, or of an unknown kind, is rejected", () =>
  all([
    check(
      kindOf(
        asPatchReport({
          channel: "elsewhere",
          kind: "applied",
          spans: 1,
        }),
      ),
      toBe("rejected"),
    ),
    check(
      kindOf(
        asPatchReport({
          channel: CHANNEL,
          kind: "exploded",
        }),
      ),
      toBe("rejected"),
    ),
  ]));

test("an applied report missing its count, or an unmapped one missing its reason, is rejected", () =>
  all([
    check(
      kindOf(
        asPatchReport({
          channel: CHANNEL,
          kind: "applied",
        }),
      ),
      toBe("rejected"),
    ),
    check(
      kindOf(
        asPatchReport({
          channel: CHANNEL,
          kind: "unmapped",
          failure: "NotInDom",
        }),
      ),
      toBe("rejected"),
    ),
  ]));
