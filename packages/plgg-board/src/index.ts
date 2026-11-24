import { none, some, type Option } from "plgg";

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

export const zoomAt =
  (anchor: Point, factor: number) =>
  (camera: Camera): Camera => {
    const scale = Math.min(
      5,
      Math.max(0.1, camera.scale * factor),
    );
    const ratio = scale / camera.scale;
    return {
      ...camera,
      scale,
      origin: {
        x:
          anchor.x +
          (camera.origin.x - anchor.x) * ratio,
        y:
          anchor.y +
          (camera.origin.y - anchor.y) * ratio,
      },
    };
  };

/** Focal distance in world units. Bound the near-plane denominator so
 * interactive drags through the eye never produce an inverted glyph. */
export const projectedScale = (
  camera: Camera,
  depth: number,
): number =>
  (camera.scale * 1000) /
  Math.max(
    100,
    1000 -
      depth *
        Math.min(
          1,
          Math.max(
            0,
            Number(camera.perspective ?? 0),
          ),
        ),
  );

export const project =
  (camera: Camera) =>
  (p: Point3): Point3 => {
    const c = Math.cos(camera.yaw),
      s = Math.sin(camera.yaw);
    const cp = Math.cos(camera.pitch),
      sp = Math.sin(camera.pitch);
    const depth = -s * p.x + c * p.z;
    const z = sp * p.y + cp * depth;
    const scale = projectedScale(camera, z);
    return {
      x:
        camera.origin.x +
        scale * (c * p.x + s * p.z),
      y:
        camera.origin.y +
        scale * (cp * p.y - sp * depth),
      z,
    };
  };

/** Inverse camera rotation for dragging parallel to the screen. */
export const worldDelta = (
  camera: Camera,
  delta: Point,
  depth = 0,
): Point3 => {
  const x =
      delta.x / projectedScale(camera, depth),
    y = delta.y / projectedScale(camera, depth);
  return {
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
  };
};

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

export const fit =
  (
    points: readonly Point3[],
    size: Point,
    padding: number,
  ) =>
  (camera: Camera): Option<Camera> => {
    if (!points.length) return none();
    const unit = {
      ...camera,
      origin: { x: 0, y: 0 },
      scale: 1,
    };
    const bounds = points
      .map(project(unit))
      .reduce(
        (b, p) => ({
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
    const scale = Math.max(
      0.1,
      Math.min(
        5,
        (size.x - 2 * padding) /
          Math.max(1, bounds.right - bounds.left),
        (size.y - 2 * padding) /
          Math.max(1, bounds.bottom - bounds.top),
      ),
    );
    return some({
      ...camera,
      scale,
      origin: {
        x:
          (size.x -
            scale *
              (bounds.left + bounds.right)) /
          2,
        y:
          (size.y -
            scale *
              (bounds.top + bounds.bottom)) /
          2,
      },
    });
  };

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
  (z *
    Math.min(
      1,
      Math.max(
        0,
        Number(camera.perspective ?? 0),
      ),
    )) /
    1000;

/** Inverse projection on a plane parallel to the screen at camera depth z. */
export const unproject = (
  camera: Camera,
  screen: Point,
  depth: number,
): Point3 => {
  const xy = worldDelta(
    camera,
    {
      x: screen.x - camera.origin.x,
      y: screen.y - camera.origin.y,
    },
    depth,
  );
  return {
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
  };
};
/** Intersection of a screen ray with a world-aligned construction plane. */
export const pickPlane = (
  camera: Camera,
  screen: Point,
  axis: keyof Point3,
  coordinate: number,
): Option<Point3> => {
  const a = unproject(camera, screen, 0),
    b = unproject(camera, screen, 1),
    delta = b[axis] - a[axis];
  if (Math.abs(delta) < 1e-9) return none();
  const t = (coordinate - a[axis]) / delta;
  if (Number(camera.perspective ?? 0) * t >= 900)
    return none();
  return some({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  });
};
export const orbitAround = (
  pivot: Point3,
  camera: Camera,
  next: Camera,
): Camera => {
  const a = project(camera)(pivot),
    b = project(next)(pivot);
  return pan(a.x - b.x, a.y - b.y)(next);
};

export * from "plgg-board/scene";
export * from "plgg-board/drawing";
export { render } from "plgg-board/engine";
export { toSvg } from "plgg-board/svg";
