import {
  type SoftStr,
  type Option,
  pipe,
  matchOption,
} from "plgg";
import { type OpenDoc } from "plggpress/framework/DevServer/usecase/voiceDoc";

// The session instructions — who the assistant is, what it is
// looking at, and how it must behave. Pure string assembly
// over the resolved document, so what the model is told is
// asserted in a spec rather than trusted.
//
// Built SERVER-SIDE and handed to the browser with the grant:
// the browser only forwards it into `session.update`. That
// keeps the one genuinely judgeable part of the voice loop on
// the tested side of the wire.

/**
 * How much of the open document is quoted into the
 * instructions. A doc page can be long and the session budget
 * is finite; the head of the file is the part the writer is
 * almost always talking about.
 */
export const DOC_BUDGET = 6000;

const PREAMBLE: ReadonlyArray<SoftStr> = [
  "You are the writer's voice assistant, embedded in the live preview of a plggpress documentation site.",
  "You and the writer are looking at the SAME page: the open document is quoted in full below.",
  "Talk about that document. Answer in the language the writer speaks, and keep spoken answers short — the writer is looking at the page, not at a chat log.",
  "When you refer to a passage, quote the exact words from the document so the writer can find it.",
];

/**
 * The instructions for one session. With a document open they
 * quote it; without one they say so plainly, so the model does
 * not invent a page it cannot see.
 */
export const voiceInstructionsOf = (
  doc: Option<OpenDoc>,
  routes: ReadonlyArray<SoftStr> = [],
): SoftStr =>
  [
    ...PREAMBLE,
    ...pipe(
      doc,
      matchOption(
        (): ReadonlyArray<SoftStr> => [
          "No document is open on this route — say so if the writer asks about the page, and do not guess at its contents.",
        ],
        (
          open: OpenDoc,
        ): ReadonlyArray<SoftStr> => [
          ...EDIT_PROTOCOL,
          ...FOCUS_PROTOCOL,
          ...columnProtocol(routes),
          `Open document (${open.path}):`,
          open.text.slice(0, DOC_BUDGET),
        ],
      ),
    ),
  ].join("\n\n");

// How the model must use its one write tool. Stated as rules
// the bridge actually ENFORCES, so a model that follows them
// succeeds and a model that does not gets a named refusal back
// rather than a silent no-op.
const EDIT_PROTOCOL: ReadonlyArray<SoftStr> = [
  "You can edit the open document with the edit_doc tool. Use it whenever the writer asks for a change — do not read a rewritten version aloud instead.",
  "edit_doc replaces ONE exact span: `find` must be copied verbatim from the document below (including punctuation and line breaks) and must occur exactly once; `replace` is what it becomes. To delete a passage, make `replace` an empty string.",
  "Quote the SMALLEST span that makes the change unambiguous — never send the whole document as `find`.",
  "After the tool answers, tell the writer in one short sentence what changed. If it answers with a refusal, say what it said and try a different, more exact `find`.",
];

// How the model MOVES the page. Stated apart from the edit
// protocol because it is read-only: nothing here can change a
// file, so the rules are about vocabulary — the writer's own
// heading words — and about what to do when the words do not
// resolve, which is to ask rather than to guess.
const FOCUS_PROTOCOL: ReadonlyArray<SoftStr> = [
  "You can move the writer's page with the focus_section tool: give it a section heading as it appears in the document below, and the page scrolls to that section. Use it whenever the writer asks to go, jump, or look somewhere in this document — do not read the section aloud instead.",
  "focus_section changes nothing on disk. If it answers that no section has that heading, or that more than one does, say so in the writer's own words and ask which section they meant — never pick one for them.",
];

/**
 * The ONE tool a voice session exposes. It carries no path:
 * the document is fixed by the server for the whole session,
 * so the model chooses WHAT to change and never WHERE.
 */
export const EDIT_DOC_TOOL = {
  type: "function",
  name: "edit_doc",
  description:
    "Edit the open markdown document by replacing one exact span of its text. The span in `find` must be copied verbatim from the document and occur exactly once.",
  parameters: {
    type: "object",
    properties: {
      find: {
        type: "string",
        description:
          "The exact existing text to replace, copied verbatim from the open document",
      },
      replace: {
        type: "string",
        description:
          "The text it becomes; an empty string deletes the span",
      },
    },
    required: ["find", "replace"],
    additionalProperties: false,
  },
};

/**
 * The session's READ-ONLY verb: move the page to a section of
 * the same fixed document. Its argument is the heading in the
 * writer's own words — not an id, not a selector, not an
 * index — because that is the only vocabulary a person
 * looking at the page actually has. The whole actuation is
 * client-side: no route is called, nothing is written, and
 * the id it resolves to is one the page already carries.
 */
export const FOCUS_SECTION_TOOL = {
  type: "function",
  name: "focus_section",
  description:
    "Move the writer's page to one section of the open document, naming it by its heading. Read-only: it scrolls to the section and puts the keyboard there, and changes nothing.",
  parameters: {
    type: "object",
    properties: {
      heading: {
        type: "string",
        description:
          "The section heading as it appears in the open document, in the writer's own words",
      },
    },
    required: ["heading"],
    additionalProperties: false,
  },
};

/**
 * The session's NAVIGATION verb: open one of the site's own
 * documents as the next column, optionally with a passage
 * marked.
 *
 * The `route` parameter is an ENUM of the routes this site
 * actually has, enumerated server-side at mint time. The
 * model therefore cannot name a page that does not exist,
 * and cannot compose a URL for the reader's browser to
 * follow — it selects from what the site is.
 *
 * The passage is a VERBATIM quotation from the target
 * document. It is located there, exactly once, by the
 * server that renders the column; a paraphrase simply does
 * not mark anything.
 */
export const openColumnToolOf = (
  routes: ReadonlyArray<SoftStr>,
): unknown => ({
  type: "function",
  name: "open_column",
  description:
    "Open one of this site's documents as the next column to the right, leaving the columns already open in place. Optionally mark a passage in it by quoting the passage verbatim.",
  parameters: {
    type: "object",
    properties: {
      route: {
        type: "string",
        description:
          "Which of the site's documents to open",
        enum: routes,
      },
      quote: {
        type: "string",
        description:
          "Optional: a passage to mark, copied verbatim from that document. It must occur there exactly once, or nothing is marked.",
      },
    },
    required: ["route"],
    additionalProperties: false,
  },
});

const COLUMN_PROTOCOL: ReadonlyArray<SoftStr> = [
  "To take the writer somewhere, call `open_column` with one of the site's routes. It opens as a new column to the RIGHT; the page the writer is reading stays where it is.",
  "Opening a column does not reload anything, so this conversation stays alive across every column you open. Open several in turn when the writer asks for several.",
  "Only quote a passage you can copy verbatim from that document. A quotation that is not in it, or that appears more than once, marks nothing at all.",
];

/**
 * The tools a session is opened with: the document verbs
 * only when a document is actually open, so a model on an
 * ungrounded route is never offered an edit it could not
 * land — nor a section it could not find. The navigation
 * verb rides with them, and only when the site has routes
 * to offer (an enum of nothing is not a choice).
 */
export const voiceToolsOf = (
  doc: Option<OpenDoc>,
  routes: ReadonlyArray<SoftStr>,
): ReadonlyArray<unknown> =>
  pipe(
    doc,
    matchOption(
      (): ReadonlyArray<unknown> => [],
      (): ReadonlyArray<unknown> => [
        EDIT_DOC_TOOL,
        FOCUS_SECTION_TOOL,
        ...(routes.length === 0
          ? []
          : [openColumnToolOf(routes)]),
      ],
    ),
  );

/** The navigation half of the session's instructions. */
export const columnProtocol = (
  routes: ReadonlyArray<SoftStr>,
): ReadonlyArray<SoftStr> =>
  routes.length === 0 ? [] : COLUMN_PROTOCOL;
