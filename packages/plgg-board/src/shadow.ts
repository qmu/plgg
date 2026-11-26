import type { Point3 } from "plgg-board/index";
import type {
  Scene,
  Light,
  Solid,
  Sheet,
} from "plgg-board/scene";
import type { Shadow } from "plgg-board/drawing";
import {
  dot,
  side,
  clip,
  shift,
  epsilon,
  withNext,
} from "plgg-board/geometry";
import {
  bounds,
  overlaps,
  depth,
  planeAt,
  type Bounds,
  type Surface,
} from "plgg-board/visibility";

type Loop = readonly Point3[];

/** A chain of points, newest on top: taking the top off
 * costs nothing, which is what the hull's backtracking
 * does over and over. */
type Chain =
  | Readonly<{ end: true }>
  | Readonly<{
      end: false;
      top: Point3;
      under: Chain;
    }>;
const noChain: Chain = { end: true };
/** Take points off the top while adding `p` would not
 * turn left (monotone chain). */
const trimmed = (
  chain: Chain,
  p: Point3,
): Chain =>
  !chain.end &&
  !chain.under.end &&
  side(chain.under.top, chain.top, p) <= epsilon
    ? trimmed(chain.under, p)
    : chain;
const unchained = (chain: Chain): Loop =>
  chain.end
    ? []
    : [...unchained(chain.under), chain.top];
const under = (chain: Chain): Chain =>
  chain.end ? chain : chain.under;
/** One side of the hull; its last point opens the
 * other side, so it is left off. */
const half = (pts: Loop): Loop =>
  unchained(
    under(
      pts.reduce(
        (chain: Chain, p): Chain => ({
          end: false,
          top: p,
          under: trimmed(chain, p),
        }),
        noChain,
      ),
    ),
  );
const hullOf = (sorted: Loop): Loop => [
  ...half(sorted),
  ...half([...sorted].reverse()),
];
const hull = (points: Loop): Loop =>
  hullOf(
    [...points].sort(
      (a, b) => a.x - b.x || a.y - b.y,
    ),
  );

const loopsOf = (
  caster: Solid | Sheet,
): readonly Loop[] =>
  "vertices" in caster
    ? caster.faces.map((loop) =>
        loop.flatMap((i) =>
          caster.vertices.slice(i, i + 1),
        ),
      )
    : [caster.points];

type Cut = (p: Point3) => number;

/** One part being cut clear of a blocker, cut by cut:
 * what is left to test, and what is already clear. */
type Clearing = Readonly<{
  rest: Loop;
  clear: readonly Loop[];
}>;
const cleared = (
  s: Clearing,
  outside: Loop,
  rest: Loop,
): Clearing => ({
  rest,
  clear:
    outside.length >= 3
      ? [...s.clear, outside]
      : s.clear,
});
const clearCut = (
  s: Clearing,
  cut: Cut,
): Clearing =>
  s.rest.length === 0
    ? s
    : cleared(
        s,
        clip(s.rest, (p) => -cut(p)),
        clip(s.rest, cut),
      );
const unblocked =
  (cuts: readonly Cut[]) =>
  (part: Loop): readonly Loop[] =>
    cuts.some((c) => part.every((p) => c(p) <= 0))
      ? [part]
      : cuts.reduce(clearCut, {
          rest: part,
          clear: [],
        }).clear;
const cutsOf = (
  blocker: Surface,
  receiver: Surface,
): readonly Cut[] => [
  (p) =>
    depth(blocker, p) -
    depth(receiver, p) -
    epsilon,
  ...blocker.planes.map(
    (e): Cut =>
      (p) =>
        planeAt(e, p),
  ),
];

const doubleArea = (poly: Loop): number =>
  withNext(poly).reduce(
    (area, [a, b]) =>
      area + a.x * b.y - a.y * b.x,
    0,
  );

/** The shadow one caster throws on one receiving
 * surface, clipped to the surface and cut clear of
 * whatever stands in front of it. */
const cast = (
  surfaces: readonly Surface[],
  r: Surface,
  caster: Solid | Sheet,
  polygon: Loop,
): readonly Shadow[] =>
  polygon.length < 3
    ? []
    : lit(surfaces, r, polygon, bounds(polygon))
        .filter(
          (poly) =>
            Math.abs(doubleArea(poly)) > epsilon,
        )
        .map((points) => ({
          id: caster.id,
          style: caster.style,
          receiver: r.face.item.id,
          points,
        }));
const lit = (
  surfaces: readonly Surface[],
  r: Surface,
  polygon: Loop,
  box: Bounds,
): readonly Loop[] =>
  surfaces.reduce(
    (parts: readonly Loop[], blocker) =>
      blocker === r || !overlaps(box, blocker.box)
        ? parts
        : parts.flatMap(
            unblocked(cutsOf(blocker, r)),
          ),
    [polygon],
  );

const thrown = (
  r: Surface,
  light: Light,
  caster: Solid | Sheet,
  at: (p: Point3) => Point3,
  near: Cut,
  travel: Cut,
): Loop =>
  r.planes.reduce(
    (polygon: Loop, e) =>
      clip(polygon, (p) => planeAt(e, p)),
    hull(
      loopsOf(caster).flatMap((loop) =>
        clip(
          clip(loop, travel).map((p) =>
            shift(p, light.direction, travel(p)),
          ),
          near,
        ).map(at),
      ),
    ),
  );

const receives = (
  caster: Solid | Sheet,
  r: Surface,
): boolean =>
  caster !== r.face.item &&
  (caster.shadowReceiver === undefined ||
    caster.shadowReceiver === r.face.item.id);

const onto = (
  surfaces: readonly Surface[],
  casters: readonly (Solid | Sheet)[],
  light: Light,
  at: (p: Point3) => Point3,
  near: Cut,
  r: Surface,
  denom: number,
): readonly Shadow[] =>
  Math.abs(denom) < epsilon
    ? []
    : casters.flatMap((caster) =>
        receives(caster, r)
          ? cast(
              surfaces,
              r,
              caster,
              thrown(
                r,
                light,
                caster,
                at,
                near,
                (p) =>
                  (r.face.offset -
                    dot(r.face.normal, p)) /
                  denom,
              ),
            )
          : [],
      );

const castBy = (
  casters: readonly (Solid | Sheet)[],
  light: Light,
  surfaces: readonly Surface[],
  at: (p: Point3) => Point3,
  near: Cut,
): readonly Shadow[] =>
  surfaces.flatMap((r) =>
    r.face.item.receives
      ? onto(
          surfaces,
          casters,
          light,
          at,
          near,
          r,
          dot(r.face.normal, light.direction),
        )
      : [],
  );

/** Every shadow the scene's casters throw on the visible
 * surfaces that receive them. */
export const shadows = (
  scene: Scene,
  light: Light,
  surfaces: readonly Surface[],
  at: (p: Point3) => Point3,
  near: (p: Point3) => number,
): readonly Shadow[] =>
  castBy(
    [...scene.solids, ...scene.sheets].filter(
      (s) => s.casts,
    ),
    light,
    surfaces,
    at,
    near,
  );
