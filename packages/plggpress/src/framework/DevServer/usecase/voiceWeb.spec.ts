import {
  type Option,
  type PromisedResult,
  type Defect,
  ok,
  err,
  none,
  some,
  defect,
} from "plgg";
import {
  type EphemeralKey,
  type KeyMinter,
} from "plgg-kit";
import {
  type Context,
  type HttpResponse,
  makeContext,
} from "plggpress/framework";
import {
  test,
  check,
  all,
  toBe,
  toContain,
  okThen,
} from "plgg-test";
import {
  voiceHealthHandler,
  voiceSessionHandler,
} from "plggpress/framework/DevServer/usecase/voiceWeb";

// A request is plain data here — these handlers read nothing
// off it, which is exactly the point: the mint's only input is
// the INJECTED minter, so no spec ever reaches the network.
const request = (): Context =>
  makeContext({
    method: "POST",
    path: "/__plggpress_voice/session",
    query: {},
    headers: {},
    params: {},
    body: "",
    bytes: none(),
  });

// A minter that answers a fixed grant — the success path
// without OpenAI.
const granting = (): Option<KeyMinter> =>
  some({
    mint: (): PromisedResult<
      EphemeralKey,
      Defect
    > =>
      Promise.resolve(
        ok({
          value: "ek_ephemeral_grant",
          expiresAt: 1793000000,
        }),
      ),
  });

// A minter whose upstream call failed.
const failing = (): Option<KeyMinter> =>
  some({
    mint: (): PromisedResult<
      EphemeralKey,
      Defect
    > =>
      Promise.resolve(
        err(defect("realtime session HTTP 429")),
      ),
  });

const bodyOf = (res: HttpResponse): string =>
  typeof res.body === "string" ? res.body : "";

test("health reports an unconfigured surface", async () =>
  check(
    await voiceHealthHandler(none())(request()),
    okThen((res: HttpResponse) =>
      all([
        toBe(200)(res.status.content),
        toContain('"configured":false')(
          bodyOf(res),
        ),
      ]),
    ),
  ));

test("health reports a configured surface", async () =>
  check(
    await voiceHealthHandler(granting())(
      request(),
    ),
    okThen((res: HttpResponse) =>
      toContain('"configured":true')(bodyOf(res)),
    ),
  ));

test("with no operator key the mint route is an honest 404", async () =>
  check(
    await voiceSessionHandler(none())(request()),
    okThen((res: HttpResponse) =>
      all([
        toBe(404)(res.status.content),
        toContain("OPENAI_API_KEY")(bodyOf(res)),
      ]),
    ),
  ));

test("a configured surface answers the ephemeral grant alone", async () =>
  check(
    await voiceSessionHandler(granting())(
      request(),
    ),
    okThen((res: HttpResponse) =>
      all([
        toBe(200)(res.status.content),
        toContain("ek_ephemeral_grant")(
          bodyOf(res),
        ),
        toContain('"expiresAt":1793000000')(
          bodyOf(res),
        ),
        // the standing key never appears in a response
        toBe(false)(bodyOf(res).includes("sk-")),
      ]),
    ),
  ));

test("an upstream mint failure is a named 502, not a crash", async () =>
  check(
    await voiceSessionHandler(failing())(
      request(),
    ),
    okThen((res: HttpResponse) =>
      all([
        toBe(502)(res.status.content),
        toContain("realtime session HTTP 429")(
          bodyOf(res),
        ),
      ]),
    ),
  ));
