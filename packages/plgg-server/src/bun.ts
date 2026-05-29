import { type Fetch } from "plgg-server/index";

/**
 * Options for the Bun.serve adapter.
 */
export type ServeOptions = {
  readonly port: number;
  readonly hostname?: string;
};

/**
 * The minimal shape of the value `Bun.serve` returns that this adapter exposes.
 * Modelled locally rather than via `@types/bun` so the package keeps zero
 * runtime/typing dependencies on Bun.
 */
export type BunServer = {
  readonly stop: () => void;
};

/**
 * The minimal shape of `Bun.serve` this adapter calls. Declaring it here keeps
 * the adapter and its spec compilable without `@types/bun`.
 */
export type BunServeImpl = (options: {
  readonly port: number;
  readonly hostname?: string;
  readonly fetch: Fetch;
}) => BunServer;

declare const Bun: { serve: BunServeImpl } | undefined;

/**
 * Pure factory: closes over a `Bun.serve`-shaped implementation so the
 * adapter's option-shaping and `onListen` semantics are unit-testable without
 * a Bun runtime.
 */
export const createAdapter =
  (impl: BunServeImpl) =>
  (options: ServeOptions, onListen?: () => void) =>
  (handler: Fetch): BunServer => {
    const server = impl(
      options.hostname === undefined
        ? { port: options.port, fetch: handler }
        : {
            port: options.port,
            hostname: options.hostname,
            fetch: handler,
          },
    );
    onListen?.();
    return server;
  };

const realImpl: BunServeImpl = (options) => {
  if (typeof Bun === "undefined") {
    throw new Error(
      "Bun runtime not detected. Import from plgg-server/bun only when running under Bun.",
    );
  }
  return Bun.serve(options);
};

/**
 * Serves a {@link Fetch} handler via Bun.serve. Data-last in the handler so it
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
