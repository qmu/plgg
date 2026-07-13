/**
 * The write-authorization core of PoC 4 — the ONE
 * authoritative pure function deciding whether an
 * agent-requested path may be written (access-control
 * policy: path-scope decisions live here, not scattered
 * across handler / executor / fs calls), plus the
 * `edit_file` tool schema the Realtime session exposes.
 *
 * The guard is lexical and total: it never touches the
 * filesystem, so it is exhaustively unit-testable. The
 * serve entrypoint layers a SECOND, fs-side check
 * (realpath containment, catching symlink escape) on top
 * — defense-in-depth: no single loose check exposes the
 * host filesystem.
 */
import {
  type SoftStr,
  type Result,
  ok,
  err,
} from "plgg";

/**
 * Why a requested edit path was refused — a closed
 * union, one variant per rejected shape, so the spec
 * can assert each boundary and the page can word an
 * actionable error.
 */
export type EditPathError = Readonly<{
  kind:
    | "EmptyPath"
    | "AbsolutePath"
    | "Traversal"
    | "NotMarkdown";
  message: SoftStr;
}>;

const refuse = (
  kind: EditPathError["kind"],
  message: SoftStr,
): EditPathError => ({ kind, message });

/**
 * A path segment that would let the resolved target
 * move upward or sideways out of the content root:
 * empty (`//`), `.`, `..`, or one smuggling a
 * backslash separator.
 */
const unsafeSegment = (seg: SoftStr): boolean =>
  seg === "" ||
  seg === "." ||
  seg === ".." ||
  seg.includes("\\");

/**
 * THE write authorization: given the path an agent asked
 * to edit, either the normalized content-root-relative
 * path it may write, or the typed refusal. Rules —
 * relative only (no leading `/`, no `C:`-style drive),
 * no traversal segments, `.md` only. The caller joins
 * the result under the content root; because every
 * segment is plain, the join cannot escape it.
 */
export const resolveEditPath = (
  requested: SoftStr,
): Result<SoftStr, EditPathError> => {
  const path = requested.trim();
  return path === ""
    ? err(
        refuse(
          "EmptyPath",
          "no file path was given",
        ),
      )
    : path.startsWith("/") ||
        path.startsWith("\\") ||
        /^[a-z]:/i.test(path)
      ? err(
          refuse(
            "AbsolutePath",
            `"${path}" is absolute — only paths inside the content root can be edited`,
          ),
        )
      : path.split("/").some(unsafeSegment)
        ? err(
            refuse(
              "Traversal",
              `"${path}" steps outside the content root`,
            ),
          )
        : !path.endsWith(".md")
          ? err(
              refuse(
                "NotMarkdown",
                `"${path}" is not a .md file — only markdown documents can be edited`,
              ),
            )
          : ok(path);
};

/**
 * The second tool the Realtime session exposes next to
 * `search_docs`: whole-document replacement, confined to
 * the seeded corpus copy by {@link resolveEditPath} on
 * the server seam.
 */
export const EDIT_TOOL = {
  type: "function",
  name: "edit_file",
  description:
    "Replace the FULL markdown content of one document in the site's corpus. `path` is the document's content-relative path exactly as shown on the page (e.g. `concepts/result.md`); `content` is the complete new markdown for the whole file. Only .md files inside the corpus can be written. After the edit lands, the page hot-reloads automatically — confirm to the writer what changed.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description:
          "Content-relative path of the .md document to replace",
      },
      content: {
        type: "string",
        description:
          "The complete new markdown content of the file",
      },
    },
    required: ["path", "content"],
    additionalProperties: false,
  },
};
