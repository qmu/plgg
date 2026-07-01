import {
  Box,
  SoftStr,
  box,
  match,
  pattern,
  isBoxWithTag,
} from "plgg";

/**
 * A declared value-option was present with no following
 * token to use as its value (e.g. `--config` as the last
 * argument). The toolkit is strict about this rather than
 * silently treating the option as absent.
 */
export type MissingOptionValue = Box<
  "MissingOptionValue",
  { option: SoftStr }
>;

/**
 * Constructs a {@link MissingOptionValue}.
 */
export const missingOptionValue = (
  option: SoftStr,
): MissingOptionValue =>
  box("MissingOptionValue")({ option });

/**
 * A `--flag` was supplied that the command does not
 * declare. Surfaced as a typed error rather than being
 * silently ignored.
 */
export type UnknownOption = Box<
  "UnknownOption",
  { option: SoftStr }
>;

/**
 * Constructs an {@link UnknownOption}.
 */
export const unknownOption = (
  option: SoftStr,
): UnknownOption =>
  box("UnknownOption")({ option });

/**
 * The parser's error vocabulary. Both variants are
 * caller-facing shell failures: `runCli` writes the
 * formatted message to stderr and sets a non-zero exit.
 */
export type CliError =
  | MissingOptionValue
  | UnknownOption;

/**
 * Pattern matcher for the {@link MissingOptionValue}
 * variant, for folding a {@link CliError} with `match`.
 */
export const missingOptionValue$ = () =>
  pattern("MissingOptionValue")();

/**
 * Pattern matcher for the {@link UnknownOption} variant.
 */
export const unknownOption$ = () =>
  pattern("UnknownOption")();

/**
 * Type guard for the {@link MissingOptionValue} variant.
 */
export const isMissingOptionValue = (
  error: CliError,
): error is MissingOptionValue =>
  isBoxWithTag("MissingOptionValue")(error);

/**
 * Type guard for the {@link UnknownOption} variant.
 */
export const isUnknownOption = (
  error: CliError,
): error is UnknownOption =>
  isBoxWithTag("UnknownOption")(error);

/**
 * Renders a {@link CliError} as a one-line shell message.
 * Exhaustive over the union via `match` — a new variant
 * left unhandled is a compile error.
 */
export const formatCliError = (
  error: CliError,
): SoftStr =>
  match(error)(
    [
      missingOptionValue$(),
      (e) =>
        `missing value for option --${e.content.option}`,
    ],
    [
      unknownOption$(),
      (e) =>
        `unknown option --${e.content.option}`,
    ],
  );
