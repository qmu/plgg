import {
  SoftStr,
  match,
  defineVariant,
} from "plgg";

/**
 * A declared value-option was present with no following
 * token to use as its value (e.g. `--config` as the last
 * argument). The toolkit is strict about this rather than
 * silently treating the option as absent.
 */
const MissingOption = defineVariant(
  "MissingOptionValue",
)<{ option: SoftStr }>();

export type MissingOptionValue = ReturnType<
  typeof MissingOption.make
>;

/**
 * Constructs a {@link MissingOptionValue}.
 */
export const missingOptionValue = (
  option: SoftStr,
): MissingOptionValue =>
  MissingOption.make({ option });

/**
 * A `--flag` was supplied that the command does not
 * declare. Surfaced as a typed error rather than being
 * silently ignored.
 */
const UnknownOpt = defineVariant("UnknownOption")<{
  option: SoftStr;
}>();

export type UnknownOption = ReturnType<
  typeof UnknownOpt.make
>;

/**
 * Constructs an {@link UnknownOption}.
 */
export const unknownOption = (
  option: SoftStr,
): UnknownOption => UnknownOpt.make({ option });

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
export const missingOptionValue$ =
  MissingOption.pattern;

/**
 * Pattern matcher for the {@link UnknownOption} variant.
 */
export const unknownOption$ = UnknownOpt.pattern;

/**
 * Type guard for the {@link MissingOptionValue} variant.
 */
export const isMissingOptionValue = (
  error: CliError,
): error is MissingOptionValue =>
  MissingOption.is(error);

/**
 * Type guard for the {@link UnknownOption} variant.
 */
export const isUnknownOption = (
  error: CliError,
): error is UnknownOption => UnknownOpt.is(error);

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
