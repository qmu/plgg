import {
  type Cmd,
  cmdEffect,
} from "plgg-view/client";
import { type Theme } from "plggmatic/Style/model/theme";
import { minWidth } from "plggmatic/Style/model/breakpoint";

/**
 * The SEEK-HEAD SCROLL that owns the {@link runwayCss}
 * runway: after an action grows or changes the column stack,
 * slide the horizontal strip so the NEWEST (right-most,
 * active) column comes into view, and publish the last
 * column's measured width so the runway spacer is exactly one
 * column short of the strip. The framework half of the
 * unbounded-depth runway capability — the reference used to
 * own this as an app effect; it is now declared here and the
 * reference merely wires it.
 *
 * A pure {@link Cmd}: the DOM read/scroll runs in the effect
 * (after paint, via a double `requestAnimationFrame`), never
 * in an `update`. Inert (resolves `done` immediately) with no
 * `document`/`window` — so it is a safe no-op under the node
 * test runner, the reason this thin DOM-integration file is
 * coverage-excluded.
 *
 * The resting place differs by viewport, because the two have
 * different scarcity:
 * - **Below `snap`** (a phone): the live column goes to the
 *   LEFT EDGE, always — about one column fits, so there is no
 *   context to keep and the edge is the unambiguous rest point
 *   the mandatory scroll-snap lands on anyway.
 * - **At/above `snap`**: the live column goes to the CENTRE,
 *   and only when not already fully visible — a wide strip
 *   shows several columns, so the trail behind the live column
 *   is context worth keeping; `scrollTo` clamps, so a centre
 *   target the strip cannot afford simply rests at the near
 *   edge (no separate shallow-strip case).
 *
 * The `snap` boundary is matched through `matchMedia` on the
 * very {@link minWidth} condition the runway CSS uses, so the
 * motion and the scrollable range never disagree about which
 * viewport this is. Curried `advanceColumns(theme)(done)` so
 * the completion message is the consumer's own `Msg`.
 */
export const advanceColumns =
  (theme: Theme) =>
  <Msg>(done: Msg): Cmd<Msg> =>
    cmdEffect(
      () =>
        new Promise<Msg>((resolve) => {
          const finish = (): void =>
            resolve(done);
          if (
            typeof document === "undefined" ||
            typeof window === "undefined" ||
            typeof requestAnimationFrame ===
              "undefined"
          ) {
            return finish();
          }
          const p = theme.prefix;
          const scroll = (): void => {
            const row = document.querySelector(
              `.${p}-row`,
            );
            if (row !== null) {
              const cols = Array.from(
                row.querySelectorAll(`.${p}-col`),
              ).filter(
                (c: Element) =>
                  c.getBoundingClientRect()
                    .width > 0,
              );
              const last = cols[cols.length - 1];
              if (last !== undefined) {
                const strip =
                  row.getBoundingClientRect();
                const col =
                  last.getBoundingClientRect();
                // The runway is "the strip's width minus the
                // last column", and since columns size to
                // their CONTENT, only the DOM knows how wide
                // that is — a stylesheet constant cannot.
                // Publish it here, where it is measured, and
                // the runway rule reads it back.
                if (row instanceof HTMLElement) {
                  row.style.setProperty(
                    `--${p}-runway-last`,
                    `${Math.round(col.width)}px`,
                  );
                }
                // Scroll ONLY the horizontal strip — never
                // `scrollIntoView`, which also scrolls the
                // page vertically and would hide the top bar.
                const toLeftEdge =
                  row.scrollLeft +
                  (col.left - strip.left);
                const wide = window.matchMedia(
                  minWidth("snap"),
                ).matches;
                const inView =
                  col.left >= strip.left - 1 &&
                  col.right <= strip.right + 1;
                if (wide && inView) {
                  return finish();
                }
                row.scrollTo({
                  left: wide
                    ? toLeftEdge -
                      (strip.width - col.width) /
                        2
                    : toLeftEdge,
                  behavior: "smooth",
                });
              }
            }
            finish();
          };
          // two frames: let the new column paint + lay out
          // before measuring and scrolling.
          requestAnimationFrame(() =>
            requestAnimationFrame(scroll),
          );
        }),
    );
