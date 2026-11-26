import {
  pipe,
  none,
  some,
  fromNullable,
  getOr,
  type Option,
} from "plgg";

export type Point = Readonly<{
  x: number;
  y: number;
}>;
export type Point3 = Point &
  Readonly<{ z: number }>;
export type Camera = Readonly<{
  /** Strength of perspective division, from orthographic (0) to full (1). */
  perspective?: boolean | number;

  yaw: number;
  pitch: number;
  scale: number;
  origin: Point;
}>;

export const frontCamera = (
  origin: Point,
): Camera => ({
  yaw: 0,
  pitch: 0,
  scale: 1,
  origin,
});

export const orbit =
  (dx: number, dy: number) =>
  (camera: Camera): Camera => ({
    ...camera,
    yaw: camera.yaw + dx,
    pitch: camera.pitch + dy,
  });

export const pan =
  (dx: number, dy: number) =>
  (camera: Camera): Camera => ({
    ...camera,
    origin: {
      x: camera.origin.x + dx,
      y: camera.origin.y + dy,
    },
  });

const clamped = (scale: number): number =>
  Math.min(5, Math.max(0.1, scale));
const zoomedTo = (
  camera: Camera,
  anchor: Point,
  scale: number,
): Camera => ({
  ...camera,
  scale,
  origin: {
    x:
      anchor.x +
      (camera.origin.x - anchor.x) *
        (scale / camera.scale),
    y:
      anchor.y +
      (camera.origin.y - anchor.y) *
        (scale / camera.scale),
  },
});
export const zoomAt =
  (anchor: Point, factor: number) =>
  (camera: Camera): Camera =>
    zoomedTo(
      camera,
      anchor,
      clamped(camera.scale * factor),
    );

/** How strong the perspective is, as a number; a camera
 * that says nothing has none. */
const perspectiveOf = (camera: Camera): number =>
  Number(
    pipe(
      fromNullable(camera.perspective),
      getOr<boolean | number>(0),
    ),
  );
const strength = (camera: Camera): number =>
  Math.min(1, Math.max(0, perspectiveOf(camera)));

/** Focal distance in world units. Bound the near-plane denominator so
 * interactive drags through the eye never produce an inverted glyph. */
export const projectedScale = (
  camera: Camera,
  depth: number,
): number =>
  (camera.scale * 1000) /
  Math.max(100, 1000 - depth * strength(camera));

/** A point turned by the camera, before perspective:
 * across, up and into the screen. */
const turned = (
  camera: Camera,
  p: Point3,
  depth: number,
): Point3 => ({
  x:
    Math.cos(camera.yaw) * p.x +
    Math.sin(camera.yaw) * p.z,
  y:
    Math.cos(camera.pitch) * p.y -
    Math.sin(camera.pitch) * depth,
  z:
    Math.sin(camera.pitch) * p.y +
    Math.cos(camera.pitch) * depth,
});
const placed = (
  camera: Camera,
  t: Point3,
  scale: number,
): Point3 => ({
  x: camera.origin.x + scale * t.x,
  y: camera.origin.y + scale * t.y,
  z: t.z,
});
const seen = (
  camera: Camera,
  t: Point3,
): Point3 =>
  placed(camera, t, projectedScale(camera, t.z));
export const project =
  (camera: Camera) =>
  (p: Point3): Point3 =>
    seen(
      camera,
      turned(
        camera,
        p,
        -Math.sin(camera.yaw) * p.x +
          Math.cos(camera.yaw) * p.z,
      ),
    );

/** Inverse camera rotation for dragging parallel to the screen. */
const unturned = (
  camera: Camera,
  x: number,
  y: number,
): Point3 => ({
  x:
    Math.cos(camera.yaw) * x +
    Math.sin(camera.yaw) *
      Math.sin(camera.pitch) *
      y,
  y: Math.cos(camera.pitch) * y,
  z:
    Math.sin(camera.yaw) * x -
    Math.cos(camera.yaw) *
      Math.sin(camera.pitch) *
      y,
});
export const worldDelta = (
  camera: Camera,
  delta: Point,
  depth = 0,
): Point3 =>
  unturned(
    camera,
    delta.x / projectedScale(camera, depth),
    delta.y / projectedScale(camera, depth),
  );

export type Stroke = Readonly<{
  from: Point3;
  to: Point3;
}>;
export const projectStroke =
  (camera: Camera) =>
  (line: Stroke): Stroke => ({
    from: project(camera)(line.from),
    to: project(camera)(line.to),
  });

type Extent = Readonly<{
  left: number;
  right: number;
  top: number;
  bottom: number;
}>;
const extent = (
  points: readonly Point3[],
): Extent =>
  points.reduce(
    (b: Extent, p): Extent => ({
      left: Math.min(b.left, p.x),
      right: Math.max(b.right, p.x),
      top: Math.min(b.top, p.y),
      bottom: Math.max(b.bottom, p.y),
    }),
    {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    },
  );
const centred = (
  camera: Camera,
  size: Point,
  b: Extent,
  scale: number,
): Camera => ({
  ...camera,
  scale,
  origin: {
    x: (size.x - scale * (b.left + b.right)) / 2,
    y: (size.y - scale * (b.top + b.bottom)) / 2,
  },
});
const fitted = (
  camera: Camera,
  size: Point,
  padding: number,
  b: Extent,
): Camera =>
  centred(
    camera,
    size,
    b,
    Math.max(
      0.1,
      Math.min(
        5,
        (size.x - 2 * padding) /
          Math.max(1, b.right - b.left),
        (size.y - 2 * padding) /
          Math.max(1, b.bottom - b.top),
      ),
    ),
  );
export const fit =
  (
    points: readonly Point3[],
    size: Point,
    padding: number,
  ) =>
  (camera: Camera): Option<Camera> =>
    points.length === 0
      ? none()
      : some(
          fitted(
            camera,
            size,
            padding,
            extent(
              points.map(
                project({
                  ...camera,
                  origin: { x: 0, y: 0 },
                  scale: 1,
                }),
              ),
            ),
          ),
        );

/** Project world-space anchors in painter's order. The target can draw
 * billboards, text or symbols without owning any camera mathematics. */
export const projectLayer =
  <T>(
    camera: Camera,
    position: (item: T) => Point3,
  ) =>
  (items: readonly T[]) =>
    items
      .map((item) => ({
        item,
        point: project(camera)(position(item)),
      }))
      .sort((a, b) => a.point.z - b.point.z);

/** Draw a world-space wireframe into a caller-supplied line backend. */
export const drawWireframe =
  (
    camera: Camera,
    line: (from: Point, to: Point) => void,
  ) =>
  (strokes: readonly Stroke[]): void =>
    strokes
      .map(projectStroke(camera))
      .sort(
        (a, b) =>
          a.from.z + a.to.z - (b.from.z + b.to.z),
      )
      .forEach((s) => line(s.from, s.to));

/** Signed eye-to-plane distance scaled by inverse focal length. For an
 * orthographic camera the sign is the viewing direction's normal component. */
export const facingXYPlane = (
  camera: Camera,
  z: number,
): number =>
  Math.cos(camera.yaw) * Math.cos(camera.pitch) -
  (z * strength(camera)) / 1000;

/** Inverse projection on a plane parallel to the screen at camera depth z. */
const deepenedBy = (
  camera: Camera,
  xy: Point3,
  depth: number,
): Point3 => ({
  x:
    xy.x -
    depth *
      Math.sin(camera.yaw) *
      Math.cos(camera.pitch),
  y: xy.y + depth * Math.sin(camera.pitch),
  z:
    xy.z +
    depth *
      Math.cos(camera.yaw) *
      Math.cos(camera.pitch),
});
export const unproject = (
  camera: Camera,
  screen: Point,
  depth: number,
): Point3 =>
  deepenedBy(
    camera,
    worldDelta(
      camera,
      {
        x: screen.x - camera.origin.x,
        y: screen.y - camera.origin.y,
      },
      depth,
    ),
    depth,
  );
const along = (
  a: Point3,
  b: Point3,
  t: number,
): Point3 => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});
const reached = (
  camera: Camera,
  a: Point3,
  b: Point3,
  t: number,
): Option<Point3> =>
  perspectiveOf(camera) * t >= 900
    ? none()
    : some(along(a, b, t));
const struck = (
  camera: Camera,
  axis: keyof Point3,
  coordinate: number,
  a: Point3,
  b: Point3,
): Option<Point3> =>
  Math.abs(b[axis] - a[axis]) < 1e-9
    ? none()
    : reached(
        camera,
        a,
        b,
        (coordinate - a[axis]) /
          (b[axis] - a[axis]),
      );
/** Intersection of a screen ray with a world-aligned construction plane. */
export const pickPlane = (
  camera: Camera,
  screen: Point,
  axis: keyof Point3,
  coordinate: number,
): Option<Point3> =>
  struck(
    camera,
    axis,
    coordinate,
    unproject(camera, screen, 0),
    unproject(camera, screen, 1),
  );
const panned = (
  next: Camera,
  a: Point3,
  b: Point3,
): Camera => pan(a.x - b.x, a.y - b.y)(next);
export const orbitAround = (
  pivot: Point3,
  camera: Camera,
  next: Camera,
): Camera =>
  panned(
    next,
    project(camera)(pivot),
    project(next)(pivot),
  );

export * from "plgg-board/scene";
export * from "plgg-board/drawing";
export { render } from "plgg-board/engine";
export type {
  Bounds,
  Interval,
} from "plgg-board/visibility";
export {
  toSvg,
  strokePath,
} from "plgg-board/svg";
export {
  coveredFractions,
  crossesFill,
} from "plgg-board/coverage";
