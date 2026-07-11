/**
 * The in-browser local embedder — the vector arm's
 * measured crux. Loads @huggingface/transformers from a
 * CDN through a runtime `import(url)` (a string variable,
 * so neither TypeScript nor plgg-bundle resolves it; the
 * bundler passes dynamic imports through to the native
 * runtime) and runs the shared MiniLM model with WASM/CPU
 * execution. The download + init cost is deliberately NOT
 * hidden in the app bundle: measuring it is the PoC's
 * point.
 *
 * Dependency decision log: see the package README
 * (§ Dependency decision — @huggingface/transformers).
 */
import {
  type SoftStr,
  type Result,
  type Option,
  ok,
  err,
  some,
  none,
  matchOption,
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

const CDN_SPEC: SoftStr =
  "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";

/** A loaded model with its measured init cost. */
export type LoadedEmbedder = Readonly<{
  embed: Embedder;
  initMs: number;
}>;

type Loaded = Result<LoadedEmbedder, Error>;

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

const load = (): Promise<Loaded> => {
  const started = performance.now();
  // A variable specifier keeps the import dynamic for
  // both tsc and the bundler; the promise chain (never
  // try/catch) folds load failures into Result.
  const spec: string = CDN_SPEC;
  return import(spec).then(
    (mod: unknown): Promise<Loaded> =>
      pipe(
        pipelineOf(mod),
        matchResult(
          (e: Error): Promise<Loaded> =>
            Promise.resolve(err(e)),
          (
            pipeline: AnyFn,
          ): Promise<Loaded> =>
            Promise.resolve(
              pipeline(
                "feature-extraction",
                EMBEDDING_MODEL,
              ),
            ).then(
              (extractor: unknown): Loaded =>
                isFn(extractor)
                  ? ok({
                      embed:
                        embedderFrom(extractor),
                      initMs:
                        performance.now() -
                        started,
                    })
                  : err(
                      new Error(
                        "pipeline() did not return a callable extractor",
                      ),
                    ),
              (cause): Loaded =>
                err(
                  toError("model init failed")(
                    cause,
                  ),
                ),
            ),
        ),
      ),
    (cause): Loaded =>
      err(toError("CDN import failed")(cause)),
  );
};

// The loaded WASM model is a runtime RESOURCE (like a DOM
// node), not app state — it cannot live in the Model, so
// a module slot memoizes it. The one sanctioned mutable
// seam in this package.
let slot: Option<Promise<Loaded>> = none();

/** Load once, share forever (failures re-try). */
export const ensureBrowserEmbedder =
  (): Promise<Loaded> =>
    pipe(
      slot,
      matchOption(
        (): Promise<Loaded> => {
          const loading = load().then(
            (r): Loaded =>
              pipe(
                r,
                matchResult(
                  (e: Error): Loaded => {
                    // A failed load must not
                    // poison the slot — clear it
                    // so a retry reloads.
                    slot = none();
                    return err(e);
                  },
                  (
                    loaded: LoadedEmbedder,
                  ): Loaded => ok(loaded),
                ),
              ),
          );
          slot = some(loading);
          return loading;
        },
        (loading) => loading,
      ),
    );
