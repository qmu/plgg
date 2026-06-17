import {
  Box,
  Defect,
  InvalidError,
  SerializeError,
  DeserializeError,
  isSome,
  isObj,
  isBox,
} from "plgg/index";

/**
 * Union of plgg's core domain errors — pure tagged data (`Box`), each folding
 * through `match` by `__tag`. No longer `Error` subclasses: expected failures
 * are values, and the only error carrying a real `Error` (with a stack) is
 * {@link Defect}, the bottom for unexpected throws.
 */
export type PlggError =
  | InvalidError
  | SerializeError
  | DeserializeError
  | Defect;

/*
 * Color helper functions
 */
const red = (text: string): string =>
  `\x1b[31m${text}\x1b[0m`;
const gray = (text: string): string =>
  `\x1b[90m${text}\x1b[0m`;

/**
 * The core error tags. Membership — not a class brand — is what identifies a
 * {@link PlggError} now that errors are plain `Box` data.
 */
const CORE_ERROR_TAGS: ReadonlyArray<string> = [
  "InvalidError",
  "SerializeError",
  "DeserializeError",
  "Defect",
];

/**
 * Type guard for a {@link PlggError}: a `Box` whose tag is a core error tag.
 */
export const isPlggError = (
  value: unknown,
): value is PlggError =>
  isBox(value) &&
  CORE_ERROR_TAGS.some(
    (tag) => tag === value.__tag,
  );

/**
 * The nested errors a {@link PlggError} carries: an `InvalidError`'s validation
 * `sibling`s, or a `Defect`'s `Error` `cause`. Other variants are leaves.
 */
const childrenOf = (
  error: PlggError,
): ReadonlyArray<PlggError | Error> =>
  error.__tag === "InvalidError"
    ? error.content.sibling
    : error.__tag === "Defect" &&
        isSome(error.content.cause) &&
        error.content.cause.content instanceof
          Error
      ? [error.content.cause.content]
      : [];

/**
 * The first stack frame of a real `Error`, formatted for display — `""` for a
 * stackless tagged error (every variant but a `Defect`'s `Error` cause).
 */
const locationOf = (
  e: PlggError | Error,
): string =>
  e instanceof Error && e.stack !== undefined
    ? (e.stack
        .split("\n")[1]
        ?.trim()
        .replace(/^at /, "") ?? "")
    : "";

/**
 * Pretty-prints a {@link PlggError} and its nested children (validation
 * siblings / defect cause), one line each.
 */
export const printPlggError = (
  error: PlggError,
): void => {
  // A visited set guards against a sibling/cause cycle: `box()` does not freeze
  // content and `InvalidError.sibling` is self-referential by type, so a cycle
  // is constructible — and a printer that loops while *reporting* an error is
  // the worst time to crash.
  const seen = new WeakSet<object>();
  const walk = (
    e: PlggError | Error,
    depth: number,
  ): void => {
    const tag = isPlggError(e)
      ? e.__tag
      : e.constructor.name;
    const message = isPlggError(e)
      ? e.content.message
      : e.message;
    const loc = locationOf(e);
    console.error(
      depth === 0
        ? `${red(`[${tag}]`)}: ${message}${loc ? ` ${gray(`at ${loc}`)}` : ""}`
        : ` - ${gray(`${tag}`)}: ${message}${loc ? ` ${gray(`at ${loc}`)}` : ""}`,
    );
    seen.add(e);
    if (isPlggError(e)) {
      childrenOf(e).forEach((child) =>
        seen.has(child)
          ? console.error(` - ${gray("<cycle>")}`)
          : walk(child, depth + 1),
      );
    }
  };
  walk(error, 0);
};

/**
 * Reads a string message off an unknown `content` payload — `""` when absent.
 */
const messageOf = (content: unknown): string =>
  isObj(content) && "message" in content
    ? String(content.message)
    : "";

/**
 * A {@link Defect}'s real `Error`: its `cause` when that is an `Error` (origin
 * stack preserved), else a synthesized one carrying the defect message.
 */
const defectToError = (
  content: unknown,
): Error =>
  isObj(content) &&
  "cause" in content &&
  isSome(content.cause) &&
  content.cause.content instanceof Error
    ? content.cause.content
    : new Error(messageOf(content));

/**
 * A tagged error `Box` as an `Error`: a `Defect` yields its `cause` Error;
 * any other tagged error synthesizes `[Tag] message` (boundary stack — typed
 * errors are stackless by decision A).
 */
const boxToError = (
  e: Box<string, unknown>,
): Error =>
  e.__tag === "Defect"
    ? defectToError(e.content)
    : new Error(
        `[${e.__tag}] ${messageOf(e.content)}`,
      );

/**
 * Extracts or synthesizes a real `Error` from any value, for handing to
 * `Error`-expecting systems (loggers, framework handlers). A real `Error`
 * passes through; a tagged error `Box` is folded by {@link boxToError}.
 */
export const toError = (e: unknown): Error =>
  e instanceof Error
    ? e
    : isBox(e)
      ? boxToError(e)
      : new Error(String(e));

/**
 * Throws at an outer seam that demands a thrown `Error` (a framework boundary).
 * Domain code inward returns `err(...)`; this is the only sanctioned throw.
 */
export const panic = (e: unknown): never => {
  throw toError(e);
};

/**
 * Utility function for exhaustive checks and unreachable code paths.
 */
export function unreachable(): never {
  throw new Error("Supposed to be unreachable");
}
