import { type Result } from "plgg";
import {
  type HttpRequest,
  type HttpResponse,
} from "plgg-server";
import { type RpError } from "plgg-auth/Rp/RpError";

/**
 * The sole I/O seam of the relying-party client: send a
 * request to the OP, get a response (or an {@link RpError}).
 * Production wires this over the network; the testkit
 * `inProcessTransport` wires it over `handle(op, req)`, so
 * the whole RP flow is exercised end to end with no sockets.
 * The RP client is otherwise pure — every protocol decision
 * folds through `Result`, never a throw.
 */
export type RpTransport = (
  req: HttpRequest,
) => Promise<Result<HttpResponse, RpError>>;
