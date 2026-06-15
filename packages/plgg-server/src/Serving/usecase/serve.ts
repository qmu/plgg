import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from "node:http";
import { fromNullable, getOr, pipe } from "plgg";
import {
  Fetch,
  statusError,
  statusOf,
  httpErrorToResponse,
  toNativeResponse,
} from "plgg-server/index";

/**
 * Options for the node:http adapter. The body cap and timeouts are this
 * adapter's request-hardening surface (Bun/Deno hand the native `Request` to
 * their runtimes and don't share `collectBody`, so they don't carry these).
 */
export type ServeOptions = {
  readonly port: number;
  readonly hostname?: string;
  /** Max request body size in bytes before a 413 (default 1 MiB). */
  readonly maxBodyBytes?: number;
  /** Whole-request timeout in ms (default 30000). */
  readonly requestTimeoutMs?: number;
  /** Headers-received timeout in ms (default 10000). */
  readonly headersTimeoutMs?: number;
  /** Idle-socket timeout in ms (default 120000). */
  readonly socketTimeoutMs?: number;
};

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_HEADERS_TIMEOUT_MS = 10_000;
const DEFAULT_SOCKET_TIMEOUT_MS = 120_000;

/**
 * The outcome of buffering a request body: the bytes, or a signal that the
 * configured `maxBodyBytes` was exceeded. Modelled as data (not a thrown error)
 * so the adapter can answer a typed 413 without a raw throw.
 */
type BodyOutcome =
  | Readonly<{ kind: "ok"; body: ArrayBuffer }>
  | Readonly<{ kind: "too-large" }>;

/**
 * Buffers a Node request stream into a standalone ArrayBuffer.
 *
 * This bridges Node's imperative stream/EventEmitter API into a `Promise`, so
 * the body — like the rest of this adapter — is irreducibly imperative; it is
 * the platform seam, confined here. A running byte total caps the buffer at
 * `maxBytes`: once exceeded the promise resolves `too-large` and stops
 * accumulating (memory stays bounded, even for an unrouted path), leaving the
 * caller to answer 413 and then destroy the socket — so the client receives the
 * response before the connection closes.
 */
const collectBody = (
  req: IncomingMessage,
  maxBytes: number,
): Promise<BodyOutcome> =>
  new Promise((resolve, reject) => {
    const chunks: Array<Buffer> = [];
    let total = 0;
    let overflowed = false;
    req.on("data", (chunk: Buffer) => {
      if (overflowed) {
        return;
      }
      total += chunk.byteLength;
      if (total > maxBytes) {
        overflowed = true;
        resolve({ kind: "too-large" });
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (overflowed) {
        return;
      }
      const merged = Buffer.concat(chunks);
      const copy = new ArrayBuffer(
        merged.byteLength,
      );
      new Uint8Array(copy).set(merged);
      resolve({ kind: "ok", body: copy });
    });
    req.on("error", reject);
  });

/**
 * Copies Node's incoming headers into Web-standard Headers, expanding
 * multi-valued headers into repeated entries.
 */
const buildHeaders = (
  raw: IncomingMessage["headers"],
): Headers =>
  new Headers(
    Object.entries(raw).flatMap(
      ([key, value]): Array<[string, string]> =>
        value === undefined
          ? []
          : typeof value === "string"
            ? [[key, value]]
            : value.map((v): [string, string] => [
                key,
                v,
              ]),
    ),
  );

/**
 * Converts a Node IncomingMessage (plus its buffered body) into a
 * Web-standard Request. Nullable platform fields are lifted through plgg's
 * `Option` rather than ad-hoc `??` defaulting.
 */
export const toRequest = (
  req: IncomingMessage,
  body: ArrayBuffer,
): Request =>
  pipe(
    pipe(fromNullable(req.method), getOr("GET")),
    (method) =>
      new Request(
        `http://${pipe(fromNullable(req.headers.host), getOr("localhost"))}${pipe(fromNullable(req.url), getOr("/"))}`,
        method !== "GET" &&
          method !== "HEAD" &&
          body.byteLength > 0
          ? {
              method,
              headers: buildHeaders(req.headers),
              body,
            }
          : {
              method,
              headers: buildHeaders(req.headers),
            },
      ),
  );

/**
 * Pumps a Web `ReadableStream` of bytes onto the Node response, chunk by chunk —
 * the imperative read seam. The recursion is promise-chained, so a long stream
 * does not grow the call stack, and the payload is never buffered whole.
 */
const pump = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  res: ServerResponse,
): Promise<void> =>
  reader
    .read()
    .then((chunk) =>
      chunk.done
        ? new Promise<void>((resolve) =>
            res.end(() => resolve()),
          )
        : new Promise<void>((resolve, reject) =>
            res.write(
              Buffer.from(chunk.value),
              (e) => (e ? reject(e) : resolve()),
            ),
          ).then(() => pump(reader, res)),
    );

/**
 * Writes a Web-standard Response back onto a Node ServerResponse: status and
 * headers first, then the body streamed through its reader so binary and
 * chunked bodies pass through without buffering the whole payload. Ordered
 * mutations on the mutable `ServerResponse` — the imperative write seam.
 */
export const writeResponse = (
  res: ServerResponse,
  response: Response,
): Promise<void> => {
  res.statusCode = response.status;
  response.headers.forEach((value, key) =>
    res.setHeader(key, value),
  );
  return response.body === null
    ? new Promise<void>((resolve) =>
        res.end(() => resolve()),
      )
    : pump(response.body.getReader(), res);
};

/**
 * Last-resort 500 when the adapter itself fails.
 */
const writeError = (
  res: ServerResponse,
): void => {
  res.statusCode = 500;
  res.end("Internal Server Error");
};

/** The typed 413 returned when a body exceeds `maxBodyBytes`. */
const payloadTooLargeResponse = (): Response =>
  toNativeResponse(
    httpErrorToResponse(
      statusError(
        statusOf(413),
        "Payload Too Large",
      ),
    ),
  );

/**
 * Serves a {@link Fetch} handler over a node:http server. Data-last in the
 * handler so it ends a routing pipeline:
 *
 * @example
 * const server = pipe(
 *   app,
 *   toFetch,
 *   serve({ port: 3000 }, () => console.log("listening")),
 * );
 */
export const serve =
  (
    options: ServeOptions,
    onListen?: () => void,
  ) =>
  (handler: Fetch): Server => {
    const maxBodyBytes =
      options.maxBodyBytes ??
      DEFAULT_MAX_BODY_BYTES;
    return pipe(
      createServer((req, res) =>
        collectBody(req, maxBodyBytes)
          .then((outcome) =>
            outcome.kind === "too-large"
              ? writeResponse(
                  res,
                  payloadTooLargeResponse(),
                ).then(() => {
                  // close the socket after the 413 is flushed, so a client
                  // still streaming a huge body can't keep the connection busy
                  req.destroy();
                })
              : handler(
                  toRequest(req, outcome.body),
                ).then((response) =>
                  writeResponse(res, response),
                ),
          )
          .catch(() => writeError(res)),
      ),
      (server) => {
        server.requestTimeout =
          options.requestTimeoutMs ??
          DEFAULT_REQUEST_TIMEOUT_MS;
        server.headersTimeout =
          options.headersTimeoutMs ??
          DEFAULT_HEADERS_TIMEOUT_MS;
        server.setTimeout(
          options.socketTimeoutMs ??
            DEFAULT_SOCKET_TIMEOUT_MS,
        );
        return options.hostname === undefined
          ? server.listen(options.port, () =>
              onListen?.(),
            )
          : server.listen(
              options.port,
              options.hostname,
              () => onListen?.(),
            );
      },
    );
  };
