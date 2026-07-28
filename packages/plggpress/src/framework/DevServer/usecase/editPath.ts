import {
  type SoftStr,
  type Result,
  ok,
  err,
} from "plgg";

// The path-authorization core, PROMOTED to production
// plggpress from PoC 4b's proven, 100%-covered guard
// (`plgg-poc4b-coedit/src/editPath.ts`) — the ONE
// authoritative pure function deciding whether a
// dev-server-requested path may be written. Lexical and
// total: it never touches the filesystem, so it is
// exhaustively unit-testable. The node write seam
// (`node/patchWeb`) layers a SECOND, fs-side realpath
// containment check on top, so no single loose check exposes
// the host filesystem (defense-in-depth).

/**
 * Why a requested patch path was refused — a closed union,
 * one variant per rejected shape, so the spec can assert each
 * boundary and the client can word an actionable error.
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
 * A path segment that would let the resolved target move
 * upward or sideways out of the content root: empty (`//`),
 * `.`, `..`, or one smuggling a backslash separator.
 */
const unsafeSegment = (seg: SoftStr): boolean =>
  seg === "" ||
  seg === "." ||
  seg === ".." ||
  seg.includes("\\");

/**
 * THE path authorization: given the path a patch asked to
 * edit, either the normalized content-root-relative path it
 * may write, or the typed refusal. Rules — relative only (no
 * leading `/`, no `C:`-style drive), no traversal segments,
 * `.md` only. The caller joins the result under the content
 * root; because every segment is plain, the join cannot
 * escape it.
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
