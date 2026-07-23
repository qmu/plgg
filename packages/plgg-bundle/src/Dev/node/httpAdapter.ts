import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from "plgg-bundle/vendors/nodeHttp";
import { type Fetch } from "plgg-bundle/Dev/model/Fetch";

// The node:http ⇄ Web-standard bridge for the dev server.
// A plgg-free reimplementation of plgg-server's `serve`
// (the toolchain must not import a library it builds): a
// Node request becomes a Web `Request`, the app's `Fetch`
// answers, and the Web `Response` streams back. This is
// the one platform seam — kept in `Dev/node/` and out of
// the coverage threshold, exercised by the fixture PoC.

/** How the dev server binds its node:http listener. */
export type ServeOptions = Readonly<{
  port: number;
  hostname?: string;
}>;

/** Buffer a request body into an ArrayBuffer. */
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
      const copy = new ArrayBuffer(
        merged.byteLength,
      );
      new Uint8Array(copy).set(merged);
      resolve(copy);
    });
    req.on("error", reject);
  });

/** Copy Node's incoming headers into Web Headers. */
const buildHeaders = (
  raw: IncomingMessage["headers"],
): Headers =>
  new Headers(
    Object.entries(raw).flatMap(
      ([key, value]): Array<
        [string, string]
      > =>
        value === undefined
          ? []
          : typeof value === "string"
            ? [[key, value]]
            : value.map(
                (v): [string, string] => [
                  key,
                  v,
                ],
              ),
    ),
  );

/** Convert a Node request (+ buffered body) into a Request. */
export const toRequest = (
  req: IncomingMessage,
  body: ArrayBuffer,
): Request => {
  const method = req.method ?? "GET";
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.url ?? "/"}`;
  return method !== "GET" &&
    method !== "HEAD" &&
    body.byteLength > 0
    ? new Request(url, {
        method,
        headers: buildHeaders(req.headers),
        body,
      })
    : new Request(url, {
        method,
        headers: buildHeaders(req.headers),
      });
};

/** Stream a Web ReadableStream of bytes onto the Node response. */
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
          res.write(
            Buffer.from(chunk.value),
            (e) =>
              e ? reject(e) : resolve(),
          ),
        ).then(() => pump(reader, res)),
  );

/** Write a Web Response back onto a Node ServerResponse. */
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

/** Last-resort 500 when the adapter itself throws. */
const writeError = (
  res: ServerResponse,
): void => {
  res.statusCode = 500;
  res.end("Internal Server Error");
};

/**
 * Serve a {@link Fetch} over a node:http server
 * (data-last). The handler is read fresh from `current()`
 * per request, so the dev loop can hot-swap the live
 * `Fetch` without rebinding the listener.
 */
export const serveFetch =
  (
    options: ServeOptions,
    current: () => Fetch,
    onListen?: () => void,
  ) =>
  (): Server => {
    const server = createServer((req, res) =>
      collectBody(req)
        .then((body) =>
          current()(toRequest(req, body)),
        )
        .then((response) =>
          writeResponse(res, response),
        )
        .catch(() => writeError(res)),
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
  };
