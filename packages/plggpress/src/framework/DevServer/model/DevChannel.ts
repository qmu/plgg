import { type SoftStr } from "plgg";

// The plggpress-OWNED dev live-reload wire protocol: the SSE
// route the injected client connects to, the frames pushed
// over it, and the client `<script>` string. Pure
// constants/strings (no `node:*`, no sockets) so the
// transport shape is unit-testable and the node edge only
// owns the socket registry.
//
// This is deliberately plggpress's own channel — NOT
// plgg-bundle's `/__plgg_reload`. The dev-server surface that
// hosts it (`node/devServer`) is a persistent process
// plggpress controls, so the reload channel, and later the
// edit/assistant channels, are ours to extend rather than the
// bundler's.

/**
 * The dev-only Server-Sent-Events live-reload route the
 * injected client opens an `EventSource` against. Absolute
 * (not base-prefixed): the dev server always mounts it at the
 * process root, independent of the site's deploy base.
 */
export const RELOAD_PATH: SoftStr =
  "/__plggpress_reload";

/**
 * The SSE opener frame. A comment line keeps the stream from
 * idling before the first reload is pushed, and lets a client
 * confirm the channel is live the moment it connects.
 */
export const SSE_PRELUDE: SoftStr = ": connected\n\n";

/**
 * A default-event SSE frame the injected client's `onmessage`
 * handler reacts to by reloading the page.
 */
export const RELOAD_FRAME: SoftStr = "data: reload\n\n";

/**
 * The dev-only live-reload client: a constant `<script>`
 * opening an `EventSource` to {@link RELOAD_PATH} that
 * reloads the page on every pushed frame. This literal is
 * string-appended onto rendered HTML OUTPUT ONLY (see
 * `decorateDevHtml`) — it never enters a typed render tree,
 * so a production `build` can never emit it (the build.spec
 * no-`EventSource`-in-prod assertion stays green).
 */
export const LIVE_RELOAD_SCRIPT: SoftStr =
  "<script>new EventSource('" +
  RELOAD_PATH +
  "').onmessage=()=>location.reload();</script>";
