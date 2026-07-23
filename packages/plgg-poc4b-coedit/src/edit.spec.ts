import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import {
  type Result,
  pipe,
  matchResult,
} from "plgg";
import {
  type EditOp,
  type EditError,
  type DocSegment,
  applyEdits,
  diffSegments,
  refineChange,
  wholeDocSegments,
  EDIT_TOOL,
} from "./edit.ts";

// The pure heart: the applier (text in → text out), the
// span locator (empty / absent / ambiguous / overlapping
// rejected as TYPED errors), and the diff builder that
// drives BOTH visualization modes. Every boundary is
// pinned so a regression in the one authority cannot land
// silently.

const op = (
  find: string,
  replace: string,
): EditOp => ({ find, replace });

const textOr = (
  result: Result<string, EditError>,
  fallback: string,
): string =>
  pipe(
    result,
    matchResult(
      (): string => fallback,
      (t: string): string => t,
    ),
  );

const kindOf = <T>(
  result: Result<T, EditError>,
): string =>
  pipe(
    result,
    matchResult(
      (e: EditError): string => e.kind,
      (): string => "ok",
    ),
  );

const segsOr = (
  result: Result<
    ReadonlyArray<DocSegment>,
    EditError
  >,
): ReadonlyArray<DocSegment> =>
  pipe(
    result,
    matchResult(
      (): ReadonlyArray<DocSegment> => [],
      (
        s: ReadonlyArray<DocSegment>,
      ): ReadonlyArray<DocSegment> => s,
    ),
  );

test("applyEdits replaces exactly the found span, nothing else", () =>
  all([
    check(
      textOr(
        applyEdits("the cat sat", [
          op("cat", "dog"),
        ]),
        "?",
      ),
      toBe("the dog sat"),
    ),
    // A span at the very start and one at the very end.
    check(
      textOr(
        applyEdits("# Title\n\nbody\n", [
          op("# Title", "# New Title"),
          op("body", "prose"),
        ]),
        "?",
      ),
      toBe("# New Title\n\nprose\n"),
    ),
  ]));

test("applyEdits applies several ops regardless of the order given", () =>
  check(
    textOr(
      applyEdits("a b c", [
        op("c", "Z"),
        op("a", "X"),
      ]),
      "?",
    ),
    toBe("X b Z"),
  ));

test("applyEdits is not a whole-file rewrite — untouched text is byte-identical", () => {
  const before =
    "line 1\nline 2 has a tpyo\nline 3\n";
  const after = textOr(
    applyEdits(before, [op("tpyo", "typo")]),
    "?",
  );
  return all([
    check(
      after,
      toBe("line 1\nline 2 has a typo\nline 3\n"),
    ),
    check(
      after.startsWith("line 1\n"),
      toBe(true),
    ),
    check(
      after.endsWith("\nline 3\n"),
      toBe(true),
    ),
  ]);
});

test("an empty find is a typed EmptyFind error", () =>
  check(
    kindOf(applyEdits("hello", [op("", "x")])),
    toBe("EmptyFind"),
  ));

test("an absent find is a typed FindAbsent error", () =>
  check(
    kindOf(
      applyEdits("hello world", [
        op("goodbye", "x"),
      ]),
    ),
    toBe("FindAbsent"),
  ));

test("an ambiguous find (more than one match) is a typed FindAmbiguous error", () =>
  check(
    kindOf(
      applyEdits("na na na", [op("na", "yes")]),
    ),
    toBe("FindAmbiguous"),
  ));

test("two edits touching the same span are a typed OverlappingEdits error", () =>
  check(
    kindOf(
      applyEdits("abcdef", [
        op("abc", "X"),
        op("bcd", "Y"),
      ]),
    ),
    toBe("OverlappingEdits"),
  ));

test("every refusal carries the offending find and an actionable message", () =>
  all(
    [
      applyEdits("hello", [op("", "x")]),
      applyEdits("hello", [op("bye", "x")]),
      applyEdits("z z", [op("z", "x")]),
    ].map((r) =>
      check(
        pipe(
          r,
          matchResult(
            (e: EditError): boolean =>
              e.message.length > 0 &&
              typeof e.find === "string",
            (): boolean => false,
          ),
        ),
        toBe(true),
      ),
    ),
  ));

test("diffSegments splits into kept runs and a changed span, in order", () =>
  check(
    segsOr(
      diffSegments("the cat sat", [
        op("cat", "dog"),
      ]),
    ),
    toEqual([
      { kind: "kept", text: "the " },
      {
        kind: "changed",
        before: "cat",
        after: "dog",
      },
      { kind: "kept", text: " sat" },
    ]),
  ));

test("diffSegments and applyEdits agree: joined afters/keeps reproduce the new document", () => {
  const src = "# H\n\nalpha beta gamma\n";
  const ops = [
    op("alpha", "ALPHA"),
    op("gamma", "GAMMA"),
  ];
  const joined = segsOr(diffSegments(src, ops))
    .map((s) =>
      s.kind === "kept" ? s.text : s.after,
    )
    .join("");
  return check(
    joined,
    toBe(textOr(applyEdits(src, ops), "?")),
  );
});

test("diffSegments emits no empty kept run for an edit at the very start", () =>
  check(
    segsOr(
      diffSegments("cat sat", [op("cat", "dog")]),
    ),
    toEqual([
      {
        kind: "changed",
        before: "cat",
        after: "dog",
      },
      { kind: "kept", text: " sat" },
    ]),
  ));

test("refineChange peels the shared prefix and suffix off a wide span", () =>
  check(
    refineChange("the cat sat", "the dog sat"),
    toEqual({
      prefix: "the ",
      before: "cat",
      after: "dog",
      suffix: " sat",
    }),
  ));

test("refineChange keeps a fully-different span whole", () =>
  check(
    refineChange("abc", "xyz"),
    toEqual({
      prefix: "",
      before: "abc",
      after: "xyz",
      suffix: "",
    }),
  ));

test("wholeDocSegments wraps a document as one kept run, and empty as none", () =>
  all([
    check(
      wholeDocSegments("hi"),
      toEqual([{ kind: "kept", text: "hi" }]),
    ),
    check(wholeDocSegments(""), toEqual([])),
  ]));

test("the edit tool is granular: it names path and edits", () =>
  all([
    check(EDIT_TOOL.name, toBe("edit_doc")),
    check(
      EDIT_TOOL.parameters.required.includes(
        "path",
      ) &&
        EDIT_TOOL.parameters.required.includes(
          "edits",
        ),
      toBe(true),
    ),
  ]));
