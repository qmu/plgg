import { SoftStr, matchOption } from "plgg";
import {
  Program,
  CommandSpec,
  OptionSpec,
} from "plgg-cli/Cli/model/CliSpec";

/**
 * Renders one option as its usage fragment:
 * `[--name <arg>]` for a value-option, `[--name]` for a
 * boolean flag.
 */
const optionUsage = (
  option: OptionSpec,
): SoftStr =>
  matchOption(
    (): SoftStr => `[--${option.name}]`,
    (arg: SoftStr): SoftStr =>
      `[--${option.name} <${arg}>]`,
  )(option.arg);

/**
 * Renders one command's usage line, e.g.
 * `  plggpress build [--config <path>]`.
 */
const commandUsage =
  (program: Program) =>
  (command: CommandSpec): SoftStr =>
    [
      `  ${program.name} ${command.name}`,
      ...command.options.map(optionUsage),
    ].join(" ");

/**
 * Builds the full usage banner from the program spec —
 * the single generated source that replaces a hand-written
 * USAGE string.
 */
export const usage = (
  program: Program,
): SoftStr =>
  [
    `${program.name} — ${program.summary}`,
    "",
    "Usage:",
    ...program.commands.map(
      commandUsage(program),
    ),
    "",
  ].join("\n");
