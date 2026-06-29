import { type PromisedResult, err } from "plgg";
import {
  type PressOptions,
  type DevServer,
} from "plgg-press/Press/model/PressOptions";
import {
  type NotImplementedError,
  notImplementedError,
} from "plgg-press/Press/model/PressError";

/**
 * Serve the site in dev mode (watch + live render),
 * honouring `opts.allowedHosts`. STUB for this scaffold
 * ticket: the contract is fixed here, the dev-server body
 * (built on plgg-server) lands in a later ticket. Returns
 * a typed {@link NotImplementedError} rather than
 * throwing.
 */
export const dev = (
  opts: PressOptions,
): PromisedResult<
  DevServer,
  NotImplementedError
> =>
  Promise.resolve(
    err(
      notImplementedError(
        `dev() is not implemented yet (contentDir ${opts.contentDir})`,
      ),
    ),
  );
