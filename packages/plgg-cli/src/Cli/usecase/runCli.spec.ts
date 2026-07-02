import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  SoftStr,
  PromisedResult,
  ok,
  err,
} from "plgg";
import {
  type Invocation,
  type Handler,
  type CliConsole,
  program,
  command,
  option,
  flag,
  runWith,
  runCli,
} from "plgg-cli/index";

/**
 * A fake {@link CliConsole} that records into const arrays
 * (no global mutation), so the run fold is fully
 * observable.
 */
const makeCapture = () => {
  const out: SoftStr[] = [];
  const errs: SoftStr[] = [];
  const failed: boolean[] = [];
  const console: CliConsole = {
    out: (message: SoftStr): void => {
      out.push(message);
    },
    err: (message: SoftStr): void => {
      errs.push(message);
    },
    fail: (): void => {
      failed.push(true);
    },
  };
  return { out, errs, failed, console };
};

const app = program("app", "an app", [
  command("go", "go", [
    option("name", "n"),
    flag("loud"),
  ]),
]);

const okHandler: Handler =
  (): PromisedResult<SoftStr, SoftStr> =>
    Promise.resolve(ok("did the thing"));

const errHandler: Handler =
  (): PromisedResult<SoftStr, SoftStr> =>
    Promise.resolve(err("it broke"));

test("runWith prints usage when no command is given", async () => {
  const c = makeCapture();
  await runWith(app, { go: okHandler }, [], c.console);
  return all([
    check(
      c.out.join("\n").includes("Usage:"),
      toBe(true),
    ),
    check(c.failed.length, toBe(0)),
  ]);
});

test("runWith prints usage for an unknown command", async () => {
  const c = makeCapture();
  await runWith(
    app,
    { go: okHandler },
    ["frob"],
    c.console,
  );
  return all([
    check(
      c.out.join("\n").includes("Usage:"),
      toBe(true),
    ),
    check(c.failed.length, toBe(0)),
  ]);
});

test("runWith writes the handler's Ok message to stdout", async () => {
  const c = makeCapture();
  await runWith(
    app,
    { go: okHandler },
    ["go"],
    c.console,
  );
  return all([
    check(
      c.out.join("\n"),
      toBe("did the thing"),
    ),
    check(c.failed.length, toBe(0)),
  ]);
});

test("runWith writes the handler's Err message to stderr and fails", async () => {
  const c = makeCapture();
  await runWith(
    app,
    { go: errHandler },
    ["go"],
    c.console,
  );
  return all([
    check(
      c.errs.join("\n"),
      toBe("app: it broke"),
    ),
    check(c.failed.length, toBe(1)),
  ]);
});

test("runWith folds a parse error to stderr and fails", async () => {
  const c = makeCapture();
  await runWith(
    app,
    { go: okHandler },
    ["go", "--name"],
    c.console,
  );
  return all([
    check(
      c.errs.join("\n"),
      toBe(
        "app: missing value for option --name",
      ),
    ),
    check(c.failed.length, toBe(1)),
  ]);
});

test("runWith fails when a declared command has no handler", async () => {
  const c = makeCapture();
  await runWith(app, {}, ["go"], c.console);
  return all([
    check(
      c.errs
        .join("\n")
        .includes("no handler for command go"),
      toBe(true),
    ),
    check(c.failed.length, toBe(1)),
  ]);
});

test("runWith passes parsed options and flags to the handler", async () => {
  const c = makeCapture();
  const echo: Handler = (
    inv: Invocation,
  ): PromisedResult<SoftStr, SoftStr> =>
    Promise.resolve(
      ok(
        `${inv.command}:${inv.options["name"]}:${inv.flags.join(",")}`,
      ),
    );
  await runWith(
    app,
    { go: echo },
    ["go", "--name", "ada", "--loud"],
    c.console,
  );
  return check(
    c.out.join("\n"),
    toBe("go:ada:loud"),
  );
});

test("runCli wires real argv and the node console without throwing", async () => {
  await runCli(app, { go: okHandler });
  return check(true, toBe(true));
});
