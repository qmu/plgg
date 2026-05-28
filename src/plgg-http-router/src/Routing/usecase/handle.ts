import { PromisedResult } from "plgg";
import {
  Web,
  HttpRequest,
  HttpResponse,
  HttpError,
  dispatch,
} from "plgg-http-router/index";

/**
 * The plgg-native entry point: runs a {@link Web} against an
 * {@link HttpRequest}, yielding a `Result` value — no platform types, no
 * exceptions.
 */
export const handle = (
  app: Web,
  request: HttpRequest,
): PromisedResult<HttpResponse, HttpError> =>
  dispatch(app.routes, app.middlewares, request);
