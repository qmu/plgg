import {
  SoftStr,
  Option,
  some,
  none,
} from "plgg";

/**
 * A declared option on a command. `arg` distinguishes a
 * **value-option** (`Some(placeholder)`, e.g.
 * `--config <path>`) from a **boolean flag** (`None`,
 * e.g. `--watch`). Names are authored literals, so they
 * are the bare {@link SoftStr} primitive — the toolkit
 * validates runtime *input* (argv), not compile-time
 * spec text.
 */
export type OptionSpec = Readonly<{
  name: SoftStr;
  arg: Option<SoftStr>;
  summary: SoftStr;
}>;

/**
 * Declares a value-option: `--<name> <arg>`. The parser
 * consumes the following token as its value.
 */
export const option = (
  name: SoftStr,
  arg: SoftStr,
  summary: SoftStr = "",
): OptionSpec => ({
  name,
  arg: some(arg),
  summary,
});

/**
 * Declares a boolean flag: `--<name>` (no value). Its
 * presence alone is the signal.
 */
export const flag = (
  name: SoftStr,
  summary: SoftStr = "",
): OptionSpec => ({
  name,
  arg: none(),
  summary,
});

/**
 * A declared subcommand and the options it accepts.
 */
export type CommandSpec = Readonly<{
  name: SoftStr;
  summary: SoftStr;
  options: ReadonlyArray<OptionSpec>;
}>;

/**
 * Declares a subcommand.
 */
export const command = (
  name: SoftStr,
  summary: SoftStr,
  options: ReadonlyArray<OptionSpec> = [],
): CommandSpec => ({
  name,
  summary,
  options,
});

/**
 * A whole command-line program: its name, one-line
 * summary, and the subcommands it dispatches on. This is
 * the typed value a caller builds to *wrap their program
 * as a CLI* — not to spawn external programs.
 */
export type Program = Readonly<{
  name: SoftStr;
  summary: SoftStr;
  commands: ReadonlyArray<CommandSpec>;
}>;

/**
 * Declares a program.
 */
export const program = (
  name: SoftStr,
  summary: SoftStr,
  commands: ReadonlyArray<CommandSpec> = [],
): Program => ({
  name,
  summary,
  commands,
});
