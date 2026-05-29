import {
  Option,
  isSome,
  mapOption,
  none,
  pipe,
} from "plgg";
import { VNode } from "plgg-view";
import { Location } from "plgg-router/Routing/model/Location";
import { Router } from "plgg-router/Routing/model/Router";
import { matchSegments } from "plgg-router/Routing/usecase/matchSegments";

/**
 * Resolves a {@link Location} against a {@link Router}: scans the routes in
 * registration order, and the first whose compiled segments match the location
 * path wins. The captured params are folded into the location before the
 * matched handler is invoked, so handlers read them via `param(name)`. Returns
 * `none()` when no route matches (the host renders its own not-found view).
 */
export const resolve = (
  router: Router,
  loc: Location,
): Option<VNode> =>
  router.routes.reduce<Option<VNode>>(
    (acc, route) =>
      isSome(acc)
        ? acc
        : pipe(
            matchSegments(route.segments, loc.path),
            mapOption((params) =>
              route.handler({
                ...loc,
                params: { ...loc.params, ...params },
              }),
            ),
          ),
    none(),
  );
