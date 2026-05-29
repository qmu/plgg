import { type Fetch } from "plgg-server/index";

/**
 * Options for the Deno.serve adapter.
 */
export type ServeOptions = {
  readonly port: number;
  readonly hostname?: string;
};

/**
 * The minimal shape of the value `Deno.serve` returns that this adapter
 * exposes. Modelled locally rather than via `@types/deno` so the package keeps
 * zero runtime/typing dependencies on Deno.
 */
export type DenoServer = {
  readonly shutdown: () => Promise<void>;
};

/**
 * The minimal shape of `Deno.serve` this adapter calls.
 */
export type DenoServeImpl = (
  options: {
    readonly port: number;
    readonly hostname?: string;
  },
  handler: Fetch,
) => DenoServer;

declare const Deno: { serve: DenoServeImpl } | undefined;

/**
 * Pure factory: closes over a `Deno.serve`-shaped implementation so the
 * adapter's option-shaping and `onListen` semantics are unit-testable without
 * a Deno runtime.
 */
export const createAdapter =
  (impl: DenoServeImpl) =>
  (options: ServeOptions, onListen?: () => void) =>
  (handler: Fetch): DenoServer => {
    const server = impl(
      options.hostname === undefined
        ? { port: options.port }
        : { port: options.port, hostname: options.hostname },
      handler,
    );
    onListen?.();
    return server;
  };

const realImpl: DenoServeImpl = (options, handler) => {
  if (typeof Deno === "undefined") {
    throw new Error(
      "Deno runtime not detected. Import from plgg-server/deno only when running under Deno.",
    );
  }
  return Deno.serve(options, handler);
};

/**
 * Serves a {@link Fetch} handler via Deno.serve. Data-last in the handler so it
 * terminates a routing pipeline, mirroring the node:http adapter:
 *
 * @example
 * const server = pipe(
 *   app,
 *   toFetch,
 *   serve({ port: 3000 }, () => console.log("listening")),
 * );
 */
export const serve = createAdapter(realImpl);
