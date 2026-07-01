import {
  SoftStr,
  Dict,
  Result,
  ok,
  err,
  fromNullable,
  matchOption,
  matchResult,
} from "plgg";
import {
  CommandSpec,
  OptionSpec,
} from "plgg-cli/Cli/model/CliSpec";
import { Invocation } from "plgg-cli/Cli/model/Invocation";
import {
  CliError,
  missingOptionValue,
  unknownOption,
} from "plgg-cli/Cli/model/CliError";

/**
 * The parser's running accumulator — the {@link Invocation}
 * body assembled so far, minus the (already-known)
 * command name.
 */
type Parsed = Readonly<{
  options: Dict<string, SoftStr>;
  flags: ReadonlyArray<SoftStr>;
  positionals: ReadonlyArray<SoftStr>;
}>;

const emptyParsed: Parsed = {
  options: {},
  flags: [],
  positionals: [],
};

/**
 * Looks up a declared option by its `--name`.
 */
const specOf = (
  specs: ReadonlyArray<OptionSpec>,
  name: SoftStr,
) =>
  fromNullable(
    specs.find(
      (o: OptionSpec): boolean => o.name === name,
    ),
  );

/**
 * Consumes one `--name` token. Unknown option → error;
 * boolean flag → record its presence; value-option →
 * take the following token (or error if none follows).
 */
const parseOption = (
  specs: ReadonlyArray<OptionSpec>,
  tokens: ReadonlyArray<SoftStr>,
  index: number,
  name: SoftStr,
  parsed: Parsed,
): Result<Parsed, CliError> =>
  matchOption(
    (): Result<Parsed, CliError> =>
      err(unknownOption(name)),
    (spec: OptionSpec): Result<Parsed, CliError> =>
      matchOption(
        (): Result<Parsed, CliError> =>
          parseFrom(specs, tokens, index + 1, {
            ...parsed,
            flags: [...parsed.flags, name],
          }),
        (
          _placeholder: SoftStr,
        ): Result<Parsed, CliError> =>
          matchOption(
            (): Result<Parsed, CliError> =>
              err(missingOptionValue(name)),
            (
              value: SoftStr,
            ): Result<Parsed, CliError> =>
              parseFrom(
                specs,
                tokens,
                index + 2,
                {
                  ...parsed,
                  options: {
                    ...parsed.options,
                    [name]: value,
                  },
                },
              ),
          )(fromNullable(tokens[index + 1])),
      )(spec.arg),
  )(specOf(specs, name));

/**
 * Walks the tokens from `index`, folding each into the
 * accumulator. A `--name` token is an option (see
 * {@link parseOption}); anything else is a positional.
 * `None` at the cursor means we ran off the end — done.
 */
const parseFrom = (
  specs: ReadonlyArray<OptionSpec>,
  tokens: ReadonlyArray<SoftStr>,
  index: number,
  parsed: Parsed,
): Result<Parsed, CliError> =>
  matchOption(
    (): Result<Parsed, CliError> => ok(parsed),
    (token: SoftStr): Result<Parsed, CliError> =>
      token.startsWith("--")
        ? parseOption(
            specs,
            tokens,
            index,
            token.slice(2),
            parsed,
          )
        : parseFrom(specs, tokens, index + 1, {
            ...parsed,
            positionals: [
              ...parsed.positionals,
              token,
            ],
          }),
  )(fromNullable(tokens[index]));

/**
 * Parses the tokens *after* a command into a typed
 * {@link Invocation}, validating against the command's
 * declared options. A non-zero exit code is not this
 * function's concern — an unrecognised or value-less
 * option is a {@link CliError} for `runCli` to fold.
 */
export const parseOptions = (
  command: CommandSpec,
  tokens: ReadonlyArray<SoftStr>,
): Result<Invocation, CliError> =>
  matchResult(
    (
      error: CliError,
    ): Result<Invocation, CliError> =>
      err(error),
    (
      parsed: Parsed,
    ): Result<Invocation, CliError> =>
      ok({
        command: command.name,
        options: parsed.options,
        flags: parsed.flags,
        positionals: parsed.positionals,
      }),
  )(
    parseFrom(
      command.options,
      tokens,
      0,
      emptyParsed,
    ),
  );
