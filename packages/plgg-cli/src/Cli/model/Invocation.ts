import {
  SoftStr,
  Dict,
  Option,
  Result,
  ok,
  err,
  fromNullable,
  matchOption,
  pipe,
} from "plgg";

/**
 * The parsed result of a command line: the matched
 * subcommand name, the value-options supplied (keyed by
 * option name), the boolean flags present, and any
 * leftover positional arguments. A handler reads this
 * rather than touching `process.argv`.
 */
export type Invocation = Readonly<{
  command: SoftStr;
  options: Dict<string, SoftStr>;
  flags: ReadonlyArray<SoftStr>;
  positionals: ReadonlyArray<SoftStr>;
}>;

/**
 * Reads a value-option by name — `None` when it was not
 * supplied. Data-last: `pipe(inv, optionOf("config"))`.
 */
export const optionOf =
  (name: SoftStr) =>
  (invocation: Invocation): Option<SoftStr> =>
    fromNullable(invocation.options[name]);

/**
 * Whether a boolean flag was present. Data-last.
 */
export const hasFlag =
  (name: SoftStr) =>
  (invocation: Invocation): boolean =>
    invocation.flags.includes(name);

/**
 * Reads a value-option as a comma-separated LIST — the
 * common `--ids a,b,c` shape — into a trimmed,
 * empty-dropped array. An absent option is the empty list,
 * so a handler never branches on presence; this keeps the
 * split/trim/filter boundary parsing out of every runner.
 * Data-last: `pipe(inv, optionList("ids"))`.
 */
export const optionList =
  (name: SoftStr) =>
  (
    invocation: Invocation,
  ): ReadonlyArray<SoftStr> =>
    pipe(
      optionOf(name)(invocation),
      matchOption(
        (): ReadonlyArray<SoftStr> => [],
        (raw: SoftStr): ReadonlyArray<SoftStr> =>
          raw
            .split(",")
            .map((s: SoftStr): SoftStr => s.trim())
            .filter(
              (s: SoftStr): boolean => s !== "",
            ),
      ),
    );

/**
 * Parses a supplied `--name` value as a positive integer.
 * Boundary parse, isolated so no seam repeats the
 * `Number(...)` / `Number.isInteger` guard.
 */
const positiveInt = (
  name: SoftStr,
  raw: SoftStr,
): Result<number, SoftStr> => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0
    ? ok(n)
    : err(
        `--${name} must be a positive integer, got ${JSON.stringify(raw)}`,
      );
};

/**
 * Reads a value-option as a POSITIVE INTEGER, falling back
 * to `fallback` when the option is absent. A present but
 * non-integer or non-positive value is a validation error
 * — a `SoftStr` message that folds straight into a
 * {@link Handler}'s stderr channel — never silently
 * defaulted, which would hide a mistyped `--limit abc`.
 * Data-last: `pipe(inv, optionInt("limit", 10))`.
 */
export const optionInt =
  (name: SoftStr, fallback: number) =>
  (
    invocation: Invocation,
  ): Result<number, SoftStr> =>
    pipe(
      optionOf(name)(invocation),
      matchOption(
        (): Result<number, SoftStr> =>
          ok(fallback),
        (raw: SoftStr): Result<number, SoftStr> =>
          positiveInt(name, raw),
      ),
    );
