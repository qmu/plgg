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
          `Open document (${open.path}):`,
          open.text.slice(0, DOC_BUDGET),
        ],
      ),
    ),
  ].join("\n\n");
