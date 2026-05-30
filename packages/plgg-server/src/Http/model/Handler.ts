import { PromisedResult } from "plgg";
import {
  Context,
  HttpResponse,
  HttpError,
} from "plgg-server/index";

/**
 * A route handler: given the context, produces a response or an error — as a
 * value, via plgg's `Result`. No exceptions, no raw `Response`.
 */
export type Handler = (
  c: Context,
) => PromisedResult<HttpResponse, HttpError>;

/**
 * Continuation passed to middleware; runs the rest of the chain. Pass an
 * enriched {@link Context} to thread state downstream
 * (`next(pipe(c, setState(...)))`), or call `next()` to continue with the current
 * context unchanged.
 */
export type Next = (
  c?: Context,
) => PromisedResult<HttpResponse, HttpError>;

/**
 * Onion-model middleware over the same `Result` contract as handlers. State is
 * threaded immutably: a middleware enriches the context and hands the new value
 * to `next` — nothing is mutated in place.
 */
export type Middleware = (
  c: Context,
  next: Next,
) => PromisedResult<HttpResponse, HttpError>;
