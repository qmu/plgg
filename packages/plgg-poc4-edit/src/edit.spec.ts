import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Result,
  isOk,
  pipe,
  matchResult,
} from "plgg";
import {
  type EditPathError,
  resolveEditPath,
  EDIT_TOOL,
} from "./edit.ts";

// THE security boundary of this PoC: every refused
// shape is pinned here, one check per rule, so a
// regression in the ONE authoritative guard cannot land
// silently.

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
    check(
      kindOf(
        resolveEditPath("packages/plgg-view.md"),
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
      kindOf(
        resolveEditPath("concepts/../../x.md"),
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
      kindOf(resolveEditPath("notes.txt")),
      toBe("NotMarkdown"),
    ),
    check(
      kindOf(resolveEditPath("concepts/result")),
      toBe("NotMarkdown"),
    ),
  ]));

test("resolveEditPath normalizes surrounding whitespace", () =>
  all([
    check(
      pipe(
        resolveEditPath("  concepts/result.md "),
        matchResult(
          (): string => "?",
          (path: string): string => path,
        ),
      ),
      toBe("concepts/result.md"),
    ),
  ]));

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

test("the edit tool schema names both required arguments", () =>
  all([
    check(EDIT_TOOL.name, toBe("edit_file")),
    check(
      EDIT_TOOL.parameters.required.includes(
        "path",
      ) &&
        EDIT_TOOL.parameters.required.includes(
          "content",
        ),
      toBe(true),
    ),
    check(
      isOk(resolveEditPath("index.md")),
      toBe(true),
    ),
  ]));
