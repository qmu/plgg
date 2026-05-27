import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from "node:http";
import { fromNullable, getOr, pipe } from "plgg";
import { Fetch } from "plgg-web/index";

/**
 * Options for the node:http adapter.
 */
export type ServeOptions = {
  readonly port: number;
  readonly hostname?: string;
};

/**
 * Buffers a Node request stream into a standalone ArrayBuffer.
 *
 * This bridges Node's imperative stream/EventEmitter API into a `Promise`, so
 * the body — like the rest of this adapter — is irreducibly imperative; it is
 * the platform seam, confined here.
 */
const collectBody = (
  req: IncomingMessage,
): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const chunks: Array<Buffer> = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      const merged = Buffer.concat(chunks);
      const copy = new ArrayBuffer(merged.byteLength);
      new Uint8Array(copy).set(merged);
      resolve(copy);
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
          : { method, headers: buildHeaders(req.headers) },
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
  reader.read().then((chunk) =>
    chunk.done
      ? new Promise<void>((resolve) =>
          res.end(() => resolve()),
        )
      : new Promise<void>((resolve, reject) =>
          res.write(Buffer.from(chunk.value), (e) =>
            e ? reject(e) : resolve(),
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
const writeError = (res: ServerResponse): void => {
  res.statusCode = 500;
  res.end("Internal Server Error");
};

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
  (options: ServeOptions, onListen?: () => void) =>
  (handler: Fetch): Server =>
    pipe(
      createServer((req, res) =>
        collectBody(req)
          .then((body) =>
            handler(toRequest(req, body)),
          )
          .then((response) =>
            writeResponse(res, response),
          )
          .catch(() => writeError(res)),
      ),
      (server) =>
        options.hostname === undefined
          ? server.listen(options.port, () =>
              onListen?.(),
            )
          : server.listen(
              options.port,
              options.hostname,
              () => onListen?.(),
            ),
    );
