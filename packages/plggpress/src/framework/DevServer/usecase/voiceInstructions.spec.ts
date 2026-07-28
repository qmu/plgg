import { some, none } from "plgg";
import {
  test,
  check,
  all,
  toBe,
  toContain,
  not,
  toHaveLength,
} from "plgg-test";
import { type OpenDoc } from "plggpress/framework/DevServer/usecase/voiceDoc";
import {
  DOC_BUDGET,
  EDIT_DOC_TOOL,
  FOCUS_SECTION_TOOL,
  voiceInstructionsOf,
  voiceToolsOf,
  openColumnToolOf,
} from "plggpress/framework/DevServer/usecase/voiceInstructions";

const doc = (text: string): OpenDoc => ({
  path: "guide/index.md",
  text,
});

test("an open document is quoted, and named", () =>
  all([
    check(
      voiceInstructionsOf(
        some(doc("# Guide\n\nThe body.")),
      ),
      toContain("The body."),
    ),
    check(
      voiceInstructionsOf(some(doc("# Guide"))),
      toContain(
        "Open document (guide/index.md):",
      ),
    ),
  ]));

test("a long document is cut to the session budget", () =>
  check(
    voiceInstructionsOf(
      some(doc("x".repeat(DOC_BUDGET + 500))),
    ),
    not(toContain("x".repeat(DOC_BUDGET + 1))),
  ));

test("an open document brings the edit protocol with it", () =>
  check(
    voiceInstructionsOf(some(doc("# Guide"))),
    toContain("edit_doc"),
  ));

test("an open document also brings the move protocol with it", () =>
  all([
    check(
      voiceInstructionsOf(some(doc("# Guide"))),
      toContain("focus_section"),
    ),
    // an unresolved heading is a question, never a guess
    check(
      voiceInstructionsOf(some(doc("# Guide"))),
      toContain("never pick one for them"),
    ),
  ]));

test("an ungrounded route says so, and offers no protocol at all", () =>
  all([
    check(
      voiceInstructionsOf(none()),
      toContain("No document is open"),
    ),
    check(
      voiceInstructionsOf(none()),
      not(toContain("edit_doc")),
    ),
    check(
      voiceInstructionsOf(none()),
      not(toContain("focus_section")),
    ),
  ]));

test("the tools are offered only when there is a document to act on", () =>
  all([
    check(
      voiceToolsOf(some(doc("# Guide")), []),
      toHaveLength(2),
    ),
    check(
      voiceToolsOf(none(), []),
      toHaveLength(0),
    ),
    // the navigation verb joins them when the site has
    // routes to offer
    check(
      voiceToolsOf(some(doc("# Guide")), ["/a/"]),
      toHaveLength(3),
    ),
  ]));

test("the assistant SELECTS a route; it cannot name one", () => {
  const tool = openColumnToolOf(["/a/", "/b/"]);
  return all([
    check(
      JSON.stringify(tool),
      toContain('"enum":["/a/","/b/"]'),
    ),
    check(
      JSON.stringify(tool),
      toContain('"name":"open_column"'),
    ),
    // the quotation is optional; the route is not
    check(
      JSON.stringify(tool),
      toContain('"required":["route"]'),
    ),
  ]);
});

test("the navigation protocol is told only when there is somewhere to go", () =>
  all([
    check(
      voiceInstructionsOf(some(doc("# Guide")), [
        "/a/",
      ]),
      toContain("open_column"),
    ),
    check(
      voiceInstructionsOf(
        some(doc("# Guide")),
        [],
      ),
      not(toContain("open_column")),
    ),
  ]));

test("the tools name no path — the server fixes the file", () =>
  all([
    check(EDIT_DOC_TOOL.name, toBe("edit_doc")),
    check(
      Object.keys(
        EDIT_DOC_TOOL.parameters.properties,
      ).join(","),
      toBe("find,replace"),
    ),
    check(
      FOCUS_SECTION_TOOL.name,
      toBe("focus_section"),
    ),
    // heading text — not an id, a selector or an index
    check(
      Object.keys(
        FOCUS_SECTION_TOOL.parameters.properties,
      ).join(","),
      toBe("heading"),
    ),
  ]));
