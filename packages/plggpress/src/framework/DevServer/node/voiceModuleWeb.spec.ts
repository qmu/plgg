import { none } from "plgg";
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
  not,
  toContain,
  okThen,
} from "plgg-test";
import { voiceModuleWeb } from "plggpress/framework/DevServer/node/voiceModuleWeb";
import { VOICE_MODULE_PARAM } from "plggpress/framework/DevServer/model/VoiceProtocol";

// The route the browser loads the voice client from. The
// router fills `params`, so a spec supplies them directly.
const asking = (
  name: string | undefined,
): Context =>
  makeContext({
    method: "GET",
    path: "/__plggpress_voice/module/x",
    query: {},
    headers: {},
    params:
      name === undefined
        ? {}
        : { [VOICE_MODULE_PARAM]: name },
    body: "",
    bytes: none(),
  });

const bodyOf = (res: HttpResponse): string =>
  typeof res.body === "string" ? res.body : "";

test("serves the client as type-stripped JavaScript", async () =>
  check(
    await voiceModuleWeb()(asking("voiceClient")),
    okThen((res: HttpResponse) =>
      all([
        toBe(200)(res.status.content),
        toContain("text/javascript")(
          res.headers["content-type"] ?? "",
        ),
        toBe("no-store")(
          res.headers["cache-control"] ?? "",
        ),
        // the client's relative sibling import survives
        // stripping, so the browser can resolve it against
        // the same module base
        toContain('from "./voiceProtocol"')(
          bodyOf(res),
        ),
        // …and every type annotation is gone
        not(toContain(": Promise<void>"))(
          bodyOf(res),
        ),
        not(toContain("import {\n  type"))(
          bodyOf(res),
        ),
      ]),
    ),
  ));

test("serves the pure protocol module too", async () =>
  check(
    await voiceModuleWeb()(
      asking("voiceProtocol"),
    ),
    okThen((res: HttpResponse) =>
      all([
        toBe(200)(res.status.content),
        toContain("export const voiceEventOf")(
          bodyOf(res),
        ),
      ]),
    ),
  ));

test("an unlisted module is a named 404", async () =>
  check(
    await voiceModuleWeb()(asking("cli")),
    okThen((res: HttpResponse) =>
      all([
        toBe(404)(res.status.content),
        toContain("is not a dev voice module")(
          bodyOf(res),
        ),
      ]),
    ),
  ));

test("a request with no module name is a 404", async () =>
  check(
    await voiceModuleWeb()(asking(undefined)),
    okThen((res: HttpResponse) =>
      all([
        toBe(404)(res.status.content),
        toContain("no module was named")(
          bodyOf(res),
        ),
      ]),
    ),
  ));
