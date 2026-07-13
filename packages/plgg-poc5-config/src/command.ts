/**
 * The DETERMINISTIC typed-command parser — what makes
 * PoC 5's confidence signal replayable with no model at
 * all. A writer (or a headless smoke, or the morning
 * judge) types a one-line command; this pure function
 * turns it into exactly one {@link ConfigOp} or a TYPED
 * {@link CommandError}. The Realtime voice session is a
 * BONUS layered on top (agent.ts) that emits the SAME ops
 * as tool calls — so the config-generation loop is proven
 * offline, and voice just adds a second way in.
 *
 * Grammar (one line, verb-first):
 *   tag <slug> [name=..] [color=..] [emoji=..] [desc=..]
 *   exclude <glob>
 *   include <glob>
 *   theme <sz-theme>
 *   layout <single-column|multi-column|wide>
 *
 * Total and pure — no DOM, no config, no network — so
 * every branch is unit-tested offline.
 */
import {
  type SoftStr,
  type Option,
  type Result,
  some,
  none,
  ok,
  err,
  pipe,
  isSome,
  matchOption,
} from "plgg";
import {
  type TagColor,
  type SizingTheme,
  type Layout,
  asTagColor,
  asSizingTheme,
  asLayout,
} from "./config.ts";
import { type ConfigOp } from "./apply.ts";

/** Why a typed command could not be parsed. */
export type CommandError = Readonly<{
  kind:
    | "Empty"
    | "UnknownVerb"
    | "MissingArgument"
    | "UnknownColor"
    | "UnknownTheme"
    | "UnknownLayout";
  message: SoftStr;
}>;

const refuse = (
  kind: CommandError["kind"],
  message: SoftStr,
): CommandError => ({ kind, message });

/** The key=value fields the `tag` verb accepts. */
const TAG_FIELDS: ReadonlyArray<SoftStr> = [
  "name",
  "color",
  "emoji",
  "desc",
  "description",
];

/** Default tag identity when a field is omitted. */
const DEFAULT_EMOJI = "🏷️";
const DEFAULT_COLOR: TagColor = "primary";

/**
 * Extract one `key=value` field from the command's tail,
 * capturing up to the next known field or end of line (so
 * a `name=` or `desc=` value may contain spaces). Absent
 * or empty → `none`.
 */
const fieldOf = (
  tail: SoftStr,
  key: SoftStr,
): Option<SoftStr> => {
  const boundary = TAG_FIELDS.join("|");
  const match = new RegExp(
    `(?:^|\\s)${key}=(.*?)(?=\\s+(?:${boundary})=|$)`,
  ).exec(tail);
  const value = match?.[1]?.trim() ?? "";
  return value === "" ? none() : some(value);
};

/** The first whitespace-delimited token of a string. */
const firstToken = (s: SoftStr): SoftStr => {
  const token = s.trim().split(/\s+/)[0];
  return token ?? "";
};

/** Everything after the first token. */
const afterFirstToken = (s: SoftStr): SoftStr =>
  s.trim().replace(/^\S+\s*/, "");

const parseTag = (
  tail: SoftStr,
): Result<ConfigOp, CommandError> => {
  const slug = firstToken(tail);
  if (slug === "") {
    return err(
      refuse(
        "MissingArgument",
        "`tag` needs a slug — e.g. `tag concepts color=success emoji=🧠 name=Core Ideas`",
      ),
    );
  }
  const rest = afterFirstToken(tail);
  const colorField = fieldOf(rest, "color");
  return pipe(
    colorField,
    matchOption(
      (): Result<ConfigOp, CommandError> =>
        buildTag(slug, rest, DEFAULT_COLOR),
      (
        raw: SoftStr,
      ): Result<ConfigOp, CommandError> =>
        pipe(
          asTagColor(raw),
          matchOption(
            (): Result<ConfigOp, CommandError> =>
              err(
                refuse(
                  "UnknownColor",
                  `"${raw}" is not a color — use one of primary, secondary, tertiary, success, danger, warning, info`,
                ),
              ),
            (
              color: TagColor,
            ): Result<ConfigOp, CommandError> =>
              buildTag(slug, rest, color),
          ),
        ),
    ),
  );
};

/** Assemble the SetTag op, filling omitted fields. */
const buildTag = (
  slug: SoftStr,
  rest: SoftStr,
  color: TagColor,
): Result<ConfigOp, CommandError> => {
  const name = fieldOf(rest, "name");
  const emoji = fieldOf(rest, "emoji");
  const desc = pipe(
    fieldOf(rest, "desc"),
    matchOption(
      (): Option<SoftStr> =>
        fieldOf(rest, "description"),
      (v: SoftStr): Option<SoftStr> => some(v),
    ),
  );
  return ok({
    kind: "SetTag",
    tag: {
      slug,
      name: isSome(name) ? name.content : slug,
      color,
      emoji: isSome(emoji)
        ? emoji.content
        : DEFAULT_EMOJI,
      description: isSome(desc)
        ? desc.content
        : "",
    },
  });
};

/** Parse one typed command line into a config op. */
export const parseConfigCommand = (
  line: SoftStr,
): Result<ConfigOp, CommandError> => {
  const trimmed = line.trim();
  if (trimmed === "") {
    return err(
      refuse(
        "Empty",
        "type a command — e.g. `theme sz-spacious`",
      ),
    );
  }
  const verb = firstToken(trimmed).toLowerCase();
  const tail = afterFirstToken(trimmed);
  switch (verb) {
    case "tag":
      return parseTag(tail);
    case "exclude":
      return tail.trim() === ""
        ? err(
            refuse(
              "MissingArgument",
              "`exclude` needs a path or glob — e.g. `exclude contributing/**`",
            ),
          )
        : ok({
            kind: "ExcludePath",
            glob: tail.trim(),
          });
    case "include":
      return tail.trim() === ""
        ? err(
            refuse(
              "MissingArgument",
              "`include` needs the exclusion to remove — e.g. `include contributing/**`",
            ),
          )
        : ok({
            kind: "IncludePath",
            glob: tail.trim(),
          });
    case "theme":
      return pipe(
        asSizingTheme(tail.trim()),
        matchOption(
          (): Result<ConfigOp, CommandError> =>
            err(
              refuse(
                "UnknownTheme",
                `"${tail.trim()}" is not a sizing theme — use one of sz-compact, sz-cozy, sz-comfortable, sz-relaxed, sz-spacious, sz-airy, sz-grand`,
              ),
            ),
          (
            theme: SizingTheme,
          ): Result<ConfigOp, CommandError> =>
            ok({ kind: "SetSizingTheme", theme }),
        ),
      );
    case "layout":
      return pipe(
        asLayout(tail.trim()),
        matchOption(
          (): Result<ConfigOp, CommandError> =>
            err(
              refuse(
                "UnknownLayout",
                `"${tail.trim()}" is not a layout — use single-column, multi-column, or wide`,
              ),
            ),
          (
            layout: Layout,
          ): Result<ConfigOp, CommandError> =>
            ok({ kind: "SetLayout", layout }),
        ),
      );
    default:
      return err(
        refuse(
          "UnknownVerb",
          `"${verb}" is not a command — try tag, exclude, include, theme, or layout`,
        ),
      );
  }
};
