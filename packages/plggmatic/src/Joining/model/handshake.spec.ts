import {
  test,
  check,
  toBe,
  okThen,
} from "plgg-test";
import {
  defineJoining,
  joiningHeaders,
  type JoiningPolicy,
} from "plggmatic/Joining/model/policy";
import {
  message,
  matchesConnection,
  mayAnswer,
} from "plggmatic/Joining/model/handshake";

const origin = "https://child.test";
const parent = "https://parent.test";
const path = "/guide/";
const nonce =
  "01234567-89ab-4def-abcd-0123456789ab";
const ready = message("ready", nonce, path);
test("only a reply to this load, version and route can reveal a frame", () =>
  check(
    [
      ready,
      { ...ready, version: 2 },
      { ...ready, nonce: crypto.randomUUID() },
      { ...ready, path: "/edit/" },
      { ...ready, kind: "accept" },
      { type: "pm:title" },
    ].filter(
      matchesConnection("ready", nonce, path),
    ).length,
    toBe(1),
  ));
const policy = defineJoining({
  origin,
  embedders: [
    { origin: parent, trust: "public" },
  ],
  routes: [
    {
      path,
      access: "public",
      mode: "readOnly",
      label: "Guide",
    },
  ],
});
test("a child answers only on its exact public view for a registered parent", () =>
  check(
    policy,
    okThen((p: JoiningPolicy) =>
      toBe(true)(
        mayAnswer(
          parent,
          origin + path + "?pm-embed=1",
          path,
        )(p) &&
          !mayAnswer(
            origin,
            origin + path + "?pm-embed=1",
            path,
          )(p) &&
          !mayAnswer(
            parent,
            origin + path,
            path,
          )(p) &&
          !mayAnswer(
            parent,
            origin + "/edit/?pm-embed=1",
            "/edit/",
          )(p) &&
          !mayAnswer(
            parent,
            origin + path + "?pm-embed=1&edit",
            path,
          )(p),
      ),
    ),
  ));
test("ordinary routes and error responses deny even the registered parent", () =>
  check(
    policy,
    okThen((p: JoiningPolicy) =>
      toBe(true)(
        joiningHeaders(p, path)[
          "Content-Security-Policy"
        ].includes("frame-ancestors " + parent) &&
          ["/edit/", ""].every(
            (route) =>
              joiningHeaders(p, route)[
                "Content-Security-Policy"
              ] ===
              "frame-src 'none'; frame-ancestors 'none'",
          ),
      ),
    ),
  ));
