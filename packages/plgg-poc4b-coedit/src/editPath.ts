/**
 * The path-authorization core, carried over UNCHANGED
 * from PoC 4 (the write seam keeps the proven guard —
 * defense-in-depth policy): the ONE authoritative pure
 * function deciding whether an agent-requested path may
 * be written or read. It is lexical and total — it never
 * touches the filesystem, so it is exhaustively
 * unit-testable. The serve entrypoint layers a SECOND,
 * fs-side check (realpath containment, catching symlink
 * escape) on top, so no single loose check exposes the
 * host filesystem.
 *
 * A granular find/replace op (PoC 4b's new edit shape)
 * still resolves to ONE target path, so this guard is the
 * same gate: relative only, no traversal, `.md` only.
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
 * THE path authorization: given the path an agent asked
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
