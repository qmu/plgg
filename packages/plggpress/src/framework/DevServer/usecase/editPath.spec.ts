import {
  test,
  check,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { resolveEditPath } from "plggpress/framework/DevServer/usecase/editPath";

test("accepts a clean relative .md path", () =>
  check(
    resolveEditPath("guide/intro.md"),
    okThen((p) => toBe("guide/intro.md")(p)),
  ));

test("trims surrounding whitespace", () =>
  check(
    resolveEditPath("  a.md  "),
    okThen((p) => toBe("a.md")(p)),
  ));

test("rejects an empty path", () =>
  check(
    resolveEditPath("   "),
    errThen((e) => toBe("EmptyPath")(e.kind)),
  ));

test("rejects a leading-slash absolute path", () =>
  check(
    resolveEditPath("/etc/passwd.md"),
    errThen((e) => toBe("AbsolutePath")(e.kind)),
  ));

test("rejects a backslash-absolute path", () =>
  check(
    resolveEditPath("\\network\\x.md"),
    errThen((e) => toBe("AbsolutePath")(e.kind)),
  ));

test("rejects a windows drive path", () =>
  check(
    resolveEditPath("c:/x.md"),
    errThen((e) => toBe("AbsolutePath")(e.kind)),
  ));

test("rejects a parent-traversal path", () =>
  check(
    resolveEditPath("../secret.md"),
    errThen((e) => toBe("Traversal")(e.kind)),
  ));

test("rejects a dot segment", () =>
  check(
    resolveEditPath("./x.md"),
    errThen((e) => toBe("Traversal")(e.kind)),
  ));

test("rejects an empty (double-slash) segment", () =>
  check(
    resolveEditPath("a//b.md"),
    errThen((e) => toBe("Traversal")(e.kind)),
  ));

test("rejects a backslash-bearing segment", () =>
  check(
    resolveEditPath("a\\b.md"),
    errThen((e) => toBe("Traversal")(e.kind)),
  ));

test("rejects a non-markdown path", () =>
  check(
    resolveEditPath("a.txt"),
    errThen((e) => toBe("NotMarkdown")(e.kind)),
  ));
