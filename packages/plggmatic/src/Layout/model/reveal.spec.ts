import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type Span,
  revealTarget,
  glideEase,
} from "plggmatic/Layout/model/reveal";

// corpd's `columnScrollTarget`, copied as the reference.
const corpd = (
  current: number,
  maximum: number,
  visible: Span,
  column: Span,
): number => {
  const delta =
    column.right - column.left >
    visible.right - visible.left
      ? column.right - visible.right
      : column.left < visible.left
        ? column.left - visible.left
        : column.right > visible.right
          ? column.right - visible.right
          : 0;
  return Math.max(
    0,
    Math.min(maximum, current + delta),
  );
};

const visible: Span = { left: 220, right: 1280 };

test("a column in full view moves nothing; one cut off comes to the edge it was cut by", () =>
  all([
    check(
      revealTarget(300, 2000, visible, {
        left: 400,
        right: 720,
      }),
      toBe(300),
    ),
    check(
      revealTarget(300, 2000, visible, {
        left: 100,
        right: 420,
      }),
      toBe(180),
    ),
    check(
      revealTarget(300, 2000, visible, {
        left: 1100,
        right: 1420,
      }),
      toBe(440),
    ),
  ]));

test("a column wider than the visible part shows its end; the result stays within reach", () =>
  all([
    check(
      revealTarget(0, 2000, visible, {
        left: 300,
        right: 1700,
      }),
      toBe(420),
    ),
    check(
      revealTarget(1900, 2000, visible, {
        left: 1100,
        right: 1600,
      }),
      toBe(2000),
    ),
    check(
      revealTarget(50, 2000, visible, {
        left: 0,
        right: 320,
      }),
      toBe(0),
    ),
  ]));

test("it is corpd's rule at every case tried", () => {
  const columns: ReadonlyArray<Span> = [
    { left: -400, right: -80 },
    { left: 100, right: 420 },
    { left: 400, right: 720 },
    { left: 1100, right: 1420 },
    { left: 300, right: 1700 },
    { left: 2000, right: 2640 },
  ];
  return check(
    [0, 300, 1900]
      .flatMap((current) =>
        columns.map(
          (column) =>
            revealTarget(
              current,
              2000,
              visible,
              column,
            ) ===
            corpd(current, 2000, visible, column),
        ),
      )
      .every(Boolean),
    toBe(true),
  );
});

test("the glide starts fast, ends still, and is held to its ends", () =>
  all([
    check(glideEase(0), toBe(0)),
    check(glideEase(1), toBe(1)),
    check(glideEase(0.5), toBe(0.875)),
    check(glideEase(-1), toBe(0)),
    check(glideEase(3), toBe(1)),
  ]));
