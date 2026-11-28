import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import { isErr } from "plgg";
import {
  defineJoining,
  mayOpenColumn,
  mayHonourRequest,
  joiningDirectives,
  type JoiningPolicy,
} from "plggmatic/Joining/model/policy";

const origin = "https://host.test";
const partner = {
  origin: "https://public.test",
  trust: "public",
  paths: ["/guide"],
};
const staff = {
  origin: "https://staff.test",
  trust: "organization",
  paths: ["/status"],
};
const route = {
  path: "/status",
  mode: "readOnly",
  access: "organization",
  label: "Status",
};
const frame = "https://widget.test";
const policy = defineJoining({
  origin,
  partners: [partner, staff],
  embedders: [partner, staff],
  frames: [frame],
  parentRoutes: ["/"],
  routes: [route],
  requests: [
    {
      sender: partner.origin,
      origin: staff.origin,
      path: "/status",
    },
    {
      sender: staff.origin,
      origin: partner.origin,
      path: "/guide",
    },
    {
      sender: partner.origin,
      origin,
      path: "/status",
    },
  ],
});

test("omitted lists deny all joins", () =>
  check(
    defineJoining({ origin }),
    okThen((p: JoiningPolicy) =>
      toBe(true)(
        [
          p.partners,
          p.embedders,
          p.frames,
          p.routes,
          p.requests,
          p.parentRoutes,
        ].every((xs) => xs.length === 0),
      ),
    ),
  ));
test("rejects self peers, conflicting trust and overlapping route spellings", () =>
  all(
    [
      { partners: [{ ...partner, origin }] },
      { embedders: [{ ...staff, origin }] },
      {
        partners: [staff],
        embedders: [
          { ...staff, trust: "public" },
        ],
      },
      {
        routes: [
          route,
          { ...route, path: "/status/" },
        ],
      },
      {
        partners: [
          {
            ...partner,
            origin: "https://public.test/",
          },
        ],
      },
      ...[
        "//host",
        "/a%2fb",
        "/a?b",
        "/a#c",
        "/a/../b",
        "/a\\b",
        "/:id",
        "/*",
      ].map((path) => ({
        partners: [{ ...partner, paths: [path] }],
      })),
    ].map((input) =>
      check(
        isErr(
          defineJoining({ origin, ...input }),
        ),
        toBe(true),
      ),
    ),
  ));
test("only exact partner destinations can open", () =>
  check(
    policy,
    okThen((p: JoiningPolicy) =>
      toBe(true)(
        mayOpenColumn(
          partner.origin,
          "/guide",
        )(p) &&
          !mayOpenColumn(frame, "/guide")(p) &&
          !mayOpenColumn(
            partner.origin,
            "/guide?q=1",
          )(p),
      ),
    ),
  ));
test("open requests require the exact grant and sufficient sender trust", () =>
  check(
    policy,
    okThen((p: JoiningPolicy) =>
      toBe(true)(
        mayHonourRequest(
          staff.origin,
          partner.origin,
          "/guide",
        )(p) &&
          !mayHonourRequest(
            partner.origin,
            staff.origin,
            "/status",
          )(p) &&
          !mayHonourRequest(
            partner.origin,
            origin,
            "/status",
          )(p) &&
          !mayHonourRequest(
            staff.origin,
            origin,
            "/status",
          )(p),
      ),
    ),
  ));
test("directives restrict each resolved route independently", () =>
  check(
    policy,
    okThen((p: JoiningPolicy) =>
      toBe(true)(
        joiningDirectives(p, "/status")[
          "frame-ancestors"
        ] === staff.origin &&
          joiningDirectives(p, "/")[
            "frame-src"
          ] ===
            [
              partner.origin,
              staff.origin,
              frame,
            ].join(" ") &&
          Object.values(
            joiningDirectives(p, "/edit"),
          ).every((v) => v === "'none'"),
      ),
    ),
  ));
