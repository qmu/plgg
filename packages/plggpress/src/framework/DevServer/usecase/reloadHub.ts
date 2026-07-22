import {
  SSE_PRELUDE,
  RELOAD_FRAME,
} from "plggpress/framework/DevServer/model/DevChannel";

// UTF-8 byte encoder for the SSE frames — the response body
// is `AsyncIterable<Uint8Array>`, not text.
const ENCODER = new TextEncoder();

/**
 * A live Server-Sent-Events broadcast hub: the
 * plggpress-owned client channel. Each connected client is a
 * `subscribe()`d async byte stream; `notify()` pushes a
 * reload frame to every one at once.
 *
 * This is the ONE imperative seam of the dev surface — it
 * holds live subscriber state — so mutation is confined here
 * (mirroring the node serve adapter's socket registry) while
 * every consumer above sees only the async iterable and the
 * verbs. The hub OUTLIVES a rebuild: the server process holds
 * it across content edits, so a client's stream is never
 * dropped when the rendered site is rebuilt — unlike a
 * re-imported dev entry, which tears its channel down.
 */
export type ReloadHub = Readonly<{
  /**
   * Open one client's byte stream: it yields the prelude
   * immediately, then one reload frame per {@link notify}
   * until the client disconnects or {@link close} ends it.
   */
  subscribe: () => AsyncIterable<Uint8Array>;
  /** Push a reload frame to every open client. */
  notify: () => void;
  /** How many clients are currently connected. */
  connections: () => number;
  /** End every open stream and drop all subscribers. */
  close: () => void;
}>;

// One subscriber's mailbox. Imperative by nature (a live push
// target) so kept local to the factory: a buffer of pending
// chunks, and the resolver of a `next()` that is waiting on
// an empty buffer.
type Sink = {
  readonly buffer: Array<Uint8Array>;
  deliver:
    | ((r: IteratorResult<Uint8Array>) => void)
    | undefined;
  closed: boolean;
};

/**
 * Build a fresh {@link ReloadHub}. The factory closes over a
 * `Set` of sinks; every returned verb reads or drives it.
 */
export const makeReloadHub = (): ReloadHub => {
  const sinks = new Set<Sink>();

  // Hand a chunk to a sink: satisfy its waiting `next()` if it
  // has one, else buffer it for the next pull.
  const push = (
    sink: Sink,
    chunk: Uint8Array,
  ): void => {
    const deliver = sink.deliver;
    if (deliver === undefined) {
      sink.buffer.push(chunk);
    } else {
      sink.deliver = undefined;
      deliver({ value: chunk, done: false });
    }
  };

  // End one sink's stream: mark it closed and resolve any
  // waiting `next()` with `done`.
  const finish = (sink: Sink): void => {
    const deliver = sink.deliver;
    sink.closed = true;
    if (deliver !== undefined) {
      sink.deliver = undefined;
      deliver({ value: undefined, done: true });
    }
  };

  const subscribe =
    (): AsyncIterable<Uint8Array> => {
      const sink: Sink = {
        buffer: [ENCODER.encode(SSE_PRELUDE)],
        deliver: undefined,
        closed: false,
      };
      sinks.add(sink);
      const iterator: AsyncIterator<Uint8Array> = {
        next: (): Promise<
          IteratorResult<Uint8Array>
        > =>
          new Promise((resolve) => {
            const queued = sink.buffer.shift();
            if (queued !== undefined) {
              resolve({
                value: queued,
                done: false,
              });
            } else if (sink.closed) {
              resolve({
                value: undefined,
                done: true,
              });
            } else {
              sink.deliver = resolve;
            }
          }),
        return: (): Promise<
          IteratorResult<Uint8Array>
        > => {
          sinks.delete(sink);
          sink.closed = true;
          return Promise.resolve({
            value: undefined,
            done: true,
          });
        },
      };
      return {
        [Symbol.asyncIterator]: () => iterator,
      };
    };

  const notify = (): void => {
    const frame = ENCODER.encode(RELOAD_FRAME);
    for (const sink of sinks) {
      push(sink, frame);
    }
  };

  const close = (): void => {
    for (const sink of sinks) {
      finish(sink);
    }
    sinks.clear();
  };

  const connections = (): number => sinks.size;

  return { subscribe, notify, connections, close };
};
