/**
 * Escape-hatch-free narrowing for the transformers.js
 * module surface when it arrives untyped (the browser
 * loads it from a CDN URL at runtime, so TypeScript sees
 * `unknown`). Both local-embedder vendors share these
 * guards so the two runtimes narrow identically.
 */
import {
  type Result,
  type SoftStr,
  ok,
  err,
} from "plgg";
import type { Embedding } from "../search/rag.ts";

export type AnyFn = (
  ...args: ReadonlyArray<unknown>
) => unknown;

export const isObj = (
  v: unknown,
): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

export const isFn = (v: unknown): v is AnyFn =>
  typeof v === "function";

/**
 * A pipeline output's `data` (Float32Array or plain
 * number array) → a plain JSON-ready vector.
 */
export const vectorOf = (
  out: unknown,
): Result<Embedding, Error> => {
  if (!isObj(out)) {
    return err(
      new Error(
        "embedding output is not an object",
      ),
    );
  }
  const data = out["data"];
  if (data instanceof Float32Array) {
    return ok(Array.from(data));
  }
  if (
    Array.isArray(data) &&
    data.every((n) => typeof n === "number")
  ) {
    return ok(data);
  }
  return err(
    new Error(
      "embedding output carries no numeric data",
    ),
  );
};

/**
 * Narrow a dynamically imported module to its `pipeline`
 * entry — the single function this PoC uses.
 */
export const pipelineOf = (
  mod: unknown,
): Result<AnyFn, Error> =>
  isObj(mod) && isFn(mod["pipeline"])
    ? ok(mod["pipeline"])
    : err(
        new Error(
          "module exposes no pipeline() function",
        ),
      );

/** Uniform Error from an unknown rejection. */
export const toError = (
  context: SoftStr,
): ((cause: unknown) => Error) =>
(cause) =>
  new Error(
    `${context}: ${
      cause instanceof Error
        ? cause.message
        : String(cause)
    }`,
  );
