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
  type EditPathError,
  resolveEditPath,
} from "./editPath.ts";

// The path security boundary carried over from PoC 4:
// every refused shape pinned, one check per rule, so a
// regression in the ONE authoritative guard cannot land
// silently — a granular op still resolves to one path.

const kindOf = (
  result: Result<string, EditPathError>,
): string =>
  pipe(
    result,
    matchResult(
      (e: EditPathError): string => e.kind,
      (): string => "ok",
    ),
  );

test("resolveEditPath accepts plain relative .md paths only", () =>
  all([
    check(
      kindOf(resolveEditPath("index.md")),
      toBe("ok"),
    ),
    check(
      kindOf(
        resolveEditPath("concepts/result.md"),
      ),
      toBe("ok"),
    ),
  ]));

test("resolveEditPath refuses empty and blank paths", () =>
  all([
    check(
      kindOf(resolveEditPath("")),
      toBe("EmptyPath"),
    ),
    check(
      kindOf(resolveEditPath("   ")),
      toBe("EmptyPath"),
    ),
  ]));

test("resolveEditPath refuses absolute paths of every spelling", () =>
  all([
    check(
      kindOf(resolveEditPath("/etc/passwd.md")),
      toBe("AbsolutePath"),
    ),
    check(
      kindOf(
        resolveEditPath("\\\\server\\share.md"),
      ),
      toBe("AbsolutePath"),
    ),
    check(
      kindOf(
        resolveEditPath("C:/windows/boot.md"),
      ),
      toBe("AbsolutePath"),
    ),
  ]));

test("resolveEditPath refuses traversal in any segment", () =>
  all([
    check(
      kindOf(
        resolveEditPath("../guide/index.md"),
      ),
      toBe("Traversal"),
    ),
    check(
      kindOf(resolveEditPath("./index.md")),
      toBe("Traversal"),
    ),
    check(
      kindOf(resolveEditPath("a//b.md")),
      toBe("Traversal"),
    ),
    check(
      kindOf(
        resolveEditPath("a\\..\\secrets.md"),
      ),
      toBe("Traversal"),
    ),
  ]));

test("resolveEditPath refuses everything but markdown", () =>
  all([
    check(
      kindOf(resolveEditPath("site.config.ts")),
      toBe("NotMarkdown"),
    ),
    check(
      kindOf(resolveEditPath("concepts/result")),
      toBe("NotMarkdown"),
    ),
  ]));

test("resolveEditPath normalizes surrounding whitespace", () =>
  check(
    pipe(
      resolveEditPath("  concepts/result.md "),
      matchResult(
        (): string => "?",
        (path: string): string => path,
      ),
    ),
    toBe("concepts/result.md"),
  ));

test("every refusal words an actionable reason", () =>
  all(
    [
      "",
      "/etc/passwd.md",
      "../x.md",
      "notes.txt",
    ].map((requested) =>
      check(
        pipe(
          resolveEditPath(requested),
          matchResult(
            (e: EditPathError): boolean =>
              e.message.length > 0,
            (): boolean => false,
          ),
        ),
        toBe(true),
      ),
    ),
  ));
