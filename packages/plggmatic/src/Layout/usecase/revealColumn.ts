import {
  revealTarget,
  glideEase,
} from "plggmatic/Layout/model/reveal";
import { programmaticScrollAttr } from "plggmatic/Meta/model/classHooks";

/**
 * How a column is brought into view. `smooth` glides over
 * {@link RevealOptions.duration}; `auto` jumps, which is
 * what a reader who asked for less motion gets. `sticky`
 * is an element pinned over the strip's left side (a
 * sticky menu): while it covers part of the strip, the
 * visible part starts at its right edge.
 */
export type RevealOptions = Readonly<{
  behavior: "smooth" | "auto";
  sticky: Element | null;
  duration: number;
}>;

/** A 280ms glide with nothing pinned over the strip. */
export const revealOptions: RevealOptions = {
  behavior: "smooth",
  sticky: null,
  duration: 280,
};

// One glide per strip: starting another ends the one
// running. Keyed weakly, so a strip that leaves the
// document takes its entry with it.
const glides = new WeakMap<
  HTMLElement,
  AbortController
>();

/**
 * Scroll `strip` so `column` is seen (see
 * {@link revealTarget} for where it comes to rest).
 *
 * The glide belongs to the reader: a pointer press, a
 * touch, a wheel turn or a key press on the strip ends it
 * where it stands. While it runs the strip carries
 * {@link programmaticScrollAttr}, so a stylesheet can lift
 * scroll-snap — a mandatory snap fights a scripted scroll
 * frame by frame.
 *
 * DOM integration only: the decision is
 * {@link revealTarget}, tested on its own; this file is
 * excluded from coverage like `advanceColumns`.
 */
export const revealColumn = (
  strip: HTMLElement,
  column: Element,
  options: RevealOptions = revealOptions,
): void => {
  const bounds = strip.getBoundingClientRect();
  const right = bounds.left + strip.clientWidth;
  const stuck =
    options.sticky instanceof HTMLElement &&
    ["sticky", "fixed"].includes(
      getComputedStyle(options.sticky).position,
    )
      ? options.sticky.getBoundingClientRect()
          .right
      : bounds.left;
  const left =
    stuck > bounds.left && stuck < right
      ? stuck
      : bounds.left;
  const target = revealTarget(
    strip.scrollLeft,
    strip.scrollWidth - strip.clientWidth,
    { left, right },
    column.getBoundingClientRect(),
  );
  glides.get(strip)?.abort();
  if (
    options.behavior !== "smooth" ||
    Math.abs(target - strip.scrollLeft) < 1
  ) {
    strip.removeAttribute(programmaticScrollAttr);
    strip.scrollTo({
      left: target,
      behavior: "auto",
    });
    return;
  }
  const controller = new AbortController();
  const from = strip.scrollLeft;
  const start = performance.now();
  glides.set(strip, controller);
  strip.setAttribute(programmaticScrollAttr, "");
  const end = (): void => {
    controller.abort();
    strip.removeAttribute(programmaticScrollAttr);
  };
  [
    "pointerdown",
    "touchstart",
    "wheel",
    "keydown",
  ].forEach((event) =>
    strip.addEventListener(event, end, {
      passive: true,
      once: true,
      signal: controller.signal,
    }),
  );
  const step = (now: number): void => {
    if (
      controller.signal.aborted ||
      !strip.isConnected
    )
      return;
    const progress = Math.min(
      1,
      (now - start) / options.duration,
    );
    strip.scrollLeft =
      from +
      (target - from) * glideEase(progress);
    if (progress < 1) requestAnimationFrame(step);
    else {
      strip.scrollLeft = target;
      end();
    }
  };
  requestAnimationFrame(step);
};
