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
  type ConfigOp,
  applyOp,
} from "./apply.ts";
import { DEFAULT_CONFIG } from "./config.ts";
import {
  type CommandError,
  parseConfigCommand,
} from "./command.ts";

const opKind = (
  r: Result<ConfigOp, CommandError>,
): string =>
  pipe(
    r,
    matchResult(
      (e: CommandError): string => `err:${e.kind}`,
      (op: ConfigOp): string => op.kind,
    ),
  );

// Pull a field off a parsed SetTag op, for asserting the
// key=value extraction (spaces included).
const tagField = (
  r: Result<ConfigOp, CommandError>,
  read: (op: ConfigOp) => string,
): string =>
  pipe(
    r,
    matchResult(
      (): string => "err",
      (op: ConfigOp): string => read(op),
    ),
  );

test("parses each verb into the right op", () =>
  all([
    check(
      opKind(parseConfigCommand("tag concepts")),
      toBe("SetTag"),
    ),
    check(
      opKind(
        parseConfigCommand("exclude x/**"),
      ),
      toBe("ExcludePath"),
    ),
    check(
      opKind(
        parseConfigCommand("include x/**"),
      ),
      toBe("IncludePath"),
    ),
    check(
      opKind(
        parseConfigCommand("theme sz-airy"),
      ),
      toBe("SetSizingTheme"),
    ),
    check(
      opKind(parseConfigCommand("layout wide")),
      toBe("SetLayout"),
    ),
  ]));

test("tag reads key=value fields, allowing spaces in name/desc", () =>
  all([
    check(
      tagField(
        parseConfigCommand(
          "tag concepts color=success emoji=🧠 name=Core Ideas desc=the big ones",
        ),
        (op) =>
          op.kind === "SetTag"
            ? op.tag.name
            : "?",
      ),
      toBe("Core Ideas"),
    ),
    check(
      tagField(
        parseConfigCommand(
          "tag concepts color=success name=Core Ideas desc=the big ones",
        ),
        (op) =>
          op.kind === "SetTag"
            ? op.tag.description
            : "?",
      ),
      toBe("the big ones"),
    ),
    check(
      tagField(
        parseConfigCommand("tag concepts"),
        (op) =>
          op.kind === "SetTag"
            ? op.tag.color
            : "?",
      ),
      toBe("primary"),
    ),
  ]));

test("a parsed tag command reclassifies when applied", () =>
  check(
    pipe(
      parseConfigCommand(
        "tag concepts color=danger emoji=🧠 name=Ideas",
      ),
      matchResult(
        (): string => "err",
        (op: ConfigOp): string =>
          pipe(
            applyOp(DEFAULT_CONFIG, op),
            matchResult(
              (): string => "err",
              (c): string =>
                c.tags.find(
                  (t) => t.slug === "concepts",
                )?.color ?? "?",
            ),
          ),
      ),
    ),
    toBe("danger"),
  ));

test("typed errors for empty, unknown verb, missing arg, and bad closed values", () =>
  all([
    check(
      opKind(parseConfigCommand("   ")),
      toBe("err:Empty"),
    ),
    check(
      opKind(parseConfigCommand("frobnicate x")),
      toBe("err:UnknownVerb"),
    ),
    check(
      opKind(parseConfigCommand("exclude")),
      toBe("err:MissingArgument"),
    ),
    check(
      opKind(parseConfigCommand("include")),
      toBe("err:MissingArgument"),
    ),
    check(
      opKind(parseConfigCommand("tag")),
      toBe("err:MissingArgument"),
    ),
    check(
      opKind(
        parseConfigCommand(
          "tag x color=chartreuse",
        ),
      ),
      toBe("err:UnknownColor"),
    ),
    check(
      opKind(parseConfigCommand("theme huge")),
      toBe("err:UnknownTheme"),
    ),
    check(
      opKind(
        parseConfigCommand("layout diagonal"),
      ),
      toBe("err:UnknownLayout"),
    ),
  ]));
