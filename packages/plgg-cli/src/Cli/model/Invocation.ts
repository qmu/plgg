import {
  SoftStr,
  Dict,
  Option,
  fromNullable,
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
