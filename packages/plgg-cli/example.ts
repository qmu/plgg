/**
 * plgg-cli example — a tiny `greet` program built as a
 * command-line wrapper.
 *
 *   node --experimental-strip-types example.ts hello --name Ada --shout
 *
 * Everything is a value: `runCli` reads argv, parses it
 * into a typed `Invocation`, and folds the handler's
 * `Result` to the shell (Ok → stdout, Err → stderr + a
 * non-zero exit).
 */
import {
  SoftStr,
  PromisedResult,
  ok,
  getOr,
  pipe,
} from "plgg";
import {
  type Invocation,
  program,
  command,
  option,
  flag,
  optionOf,
  hasFlag,
  runCli,
} from "plgg-cli/index";

const app = program("greet", "a tiny demo CLI", [
  command("hello", "print a greeting", [
    option("name", "who", "who to greet"),
    flag("shout", "upper-case the greeting"),
  ]),
]);

// Ok → stdout, Err → stderr + exit 1. This handler only
// ever succeeds; the wording is the handler's, the writing
// is runCli's.
const hello = (
  invocation: Invocation,
): PromisedResult<SoftStr, SoftStr> =>
  pipe(
    getOr("world")(
      optionOf("name")(invocation),
    ),
    (who: SoftStr): SoftStr =>
      hasFlag("shout")(invocation)
        ? `HELLO, ${who.toUpperCase()}!`
        : `Hello, ${who}.`,
    (line: SoftStr): PromisedResult<
      SoftStr,
      SoftStr
    > => Promise.resolve(ok(line)),
  );

runCli(app, { hello });
