/**
 * The one authority that MUTATES the central configuration
 * — a config in, a new config out, per typed op. Both the
 * deterministic command parser (command.ts) and the
 * Realtime tool loop (agent.ts) resolve a writer's request
 * to one {@link ConfigOp} and hand it here, so the disk-
 * free config and the voice path can never disagree about
 * what a change means.
 *
 * Every op is total and pure: a valid op returns the new
 * config, an ill-formed one a TYPED {@link ConfigError}
 * whose message tells the writer (and the model, as
 * function output) how to fix it — never a throw, never a
 * silent no-op. The `match` on `op.kind` is exhaustive, so
 * adding an op without handling it is a compile error.
 */
import {
  type SoftStr,
  type Result,
  ok,
  err,
  pipe,
  chainResult,
} from "plgg";
import {
  type Config,
  type TagDef,
  type SizingTheme,
  type Layout,
} from "./config.ts";

/**
 * One change to the central configuration — the closed set
 * of things the writer can ask for: (re)classify a tag,
 * exclude or re-include a path, switch the sizing theme,
 * switch the layout. `theme`/`layout` arrive already typed
 * (parsed at the command/wire boundary), so applying them
 * cannot fail.
 */
export type ConfigOp =
  | Readonly<{ kind: "SetTag"; tag: TagDef }>
  | Readonly<{ kind: "ExcludePath"; glob: SoftStr }>
  | Readonly<{ kind: "IncludePath"; glob: SoftStr }>
  | Readonly<{
      kind: "SetSizingTheme";
      theme: SizingTheme;
    }>
  | Readonly<{ kind: "SetLayout"; layout: Layout }>;

/**
 * Why an op could not be applied — a closed union, one
 * variant per rejected shape, so the page and the model's
 * function output can both word an actionable refusal.
 */
export type ConfigError = Readonly<{
  kind:
    | "EmptySlug"
    | "EmptyGlob"
    | "DuplicateExclusion"
    | "UnknownExclusion";
  message: SoftStr;
}>;

const refuse = (
  kind: ConfigError["kind"],
  message: SoftStr,
): ConfigError => ({ kind, message });

/**
 * Upsert a tag by slug: an existing class of the same slug
 * is replaced in place (reclassification), a new slug is
 * appended. Order is otherwise preserved so the picker
 * stays stable.
 */
const upsertTag = (
  tags: ReadonlyArray<TagDef>,
  tag: TagDef,
): ReadonlyArray<TagDef> =>
  tags.some((t) => t.slug === tag.slug)
    ? tags.map((t) =>
        t.slug === tag.slug ? tag : t,
      )
    : [...tags, tag];

/** Apply one op to the config, or a typed refusal. */
export const applyOp = (
  config: Config,
  op: ConfigOp,
): Result<Config, ConfigError> => {
  switch (op.kind) {
    case "SetTag":
      return op.tag.slug === ""
        ? err(
            refuse(
              "EmptySlug",
              "a tag must have a non-empty slug — the slug is what a page's derived tag matches",
            ),
          )
        : ok({
            ...config,
            tags: upsertTag(config.tags, op.tag),
          });
    case "ExcludePath":
      return op.glob === ""
        ? err(
            refuse(
              "EmptyGlob",
              "an exclusion needs a path or glob — e.g. `contributing/**`",
            ),
          )
        : config.exclusions.includes(op.glob)
          ? err(
              refuse(
                "DuplicateExclusion",
                `"${op.glob}" is already excluded`,
              ),
            )
          : ok({
              ...config,
              exclusions: [
                ...config.exclusions,
                op.glob,
              ],
            });
    case "IncludePath":
      return op.glob === ""
        ? err(
            refuse(
              "EmptyGlob",
              "name the exclusion to remove — e.g. `contributing/**`",
            ),
          )
        : !config.exclusions.includes(op.glob)
          ? err(
              refuse(
                "UnknownExclusion",
                `"${op.glob}" is not currently excluded`,
              ),
            )
          : ok({
              ...config,
              exclusions: config.exclusions.filter(
                (g) => g !== op.glob,
              ),
            });
    case "SetSizingTheme":
      return ok({
        ...config,
        sizingTheme: op.theme,
      });
    case "SetLayout":
      return ok({
        ...config,
        layout: op.layout,
      });
  }
};

/**
 * Apply a batch of ops left to right, short-circuiting on
 * the first refusal (so a bad op in a batch never lands a
 * partial config the writer did not confirm).
 */
export const applyOps = (
  config: Config,
  ops: ReadonlyArray<ConfigOp>,
): Result<Config, ConfigError> =>
  ops.reduce<Result<Config, ConfigError>>(
    (acc, op) =>
      pipe(
        acc,
        chainResult(
          (
            c: Config,
          ): Result<Config, ConfigError> =>
            applyOp(c, op),
        ),
      ),
    ok(config),
  );
