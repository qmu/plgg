/**
 * How many test bodies of the CURRENT file are executing right now.
 *
 * The runner brackets every body with {@link enter}/{@link leave}, and
 * `Mock/vi.ts` reads {@link inFlight} to refuse a `stubGlobal`/`stubEnv`
 * issued while a sibling test could observe it. That is the runtime
 * backstop behind `scheduling.ts`'s source scan: the scan auto-serializes
 * a spec that stubs globals, and this catches the case it cannot see —
 * a stub issued from a helper module the scan never reads.
 *
 * "Of the current file" is the load-bearing part. A NESTED run (a test
 * that itself calls `runFile`, as plgg-test's own Runner.spec does)
 * saves and restores the count around itself via {@link setCount}, so
 * the enclosing test does not count as a sibling of the tests inside.
 * Without that, every nested run would look like two tests in flight and
 * the guard would fire on a file that is running perfectly serially.
 *
 * Imperative seam: a count of what is currently running is mutable
 * process state by definition. It is deliberately a plain number rather
 * than a set of identities — the only question anyone asks of it is
 * "could another test observe what I am about to do?".
 */
let running = 0;

export const enter = (): void => {
  running = running + 1;
};

export const leave = (): void => {
  running = running - 1;
};

export const inFlight = (): number => running;

/**
 * Replace the count outright. Used by `runFile` to give each file its
 * own scope, and by specs to return to a known state.
 */
export const setCount = (n: number): void => {
  running = n;
};
