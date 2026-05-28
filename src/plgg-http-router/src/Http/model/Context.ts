import { Option, SoftStr, fromNullable } from "plgg";
import {
  HttpRequest,
  getHeader,
  getQuery,
  getParam,
} from "plgg-http-router/index";

/**
 * The handler context: pure data — the request plus an immutable per-request
 * state bag. It carries no methods. Reads and writes are standalone, data-last
 * functions (`param`, `getState`, `setState`, ...), composed through `pipe`
 * like every other plgg value; response bodies are built with the standalone
 * `textResponse` / `jsonResponse` / ... constructors.
 *
 * `state` is `Readonly` and `setState` returns a new `Context`, so a request's
 * context is never mutated in place — middleware enriches it by threading the
 * new value into `next` (see {@link Middleware}).
 */
export type Context = Readonly<{
  req: HttpRequest;
  state: Readonly<Record<string, unknown>>;
}>;

/**
 * Seeds a {@link Context} for a request, with an empty state bag.
 */
export const makeContext = (
  req: HttpRequest,
): Context => ({
  req,
  state: {},
});

/**
 * Looks up a path parameter as an `Option`. Data-last: `pipe(c, param("id"))`.
 */
export const param =
  (name: SoftStr) =>
  (c: Context): Option<SoftStr> =>
    getParam(c.req, name);

/**
 * Looks up a query parameter as an `Option`. Data-last: `pipe(c, query("q"))`.
 */
export const query =
  (name: SoftStr) =>
  (c: Context): Option<SoftStr> =>
    getQuery(c.req, name);

/**
 * Looks up a request header (case-insensitive) as an `Option`. Data-last.
 */
export const header =
  (name: SoftStr) =>
  (c: Context): Option<SoftStr> =>
    getHeader(c.req, name);

/**
 * Reads a value from the state bag as an `Option`. Data-last.
 */
export const getState =
  (key: SoftStr) =>
  (c: Context): Option<unknown> =>
    fromNullable(c.state[key]);

/**
 * Returns a new {@link Context} with `key` set in the state bag — the original
 * is untouched. Data-last: `pipe(c, setState("user", u))`.
 */
export const setState =
  (key: SoftStr, value: unknown) =>
  (c: Context): Context => ({
    req: c.req,
    state: { ...c.state, [key]: value },
  });
