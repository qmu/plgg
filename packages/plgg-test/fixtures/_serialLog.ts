/**
 * A shared execution log for the `suite.serial` fixture.
 *
 * It lives in its own module so `Runner.spec` can read what the fixture
 * recorded: `runFile` cache-busts only the SPEC's module URL, so this
 * helper stays cached and both sides hold the same array.
 */
export const log: Array<string> = [];

export const reset = (): void => {
  log.length = 0;
};

export const mark = (entry: string): void =>
  void log.push(entry);

/** Yields to the event loop so an interleave can actually happen. */
export const yieldTurn = (
  ms: number,
): Promise<void> =>
  new Promise((resolve) =>
    setTimeout(resolve, ms),
  );
