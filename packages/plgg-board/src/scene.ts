import type {
  Point,
  Point3,
} from "plgg-board/index";
export type Item = Readonly<{
  id: string;
  style: string;
  casts?: boolean;
  shadowReceiver?: string;
  receives?: boolean;
}>;
export type Solid = Item &
  Readonly<{
    vertices: readonly Point3[];
    faces: readonly (readonly number[])[];
    slab?: boolean;
  }>;
export type Line = Item &
  Readonly<{ points: readonly Point3[] }>;
export type Sheet = Line &
  Readonly<{ oneSided?: boolean }>;
export type PlaneAxes = Readonly<{
  u: Point3;
  v: Point3;
}>;
export type Mark = Item &
  Readonly<{ point: Point3; axes?: PlaneAxes }>;
export type Label = Mark &
  Readonly<{ text: string; size?: Point }>;
export type Scene = Readonly<{
  solids: readonly Solid[];
  sheets: readonly Sheet[];
  lines: readonly Line[];
  labels: readonly Label[];
  marks: readonly Mark[];
}>;
export type Light = Readonly<{
  direction: Point3;
}>;
export const box = (
  centre: Point3,
  size: Point3,
  item: Item = { id: "box", style: "box" },
): Solid => ({
  ...item,
  vertices: [-1, 1].flatMap((z) =>
    [-1, 1].flatMap((y) =>
      [-1, 1].map((x) => ({
        x: centre.x + (x * size.x) / 2,
        y: centre.y + (y * size.y) / 2,
        z: centre.z + (z * size.z) / 2,
      })),
    ),
  ),
  faces: [
    [0, 2, 3, 1],
    [4, 5, 7, 6],
    [0, 1, 5, 4],
    [2, 6, 7, 3],
    [0, 4, 6, 2],
    [1, 3, 7, 5],
  ],
});
export const slab = (
  rect: Readonly<{
    x: number;
    z: number;
    width: number;
    depth: number;
  }>,
  y: number,
  thickness: number,
  item: Item = { id: "slab", style: "slab" },
): Solid => ({
  ...box(
    {
      x: rect.x + rect.width / 2,
      y: y + thickness / 2,
      z: rect.z + rect.depth / 2,
    },
    {
      x: rect.width,
      y: thickness,
      z: rect.depth,
    },
    item,
  ),
  slab: true,
});
export const quad = (
  a: Point3,
  b: Point3,
  c: Point3,
  d: Point3,
  item: Item = { id: "quad", style: "quad" },
): Sheet => ({ ...item, points: [a, b, c, d] });
