import {
  Box,
  Cause,
  Defect,
  InvalidError,
  SerializeError,
  DeserializeError,
  Option,
  none,
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
 * Type guard for a {@link PlggError}: a `Box` whose tag is a core error tag
 * **and** whose `content` has a string `message`. The shape check keeps the
 * `value is PlggError` claim honest — a foreign/malformed `Box` with a colliding
 * tag (but no `message`) is rejected, so downstream reads never see `undefined`.
 */
export const isPlggError = (
  value: unknown,
): value is PlggError =>
  isBox(value) &&
  CORE_ERROR_TAGS.some(
    (tag) => tag === value.__tag,
  ) &&
  isObj(value.content) &&
  "message" in value.content &&
  typeof value.content.message === "string";

/**
 * The validation `sibling`s a {@link PlggError} carries (only `InvalidError`
 * nests; every other variant is a leaf). Defensive: a malformed box whose
 * `sibling` is not an array yields no children rather than throwing.
 */
const childrenOf = (
  error: PlggError,
): ReadonlyArray<PlggError> =>
  error.__tag === "InvalidError" &&
  Array.isArray(error.content.sibling)
    ? error.content.sibling
    : [];

/**
 * The serializable {@link Cause} a `Defect`/`InvalidError` carries, if any.
 */
const causeOf = (
  error: PlggError,
): Option<Cause> =>
  error.__tag === "Defect" ||
  error.__tag === "InvalidError"
    ? error.content.cause
    : none();

/**
 * Pretty-prints a {@link PlggError} and its nested children (validation
 * siblings / defect cause), one line each.
 */
export const printPlggError = (
  error: PlggError,
): void => {
  // A visited set guards against a sibling cycle: `box()` does not freeze
  // content and `InvalidError.sibling` is self-referential by type, so a cycle
  // is constructible — and a printer that loops while *reporting* an error is
  // the worst time to crash.
  const seen = new WeakSet<object>();
  const walk = (
    e: PlggError,
    depth: number,
  ): void => {
    // typed errors are stackless (decision A); the cause carries the origin.
    console.error(
      depth === 0
        ? `${red(`[${e.__tag}]`)}: ${e.content.message}`
        : ` - ${gray(e.__tag)}: ${e.content.message}`,
    );
    const cause = causeOf(e);
    if (isSome(cause)) {
      console.error(
        ` - ${gray(`${cause.content.name}: ${cause.content.message}`)}`,
      );
    }
    seen.add(e);
    childrenOf(e).forEach((child) =>
      seen.has(child)
        ? console.error(` - ${gray("<cycle>")}`)
        : walk(child, depth + 1),
    );
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
 * The message of a tagged box's serializable `cause`, if present — else its own
 * message. Used to synthesize an `Error` that carries the origin failure.
 */
const causeMessageOf = (
  content: unknown,
): string =>
  isObj(content) &&
  "cause" in content &&
  isSome(content.cause) &&
  isObj(content.cause.content) &&
  "message" in content.cause.content
    ? String(content.cause.content.message)
    : messageOf(content);

/**
 * A tagged error `Box` as an `Error`: a `Defect` carries its `cause`'s message
 * (the origin failure); any other tagged error synthesizes `[Tag] message`.
 * Synthesized — typed errors are stackless by decision A.
 */
const boxToError = (
  e: Box<string, unknown>,
): Error =>
  e.__tag === "Defect"
    ? new Error(causeMessageOf(e.content))
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
