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
  voiceInstructionsOf,
  voiceToolsOf,
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

test("an ungrounded route says so, and offers no edit protocol", () =>
  all([
    check(
      voiceInstructionsOf(none()),
      toContain("No document is open"),
    ),
    check(
      voiceInstructionsOf(none()),
      not(toContain("edit_doc")),
    ),
  ]));

test("the write tool is offered only when there is something to write", () =>
  all([
    check(
      voiceToolsOf(some(doc("# Guide"))),
      toHaveLength(1),
    ),
    check(voiceToolsOf(none()), toHaveLength(0)),
  ]));

test("the tool names no path — the server fixes the file", () =>
  all([
    check(EDIT_DOC_TOOL.name, toBe("edit_doc")),
    check(
      Object.keys(
        EDIT_DOC_TOOL.parameters.properties,
      ).join(","),
      toBe("find,replace"),
    ),
  ]));
