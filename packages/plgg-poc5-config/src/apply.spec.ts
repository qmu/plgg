import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  pipe,
  matchResult,
} from "plgg";
import {
  type Config,
  DEFAULT_CONFIG,
} from "./config.ts";
import {
  type ConfigOp,
  type ConfigError,
  applyOp,
  applyOps,
} from "./apply.ts";

const base: Config = DEFAULT_CONFIG;

const errKind = (
  r: Result<Config, ConfigError>,
): string =>
  pipe(
    r,
    matchResult(
      (e: ConfigError): string => e.kind,
      (): string => "ok",
    ),
  );

const cfgOr = (
  r: Result<Config, ConfigError>,
): Config =>
  pipe(
    r,
    matchResult(
      (): Config => base,
      (c: Config): Config => c,
    ),
  );

const setTheme: ConfigOp = {
  kind: "SetSizingTheme",
  theme: "sz-spacious",
};
const setLayout: ConfigOp = {
  kind: "SetLayout",
  layout: "wide",
};

test("SetTag with a new slug appends a class", () =>
  check(
    cfgOr(
      applyOp(base, {
        kind: "SetTag",
        tag: {
          slug: "advanced",
          name: "Advanced",
          color: "warning",
          emoji: "🔥",
          description: "",
        },
      }),
    ).tags.some((t) => t.slug === "advanced"),
    toBe(true),
  ));

test("SetTag with an existing slug reclassifies in place (no duplicate)", () => {
  const next = cfgOr(
    applyOp(base, {
      kind: "SetTag",
      tag: {
        slug: "concepts",
        name: "Ideas",
        color: "danger",
        emoji: "🧠",
        description: "renamed",
      },
    }),
  );
  return all([
    check(
      next.tags.filter(
        (t) => t.slug === "concepts",
      ).length,
      toBe(1),
    ),
    check(
      next.tags.some(
        (t) =>
          t.slug === "concepts" &&
          t.color === "danger",
      ),
      toBe(true),
    ),
  ]);
});

test("SetTag with an empty slug is a typed EmptySlug error", () =>
  check(
    errKind(
      applyOp(base, {
        kind: "SetTag",
        tag: {
          slug: "",
          name: "x",
          color: "primary",
          emoji: "",
          description: "",
        },
      }),
    ),
    toBe("EmptySlug"),
  ));

test("ExcludePath adds an exclusion; a duplicate and an empty one are typed errors", () =>
  all([
    check(
      cfgOr(
        applyOp(base, {
          kind: "ExcludePath",
          glob: "contributing/**",
        }),
      ).exclusions.includes("contributing/**"),
      toBe(true),
    ),
    check(
      errKind(
        applyOp(base, {
          kind: "ExcludePath",
          glob: "",
        }),
      ),
      toBe("EmptyGlob"),
    ),
    check(
      errKind(
        applyOp(
          {
            ...base,
            exclusions: ["contributing/**"],
          },
          {
            kind: "ExcludePath",
            glob: "contributing/**",
          },
        ),
      ),
      toBe("DuplicateExclusion"),
    ),
  ]));

test("IncludePath removes an exclusion; unknown and empty are typed errors", () =>
  all([
    check(
      cfgOr(
        applyOp(
          {
            ...base,
            exclusions: ["contributing/**"],
          },
          {
            kind: "IncludePath",
            glob: "contributing/**",
          },
        ),
      ).exclusions.length,
      toBe(0),
    ),
    check(
      errKind(
        applyOp(base, {
          kind: "IncludePath",
          glob: "nope/**",
        }),
      ),
      toBe("UnknownExclusion"),
    ),
    check(
      errKind(
        applyOp(base, {
          kind: "IncludePath",
          glob: "",
        }),
      ),
      toBe("EmptyGlob"),
    ),
  ]));

test("SetSizingTheme and SetLayout always land", () =>
  all([
    check(
      cfgOr(applyOp(base, setTheme)).sizingTheme,
      toBe("sz-spacious"),
    ),
    check(
      cfgOr(applyOp(base, setLayout)).layout,
      toBe("wide"),
    ),
  ]));

test("applyOps applies a batch left to right", () =>
  check(
    cfgOr(applyOps(base, [setTheme, setLayout]))
      .layout,
    toBe("wide"),
  ));

test("applyOps short-circuits on the first refusal", () =>
  check(
    errKind(
      applyOps(base, [
        setTheme,
        { kind: "ExcludePath", glob: "" },
        setLayout,
      ]),
    ),
    toBe("EmptyGlob"),
  ));
