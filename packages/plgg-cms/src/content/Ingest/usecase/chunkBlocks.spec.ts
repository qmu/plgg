import {
  test,
  check,
  all,
  toBe,
  toContain,
} from "plgg-test";
import {
  heading,
  para,
  codeFence,
  list,
  quote,
  table,
  callout,
  thematicBreak,
  htmlBlock,
} from "plgg-md";
import { none, some } from "plgg";
import { chunkBlocks } from "plgg-cms/content/Ingest/usecase/chunkBlocks";

test("splits a body into one chunk per heading section", () =>
  check(
    chunkBlocks([
      heading(1, "Intro"),
      para("hello world"),
      heading(2, "Details"),
      para("the details"),
    ]).length,
    toBe(2),
  ));

test("leading pre-heading content is chunk 0 with an empty path", () => {
  const chunks = chunkBlocks([
    para("preamble text"),
    heading(1, "Intro"),
    para("body"),
  ]);
  return all([
    check(chunks.length, toBe(2)),
    check(chunks[0]?.ordinal ?? -1, toBe(0)),
    check(chunks[0]?.headingPath ?? "x", toBe("")),
    check(
      chunks[0]?.text ?? "",
      toContain("preamble"),
    ),
  ]);
});

test("headingPath carries the ancestor breadcrumb", () => {
  const chunks = chunkBlocks([
    heading(1, "Guide"),
    para("intro"),
    heading(2, "Setup"),
    para("steps"),
  ]);
  return all([
    check(
      chunks[0]?.headingPath ?? "",
      toBe("Guide"),
    ),
    check(
      chunks[1]?.headingPath ?? "",
      toBe("Guide > Setup"),
    ),
  ]);
});

test("a sibling heading pops the deeper breadcrumb", () => {
  const chunks = chunkBlocks([
    heading(1, "A"),
    heading(2, "A1"),
    para("x"),
    heading(1, "B"),
    para("y"),
  ]);
  // the last section is under B alone, not A > A1 > B
  return check(
    chunks[chunks.length - 1]?.headingPath ??
      "",
    toBe("B"),
  );
});

test("code fences contribute their body to the search text", () =>
  check(
    chunkBlocks([
      heading(1, "Example"),
      codeFence(none(), "const answer = 42;"),
    ])[0]?.text ?? "",
    toContain("answer"),
  ));

test("an empty body yields no chunks", () =>
  check(chunkBlocks([]).length, toBe(0)));

test("every block variant contributes its words to the section text", () => {
  const text =
    chunkBlocks([
      heading(1, "All"),
      list(false, [
        {
          text: "listwordA",
          children: [para("listwordB")],
        },
      ]),
      quote([para("quoteword")]),
      table(
        ["headcell"],
        ["default"],
        [["rowcell"]],
      ),
      callout("tip", some("callouttitle"), [
        para("calloutbody"),
      ]),
      htmlBlock('<section data-note="htmlword"></section>'),
      thematicBreak(),
    ])[0]?.text ?? "";
  return all([
    check(text, toContain("listwordA")),
    check(text, toContain("listwordB")),
    check(text, toContain("quoteword")),
    check(text, toContain("headcell")),
    check(text, toContain("rowcell")),
    check(text, toContain("callouttitle")),
    check(text, toContain("calloutbody")),
    check(text, toContain("htmlword")),
  ]);
});

test("a callout with no title still contributes its body", () =>
  check(
    chunkBlocks([
      heading(1, "C"),
      callout("warning", none(), [
        para("nakedbody"),
      ]),
    ])[0]?.text ?? "",
    toContain("nakedbody"),
  ));
