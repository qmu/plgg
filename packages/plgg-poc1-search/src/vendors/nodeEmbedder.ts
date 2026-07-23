/**
 * The node build-time local embedder — same
 * @huggingface/transformers package and the SAME shared
 * MiniLM model as the browser vendor (cosine spaces must
 * match), imported from node_modules (a devDependency:
 * build-time only, never in the shipped bundle). Narrowed
 * through the same guards as the CDN path so the two
 * runtimes cannot drift in shape.
 *
 * Dependency decision log: see the package README
 * (§ Dependency decision — @huggingface/transformers).
 */
import * as transformers from "@huggingface/transformers";
import {
  type Result,
  ok,
  err,
  pipe,
  matchResult,
} from "plgg";
import type { Embedder } from "../search/embedder.ts";
import { EMBEDDING_MODEL } from "../search/embedder.ts";
import {
  type AnyFn,
  isFn,
  pipelineOf,
  vectorOf,
  toError,
} from "./moduleShape.ts";

const embedderFrom = (
  extractor: AnyFn,
): Embedder =>
(text) =>
  Promise.resolve(
    extractor(text, {
      pooling: "mean",
      normalize: true,
    }),
  ).then(vectorOf, (cause) =>
    err(toError("embedding failed")(cause)),
  );

/**
 * Load the model once for a build run. First call
 * downloads the ONNX weights into the local HF cache.
 */
export const makeNodeEmbedder = (): Promise<
  Result<Embedder, Error>
> =>
  pipe(
    pipelineOf(transformers),
    matchResult(
      (
        e: Error,
      ): Promise<Result<Embedder, Error>> =>
        Promise.resolve(err(e)),
      (
        pipeline: AnyFn,
      ): Promise<Result<Embedder, Error>> =>
        Promise.resolve(
          pipeline(
            "feature-extraction",
            EMBEDDING_MODEL,
          ),
        ).then(
          (
            extractor: unknown,
          ): Result<Embedder, Error> =>
            isFn(extractor)
              ? ok(embedderFrom(extractor))
              : err(
                  new Error(
                    "pipeline() did not return a callable extractor",
                  ),
                ),
          (cause): Result<Embedder, Error> =>
            err(
              toError("model init failed")(
                cause,
              ),
            ),
        ),
    ),
  );
