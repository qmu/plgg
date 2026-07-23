/**
 * The DETERMINISTIC query-command parser — what makes each
 * variant's search in PoC 6 replayable with no model at
 * all. A writer (or a headless smoke, or the morning
 * judge) types a one-line query; this pure function turns
 * it into exactly one {@link VariantQuery} or a TYPED
 * {@link CommandError}. The Realtime voice session is a
 * BONUS (agent.ts) that emits the SAME queries as tool
 * calls — so agent-drivability is proven offline, and voice
 * just adds a second way in.
 *
 * Grammar (one line, verb-first):
 *   facets <and|or> [tag ...]     → tag-facets
 *   links  <path>                 → link-graph (focus)
 *   filter <text | #tag> ...      → multi-filter
 *
 * In `filter`, tokens beginning `#` are tags; the rest join
 * as the path substring. Total and pure — every branch is
 * unit-tested offline.
 */
import {
  type SoftStr,
  type Result,
  ok,
  err,
  pipe,
  matchOption,
} from "plgg";
import {
  type VariantQuery,
  type TagMode,
  asTagMode,
} from "./variants.ts";

/** Why a typed query could not be parsed. */
export type CommandError = Readonly<{
  kind:
    | "Empty"
    | "UnknownVerb"
    | "MissingArgument"
    | "UnknownMode";
  message: SoftStr;
}>;

const refuse = (
  kind: CommandError["kind"],
  message: SoftStr,
): CommandError => ({ kind, message });

const tokensOf = (
  s: SoftStr,
): ReadonlyArray<SoftStr> =>
  s.trim() === "" ? [] : s.trim().split(/\s+/);

const firstToken = (s: SoftStr): SoftStr =>
  tokensOf(s)[0] ?? "";

const afterFirstToken = (s: SoftStr): SoftStr =>
  s.trim().replace(/^\S+\s*/, "");

const parseFacets = (
  tail: SoftStr,
): Result<VariantQuery, CommandError> => {
  const mode = firstToken(tail);
  if (mode === "") {
    return err(
      refuse(
        "MissingArgument",
        "`facets` needs a mode — e.g. `facets and concepts packages`",
      ),
    );
  }
  const tags = tokensOf(afterFirstToken(tail));
  return pipe(
    asTagMode(mode),
    matchOption(
      (): Result<VariantQuery, CommandError> =>
        err(
          refuse(
            "UnknownMode",
            `"${mode}" is not a mode — use \`and\` or \`or\``,
          ),
        ),
      (
        m: TagMode,
      ): Result<VariantQuery, CommandError> =>
        ok({
          kind: "tag-facets",
          query: { tags, mode: m },
        }),
    ),
  );
};

const parseFilter = (
  tail: SoftStr,
): Result<VariantQuery, CommandError> => {
  const tokens = tokensOf(tail);
  if (tokens.length === 0) {
    return err(
      refuse(
        "MissingArgument",
        "`filter` needs text and/or #tags — e.g. `filter option #concepts`",
      ),
    );
  }
  const tags = tokens
    .filter((t) => t.startsWith("#"))
    .map((t) => t.slice(1));
  const text = tokens
    .filter((t) => !t.startsWith("#"))
    .join(" ");
  return ok({
    kind: "multi-filter",
    query: { tags, text },
  });
};

/** Parse one typed query line into a variant query. */
export const parseQueryCommand = (
  line: SoftStr,
): Result<VariantQuery, CommandError> => {
  const trimmed = line.trim();
  if (trimmed === "") {
    return err(
      refuse(
        "Empty",
        "type a query — e.g. `facets and concepts`",
      ),
    );
  }
  const verb = firstToken(trimmed).toLowerCase();
  const tail = afterFirstToken(trimmed);
  switch (verb) {
    case "facets":
      return parseFacets(tail);
    case "links":
      return tail.trim() === ""
        ? err(
            refuse(
              "MissingArgument",
              "`links` needs a focus page — e.g. `links concepts/index.md`",
            ),
          )
        : ok({
            kind: "link-graph",
            query: { focus: tail.trim() },
          });
    case "filter":
      return parseFilter(tail);
    default:
      return err(
        refuse(
          "UnknownVerb",
          `"${verb}" is not a query — try facets, links, or filter`,
        ),
      );
  }
};
