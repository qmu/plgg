import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  type MenuTrack,
  stripMetrics,
  stripGeometry,
  stripStyle,
  visibleColumnStart,
  reachableScroll,
} from "plggmatic/Layout/model/geometry";

// corpd's `ui/src/geometry.ts`, copied as the reference:
// corpd is the first product this returns to.
const corpd = (
  viewport: number,
  scroll: number,
  menuOpen: boolean,
  desktopMenu = Math.min(220, viewport * 0.4),
) => {
  const narrow = viewport < 640;
  const menu = menuOpen
    ? narrow
      ? viewport
      : desktopMenu
    : 0;
  const column = narrow
    ? viewport
    : Math.min(320, viewport * 0.6);
  const track = viewport - menu;
  const floor = Math.min(320, viewport - column);
  return {
    menu,
    column,
    track,
    floor,
    seam: Math.max(0, viewport - floor - column),
    layoutMinimum: viewport - floor,
    width: Math.max(
      floor,
      track - Math.max(0, scroll),
    ),
  };
};
// coop-planner's `explorationChatGeometry`, likewise.
const coop = (
  viewport: number,
  scroll: number,
  menuOpen: boolean | number,
) => {
  const menu =
      typeof menuOpen === "number"
        ? menuOpen
        : menuOpen
          ? Math.min(220, viewport * 0.4)
          : 0,
    column = Math.min(320, viewport * 0.6);
  const track = viewport - menu,
    floor = Math.min(320, viewport - column);
  return {
    menu,
    column,
    track,
    floor,
    seam: Math.max(0, viewport - floor - column),
    layoutMinimum: viewport - floor,
    width: Math.max(
      floor,
      track - Math.max(0, scroll),
    ),
  };
};

const viewports = [
  320, 390, 639, 640, 768, 900, 1280, 1920,
];
const scrolls = [-40, 0, 120, 700, 5000];
const g = stripGeometry(stripMetrics);

test("the default metrics give corpd's geometry at every width, scroll and menu state", () =>
  check(
    viewports
      .flatMap((v) =>
        scrolls.flatMap((s) => [
          JSON.stringify(g(v, s, "open")) ===
            JSON.stringify(corpd(v, s, true)),
          JSON.stringify(g(v, s, "closed")) ===
            JSON.stringify(corpd(v, s, false)),
          // a collapsed rail: corpd passes its width in
          JSON.stringify(g(v, s, 64)) ===
            JSON.stringify(corpd(v, s, true, 64)),
        ]),
      )
      .every(Boolean),
    toBe(true),
  ));

test("with no phone width it is coop-planner's geometry, a part-open menu included", () => {
  const wide = stripGeometry({
    ...stripMetrics,
    phone: 0,
  });
  const tracks: ReadonlyArray<
    readonly [MenuTrack, boolean | number]
  > = [
    ["open", true],
    ["closed", false],
    [72, 72],
    [133.5, 133.5],
  ];
  return check(
    viewports
      .flatMap((v) =>
        scrolls.flatMap((s) =>
          tracks.map(
            ([ours, theirs]) =>
              JSON.stringify(wide(v, s, ours)) ===
              JSON.stringify(coop(v, s, theirs)),
          ),
        ),
      )
      .every(Boolean),
    toBe(true),
  );
});

test("the pinned panel yields to the columns as the strip scrolls, never under its floor", () =>
  all([
    check(g(1280, 0, "open").width, toBe(1060)),
    check(g(1280, 500, "open").width, toBe(560)),
    check(g(1280, 5000, "open").width, toBe(320)),
    check(g(390, 0, "open").column, toBe(390)),
  ]));

test("the style value carries each length on the framework's custom property", () =>
  check(
    stripStyle(g(1280, 0, "open")),
    toBe(
      "--pm-strip-track:1060px;--pm-strip-panel:1060px;--pm-strip-menu:220px;--pm-strip-column:320px;--pm-strip-minimum:960px;--pm-strip-seam:640px",
    ),
  ));

test("only whole columns are counted in beside the pinned panels, the last one always", () =>
  all([
    check(
      visibleColumnStart(
        [320, 320, 320, 320],
        1280,
        540,
      ),
      toBe(2),
    ),
    check(
      visibleColumnStart([320, 900], 1000, 320),
      toBe(1),
    ),
    check(
      visibleColumnStart([], 1000, 0),
      toBe(0),
    ),
  ]));

test("a remembered scroll is held to what the strip can still reach", () =>
  all([
    check(
      reachableScroll(400, 2000, 1000),
      toBe(400),
    ),
    check(
      reachableScroll(1400, 2000, 1000),
      toBe(1000),
    ),
    check(
      reachableScroll(-5, 2000, 1000),
      toBe(0),
    ),
    check(
      reachableScroll(300, 800, 1000),
      toBe(0),
    ),
  ]));
