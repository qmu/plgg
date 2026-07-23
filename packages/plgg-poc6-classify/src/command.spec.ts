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
  type VariantQuery,
} from "./variants.ts";
import {
  type CommandError,
  parseQueryCommand,
} from "./command.ts";

const kindOf = (
  r: Result<VariantQuery, CommandError>,
): string =>
  pipe(
    r,
    matchResult(
      (e: CommandError): string => `err:${e.kind}`,
      (vq: VariantQuery): string => vq.kind,
    ),
  );

const read = (
  r: Result<VariantQuery, CommandError>,
  f: (vq: VariantQuery) => string,
): string =>
  pipe(
    r,
    matchResult(
      (): string => "err",
      (vq: VariantQuery): string => f(vq),
    ),
  );

test("each verb parses to the right variant query", () =>
  all([
    check(
      kindOf(parseQueryCommand("facets and a b")),
      toBe("tag-facets"),
    ),
    check(
      kindOf(parseQueryCommand("links x.md")),
      toBe("link-graph"),
    ),
    check(
      kindOf(
        parseQueryCommand("filter opt #concepts"),
      ),
      toBe("multi-filter"),
    ),
  ]));

test("facets reads the mode and the tags", () =>
  all([
    check(
      read(
        parseQueryCommand(
          "facets or concepts packages",
        ),
        (vq) =>
          vq.kind === "tag-facets"
            ? `${vq.query.mode}:${vq.query.tags.join(",")}`
            : "?",
      ),
      toBe("or:concepts,packages"),
    ),
    check(
      read(parseQueryCommand("facets and"), (vq) =>
        vq.kind === "tag-facets"
          ? `${vq.query.mode}:${vq.query.tags.length}`
          : "?",
      ),
      toBe("and:0"),
    ),
  ]));

test("filter splits #tags from the text", () =>
  check(
    read(
      parseQueryCommand("filter big idea #a #b"),
      (vq) =>
        vq.kind === "multi-filter"
          ? `${vq.query.text}|${vq.query.tags.join(",")}`
          : "?",
    ),
    toBe("big idea|a,b"),
  ));

test("links carries the focus path", () =>
  check(
    read(
      parseQueryCommand("links concepts/index.md"),
      (vq) =>
        vq.kind === "link-graph"
          ? vq.query.focus
          : "?",
    ),
    toBe("concepts/index.md"),
  ));

test("typed errors for empty, unknown verb, missing arg, and bad mode", () =>
  all([
    check(
      kindOf(parseQueryCommand("   ")),
      toBe("err:Empty"),
    ),
    check(
      kindOf(parseQueryCommand("wibble x")),
      toBe("err:UnknownVerb"),
    ),
    check(
      kindOf(parseQueryCommand("facets")),
      toBe("err:MissingArgument"),
    ),
    check(
      kindOf(parseQueryCommand("facets nand a")),
      toBe("err:UnknownMode"),
    ),
    check(
      kindOf(parseQueryCommand("links")),
      toBe("err:MissingArgument"),
    ),
    check(
      kindOf(parseQueryCommand("filter")),
      toBe("err:MissingArgument"),
    ),
  ]));
