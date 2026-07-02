// The dev-only live-reload wire protocol: the SSE route
// the injected client script connects to, and the frames
// pushed over it. Kept as pure constants/string builders
// (no `node:*`, no sockets) so the transport shape is
// unit-testable and the node adapter only owns the socket
// registry. Mirrors plggpress's hand-rolled SSE reload,
// reproduced here plgg-free in the toolchain.

/** The dev-only Server-Sent-Events live-reload route. */
export const RELOAD_PATH = "/__plgg_reload";

/**
 * The SSE opener frame. A comment line keeps the stream
 * from idling before the first reload is pushed.
 */
export const SSE_PRELUDE = ": connected\n\n";

/**
 * A default-event SSE frame the injected client's
 * `onmessage` handler reacts to by reloading the page.
 */
export const RELOAD_FRAME = "data: reload\n\n";

/**
 * The dev-only live-reload client: a constant `<script>`
 * opening an `EventSource` to {@link RELOAD_PATH} that
 * reloads the page on every pushed frame. This literal is
 * string-appended onto rendered HTML output ONLY (see
 * `decorateDevHtml`) — it never enters a typed render
 * tree, so a production build can never emit it.
 */
export const LIVE_RELOAD_SCRIPT =
  "<script>new EventSource('" +
  RELOAD_PATH +
  "').onmessage=()=>location.reload();</script>";
