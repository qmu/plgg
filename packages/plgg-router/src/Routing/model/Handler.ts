import { VNode } from "plgg-view";
import { Location } from "plgg-router/Routing/model/Location";

/**
 * A route handler: a {@link Location} in, a `VNode` out. This is the whole
 * inversion from plgg-server — server handlers return an `HttpResponse` inside a
 * `Result`; a client route is a pure, synchronous `Location -> VNode`. No
 * methods, no `Result`, no async in v1.
 */
export type Handler = (loc: Location) => VNode;
