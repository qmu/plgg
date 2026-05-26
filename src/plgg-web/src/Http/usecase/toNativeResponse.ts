import { HttpResponse } from "plgg-web/index";

/**
 * Converts a plgg-native {@link HttpResponse} into a Web-standard `Response`.
 *
 * The second seam function: the branded status is unwrapped to a number and
 * the header `Dict` is copied into native `Headers` here, at the edge.
 */
export const toNativeResponse = (
  response: HttpResponse,
): Response =>
  new Response(response.body, {
    status: response.status.content,
    headers: new Headers({ ...response.headers }),
  });
