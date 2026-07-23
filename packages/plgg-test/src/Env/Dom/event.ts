import {
  DomEventTarget,
  DomListener,
  DomRect,
  ListenerMap,
} from "./types.js";

/**
 * Event dispatch for the in-house DOM. We REUSE Node's built-in `Event`
 * (and `CustomEvent`) — only `target`/`currentTarget` are not settable
 * through the constructor, so dispatch pins them via `defineProperty`
 * (Node permits this on an Event instance). Bubbling walks a precomputed
 * path (target → ancestors → document → window), firing each hop's
 * listeners with `currentTarget` repointed, until `stopPropagation`.
 */

// Pins a normally-read-only Event field on the instance. defineProperty
// bypasses the getter without a cast — the cast-free way to set `target`.
const pin = (
  event: Event,
  key: string,
  value: unknown,
): void => {
  Object.defineProperty(event, key, {
    configurable: true,
    value,
  });
};

/** Registers a listener (idempotent per identical (type, fn) pair). */
export const addListener = (
  listeners: ListenerMap,
  type: string,
  listener: DomListener,
): void => {
  const current = listeners.get(type) ?? [];
  if (!current.includes(listener)) {
    listeners.set(type, [...current, listener]);
  }
};

/** Removes a previously-registered listener. */
export const removeListener = (
  listeners: ListenerMap,
  type: string,
  listener: DomListener,
): void => {
  const current = listeners.get(type);
  if (current !== undefined) {
    listeners.set(
      type,
      current.filter((l) => l !== listener),
    );
  }
};

// Whether propagation has been stopped on this event (read off the
// instance without a cast — Node's Event exposes neither flag publicly).
const propagationStopped = (
  event: Event,
): boolean => {
  const flag = Reflect.get(event, "cancelBubble");
  return flag === true;
};

/**
 * Dispatches `event` along `path` (innermost first). Sets `target` once,
 * repoints `currentTarget` per hop, and stops early if a listener called
 * `stopPropagation`. Returns `!defaultPrevented` (the DOM contract).
 */
export const dispatchAlong = (
  path: ReadonlyArray<DomEventTarget>,
  event: Event,
): boolean => {
  const root = path[0];
  pin(event, "target", root ?? null);
  for (const hop of path) {
    if (propagationStopped(event)) {
      break;
    }
    pin(event, "currentTarget", hop);
    const fns = hop.listeners.get(event.type);
    if (fns !== undefined) {
      // a copy: a listener may add/remove during dispatch
      [...fns].forEach((fn) => fn(event));
    }
  }
  pin(event, "currentTarget", null);
  return !event.defaultPrevented;
};

/**
 * `new DOMRect(x, y, width, height)` — a plain rect value (no layout). The
 * default `getBoundingClientRect` returns a zero rect; specs override it
 * per node. A `function` (not an arrow) because it must be `new`-able.
 */
export function DomRectCtor(
  this: void,
  x: number = 0,
  y: number = 0,
  width: number = 0,
  height: number = 0,
): DomRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
  };
}

/** The init bag `new MouseEvent(type, init)` accepts (only fields we read). */
export type MouseInit = Readonly<{
  bubbles?: boolean;
  cancelable?: boolean;
  button?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}>;

/**
 * `new MouseEvent(type, init)` — Node has `Event` but not `MouseEvent`, so we
 * build one: a real `Event` (for type/bubbles/cancelable/preventDefault) with
 * the mouse fields pinned on. `new`-able, hence a `function`.
 */
export function MouseEventCtor(
  this: void,
  type: string,
  init: MouseInit = {},
): Event {
  const event = new Event(type, {
    bubbles: init.bubbles ?? false,
    cancelable: init.cancelable ?? false,
  });
  pin(event, "button", init.button ?? 0);
  pin(event, "metaKey", init.metaKey ?? false);
  pin(event, "ctrlKey", init.ctrlKey ?? false);
  pin(event, "shiftKey", init.shiftKey ?? false);
  pin(event, "altKey", init.altKey ?? false);
  return event;
}
