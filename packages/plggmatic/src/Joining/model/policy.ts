import {
  type Result,
  type InvalidError,
  type Option,
  asObj,
  asSoftStr,
  asReadonlyArray,
  cast,
  forProp,
  forOptionProp,
  ok,
  err,
  invalidError,
  getOr,
  chainResult,
  pipe,
} from "plgg";
import { asOrigin } from "plggmatic/Joining/model/origin";

type Trust = "public" | "organization";
type Peer = Readonly<{
  origin: string;
  trust: Trust;
}>;
type Partner = Peer &
  Readonly<{ paths: readonly string[] }>;
type Route = Readonly<{
  path: string;
  access: Trust;
  mode: "readOnly";
  label: string;
}>;
type Grant = Readonly<{
  sender: string;
  origin: string;
  path: string;
}>;
export type JoiningPolicy = Readonly<{
  origin: string;
  partners: readonly Partner[];
  embedders: readonly Peer[];
  routes: readonly Route[];
  frames: readonly string[];
  requests: readonly Grant[];
  parentRoutes: readonly string[];
}>;

const invalid = (message: string) =>
  err(invalidError({ message }));
const trust = (
  v: unknown,
): Result<Trust, InvalidError> =>
  v === "public" || v === "organization"
    ? ok(v)
    : invalid("unknown joining trust");
const path = (
  v: unknown,
): Result<string, InvalidError> =>
  typeof v === "string" &&
  /^\/(?:[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*\/?)?$/.test(
    v,
  ) &&
  !v
    .split("/")
    .some((s) => s === "." || s === "..") &&
  new URL(v, "https://route.invalid").pathname ===
    v
    ? ok(v)
    : invalid("expected a fixed canonical path");
const peer = (v: unknown) =>
  cast(
    v,
    asObj,
    forProp("origin", asOrigin),
    forProp("trust", trust),
  );
const partner = (v: unknown) =>
  cast(
    v,
    peer,
    forProp("paths", asReadonlyArray(path)),
  );
const route = (v: unknown) =>
  cast(
    v,
    asObj,
    forProp("path", path),
    forProp("access", trust),
    forProp(
      "mode",
      (
        m: unknown,
      ): Result<"readOnly", InvalidError> =>
        m === "readOnly"
          ? ok(m)
          : invalid("expected readOnly"),
    ),
    forProp("label", asSoftStr),
  );
const grant = (v: unknown) =>
  cast(
    v,
    asObj,
    forProp("sender", asOrigin),
    forProp("origin", asOrigin),
    forProp("path", path),
  );
const list = <T>(v: Option<readonly T[]>) =>
  pipe(v, getOr<readonly T[]>([]));
const distinct = (xs: readonly string[]) =>
  new Set(xs).size === xs.length;
const distinctPaths = (
  paths: readonly string[],
) =>
  distinct(
    paths.map((path) => path.replace(/\/$/, "")),
  );
const consistent = (
  p: JoiningPolicy,
): Result<JoiningPolicy, InvalidError> => {
  const peers = [...p.partners, ...p.embedders];
  return peers.some(
    (a) =>
      a.origin === p.origin ||
      peers.some(
        (b) =>
          a.origin === b.origin &&
          a.trust !== b.trust,
      ),
  )
    ? invalid(
        "self origin or conflicting peer trust",
      )
    : !distinctPaths(
          p.routes.map((r) => r.path),
        ) ||
        !distinct(
          p.partners.map((r) => r.origin),
        ) ||
        p.partners.some(
          (r) => !distinctPaths(r.paths),
        ) ||
        !distinctPaths(p.parentRoutes)
      ? invalid("ambiguous joining route")
      : ok(p);
};

export const defineJoining = (
  input: unknown,
): Result<JoiningPolicy, InvalidError> =>
  pipe(
    cast(
      input,
      asObj,
      forProp("origin", asOrigin),
      forOptionProp(
        "partners",
        asReadonlyArray(partner),
      ),
      forOptionProp(
        "embedders",
        asReadonlyArray(peer),
      ),
      forOptionProp(
        "routes",
        asReadonlyArray(route),
      ),
      forOptionProp(
        "requests",
        asReadonlyArray(grant),
      ),
      forOptionProp(
        "frames",
        asReadonlyArray(asOrigin),
      ),
      forOptionProp(
        "parentRoutes",
        asReadonlyArray(path),
      ),
    ),
    chainResult((v) =>
      consistent({
        origin: v.origin,
        partners: list(v.partners),
        embedders: list(v.embedders),
        requests: list(v.requests),
        routes: list(v.routes),
        frames: list(v.frames),
        parentRoutes: list(v.parentRoutes),
      }),
    ),
  );

// Self-contained so the inline runtime can use this exact predicate.
export const matchesOrigin = (
  origins: readonly string[],
  origin: string,
): boolean => origins.includes(origin);
export const mayOpenColumn =
  (origin: string, path: string) =>
  (policy: JoiningPolicy): boolean =>
    policy.partners.some(
      (p) =>
        matchesOrigin([p.origin], origin) &&
        p.paths.includes(path),
    );
export const mayHonourRequest =
  (
    sender: string,
    origin: string,
    path: string,
  ) =>
  (policy: JoiningPolicy): boolean =>
    policy.requests.some(
      (g) =>
        g.sender === sender &&
        g.origin === origin &&
        g.path === path,
    ) &&
    policy.partners.some(
      (p) =>
        p.origin === sender &&
        (origin === policy.origin
          ? policy.routes.some(
              (r) =>
                r.path === path &&
                (r.access === "public" ||
                  p.trust === "organization"),
            )
          : policy.partners.some(
              (t) =>
                t.origin === origin &&
                t.paths.includes(path) &&
                (t.trust === "public" ||
                  p.trust === "organization"),
            )),
    );
const sources = (xs: readonly string[]) =>
  xs.length
    ? [...new Set(xs)].join(" ")
    : "'none'";
export const joiningDirectives = (
  policy: JoiningPolicy,
  path: string,
) => ({
  "frame-src": sources(
    policy.parentRoutes.includes(path)
      ? [
          ...policy.partners.map((p) => p.origin),
          ...policy.frames,
        ]
      : [],
  ),
  "frame-ancestors": sources(
    policy.embedders
      .filter((e) =>
        policy.routes.some(
          (r) =>
            r.path === path &&
            (r.access === "public" ||
              e.trust === "organization"),
        ),
      )
      .map((e) => e.origin),
  ),
});

const publicPeer = (origin: string): Peer => ({
  origin,
  trust: "public",
});
export const publicDocumentJoining = (
  partners: readonly string[],
  embedders: readonly string[],
  frames: readonly string[],
) => ({
  partners: partners.map(publicPeer),
  embedders: embedders.map(publicPeer),
  frames,
});

/** Append the value to the resolved HTML response's CSP. */
export const joiningHeaders = (
  policy: JoiningPolicy,
  resolvedPath: string,
) => ({
  "Content-Security-Policy": Object.entries(
    joiningDirectives(policy, resolvedPath),
  )
    .map(
      ([name, sources]) => name + " " + sources,
    )
    .join("; "),
});
