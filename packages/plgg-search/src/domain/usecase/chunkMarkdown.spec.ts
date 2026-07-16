import {
  test,
  check,
  all,
  toBe,
  toEqual,
} from "plgg-test";
import { chunkMarkdown } from "plgg-search/domain/usecase/chunkMarkdown";

const DOC = [
  "intro before any heading",
  "# Title",
  "opening words",
  "## Section A",
  "a body",
  "```ts",
  "# not a heading, code",
  "```",
  "## Section B",
  "b body",
  "### Deep",
  "deep body",
  "# Next Top",
  "next body",
].join("\n");

const chunks = chunkMarkdown("doc.md", DOC);

test("chunks split on headings with trails", () =>
  all([
    check(chunks.length, toBe(6)),
    check(
      chunks.map((c) => c.headingPath),
      toEqual([
        "doc.md",
        "doc.md > Title",
        "doc.md > Title > Section A",
        "doc.md > Title > Section B",
        "doc.md > Title > Section B > Deep",
        "doc.md > Next Top",
      ]),
    ),
  ]));

test("fenced pseudo-headings stay body text", () =>
  check(
    chunks
      .filter((c) =>
        c.text.includes("not a heading"),
      )
      .map((c) => c.headingPath),
    toEqual(["doc.md > Title > Section A"]),
  ));

test("a deeper heading nests, a peer replaces", () =>
  all([
    check(
      chunks
        .filter(
          (c) =>
            c.headingPath ===
            "doc.md > Title > Section B > Deep",
        )
        .map((c) => c.text),
      toEqual(["deep body"]),
    ),
    check(
      chunks
        .filter(
          (c) =>
            c.headingPath === "doc.md > Next Top",
        )
        .map((c) => c.text),
      toEqual(["next body"]),
    ),
  ]));

test("blank sections produce no chunk", () =>
  check(
    chunkMarkdown(
      "empty.md",
      "# A\n\n## B\nonly b",
    ).length,
    toBe(1),
  ));
