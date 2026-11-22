import {
  pan,
  zoomAt,
  type Camera,
  type Point,
} from "plgg-board";
export type Contact = Readonly<{
  id: number;
  point: Point;
}>;
export type Pinch = readonly [Contact, Contact];
export const midpoint = ([
  a,
  b,
]: Pinch): Point => ({
  x: (a.point.x + b.point.x) / 2,
  y: (a.point.y + b.point.y) / 2,
});
export const distance = ([a, b]: Pinch) =>
  Math.hypot(
    a.point.x - b.point.x,
    a.point.y - b.point.y,
  );
/** The world point under the previous midpoint follows the fingers.
 * The first non-zero span establishes a baseline when contacts coincide. */
export const pinchCamera = (
  camera: Camera,
  previous: Pinch,
  next: Pinch,
): Camera => {
  const a = midpoint(previous),
    b = midpoint(next),
    before = distance(previous),
    after = distance(next);
  return pan(
    b.x - a.x,
    b.y - a.y,
  )(
    zoomAt(
      a,
      before && after ? after / before : 1,
    )(camera),
  );
};
