import {
  SoftStr,
  PromisedResult,
  Option,
  fromNullable,
  matchOption,
  matchResult,
} from "plgg";
import {
  Program,
  CommandSpec,
} from "plgg-cli/Cli/model/CliSpec";
import { Invocation } from "plgg-cli/Cli/model/Invocation";
import {
  CliError,
  formatCliError,
} from "plgg-cli/Cli/model/CliError";
import { parseOptions } from "plgg-cli/Cli/usecase/parse";
import { usage } from "plgg-cli/Cli/usecase/usage";
import {
  CliConsole,
  nodeConsole,
  readArgv,
} from "plgg-cli/Cli/usecase/seam";

/**
 * A command handler: given the parsed {@link Invocation},
 * do the work and return a shell outcome **as a value** —
 * an `Ok` message is written to stdout, an `Err` message
 * to stderr (with a non-zero exit). The toolkit owns the
 * writing; the handler owns the wording.
 */
export type Handler = (
  invocation: Invocation,
) => PromisedResult<SoftStr, SoftStr>;

/**
 * A handler per subcommand name.
 */
export type Handlers = Readonly<
  Record<string, Handler>
>;

/**
 * Writes an error line (prefixed with the program name)
 * and marks a non-zero exit — the single place an `Err`
 * becomes a shell failure.
 */
const fail = (
  name: SoftStr,
  console: CliConsole,
  message: SoftStr,
): void => {
  console.err(`${name}: ${message}`);
  console.fail();
};

/**
 * Runs a handler and folds its outcome to the console — an
 * `Ok` message to stdout, an `Err` message to stderr under
 * `name` with a non-zero exit. Shared by the multi-command
 * ({@link runWith}) and single-command ({@link runSingleWith})
 * paths so both fold identically.
 */
const foldHandler = (
  name: SoftStr,
  handler: Handler,
  invocation: Invocation,
  console: CliConsole,
): Promise<void> =>
  handler(invocation).then(
    matchResult(
      (message: SoftStr): void =>
        fail(name, console, message),
      (message: SoftStr): void =>
        console.out(message),
    ),
  );

/**
 * Finds a declared command by name.
 */
const commandOf = (
  program: Program,
  name: SoftStr,
): Option<CommandSpec> =>
  fromNullable(
    program.commands.find(
      (c: CommandSpec): boolean =>
        c.name === name,
    ),
  );

/**
 * Runs the matched command's handler and folds its
 * outcome to the console. A declared command with no
 * registered handler is a wiring mistake, surfaced as a
 * failure rather than a silent no-op.
 */
const runHandler = (
  program: Program,
  handlers: Handlers,
  command: CommandSpec,
  invocation: Invocation,
  console: CliConsole,
): Promise<void> =>
  matchOption(
    (): Promise<void> =>
      Promise.resolve(
        fail(
          program.name,
          console,
          `no handler for command ${command.name}`,
        ),
      ),
    (handler: Handler): Promise<void> =>
      foldHandler(
        program.name,
        handler,
        invocation,
        console,
      ),
  )(fromNullable(handlers[command.name]));

/**
 * Parses the command's options, then dispatches — a parse
 * error folds to stderr, a valid invocation runs its
 * handler.
 */
const dispatch = (
  program: Program,
  handlers: Handlers,
  command: CommandSpec,
  argv: ReadonlyArray<SoftStr>,
  console: CliConsole,
): Promise<void> =>
  matchResult(
    (error: CliError): Promise<void> =>
      Promise.resolve(
        fail(
          program.name,
          console,
          formatCliError(error),
        ),
      ),
    (invocation: Invocation): Promise<void> =>
      runHandler(
        program,
        handlers,
        command,
        invocation,
        console,
      ),
  )(parseOptions(command, argv.slice(1)));

/**
 * Runs a program against explicit argv and an injected
 * {@link CliConsole} — the fully testable core. No
 * command (or an unknown one) prints the usage banner;
 * otherwise the matched command is dispatched.
 */
export const runWith = (
  program: Program,
  handlers: Handlers,
  argv: ReadonlyArray<SoftStr>,
  console: CliConsole,
): Promise<void> =>
  matchOption(
    (): Promise<void> =>
      Promise.resolve(
        console.out(usage(program)),
      ),
    (name: SoftStr): Promise<void> =>
      matchOption(
        (): Promise<void> =>
          Promise.resolve(
            console.out(usage(program)),
          ),
        (command: CommandSpec): Promise<void> =>
          dispatch(
            program,
            handlers,
            command,
            argv,
            console,
          ),
      )(commandOf(program, name)),
  )(fromNullable(argv[0]));

/**
 * Runs a program against the real `process` — reads argv
 * from the seam and writes through {@link nodeConsole}.
 * The thin production wiring over {@link runWith}.
 */
export const runCli = (
  program: Program,
  handlers: Handlers,
): Promise<void> =>
  runWith(
    program,
    handlers,
    readArgv(),
    nodeConsole,
  );

/**
 * Runs a SINGLE-command program against explicit argv and
 * an injected {@link CliConsole} — a one-handler CLI invoked
 * with BARE flags (`my-tool --real`), with no leading
 * subcommand token to strip. Every argv token is parsed
 * against the one command's options, so a subcommand-less
 * program needs no argv-rewriting adapter: a parse error
 * folds to stderr, a valid invocation runs the handler. The
 * fully testable core of {@link runSingle}.
 */
export const runSingleWith = (
  command: CommandSpec,
  handler: Handler,
  argv: ReadonlyArray<SoftStr>,
  console: CliConsole,
): Promise<void> =>
  matchResult(
    (error: CliError): Promise<void> =>
      Promise.resolve(
        fail(
          command.name,
          console,
          formatCliError(error),
        ),
      ),
    (invocation: Invocation): Promise<void> =>
      foldHandler(
        command.name,
        handler,
        invocation,
        console,
      ),
  )(parseOptions(command, argv));

/**
 * Runs a single-command program against the real `process`
 * — the thin production wiring over {@link runSingleWith}.
 * The one-handler counterpart to {@link runCli}.
 */
export const runSingle = (
  command: CommandSpec,
  handler: Handler,
): Promise<void> =>
  runSingleWith(
    command,
    handler,
    readArgv(),
    nodeConsole,
  );
