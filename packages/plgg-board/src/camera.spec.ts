import { test, check, toBe } from "plgg-test";
import {
  frontCamera,
  orbit,
  project,
  worldDelta,
  drawWireframe,
  type Point,
} from "plgg-board/index";
test("screen-plane drag round-trips through an oblique camera", () => {
  const camera = {
    ...orbit(
      0.8,
      -0.6,
    )(frontCamera({ x: 14, y: 32 })),
    scale: 2,
  };
  const delta = project(camera)(
    worldDelta(camera, { x: 15, y: -23 }),
  );
  return check(
    Math.abs(delta.x - 29) +
      Math.abs(delta.y - 9) +
      Math.abs(delta.z) <
      1e-9,
    toBe(true),
  );
});
test("wireframe backend receives far strokes first", () => {
  const commands: Point[] = [];
  const points = [
    { x: 10, y: 0, z: 6 },
    { x: 20, y: 0, z: -6 },
  ];
  drawWireframe(
    frontCamera({ x: 0, y: 0 }),
    (p) => commands.push(p),
  )(points.map((p) => ({ from: p, to: p })));
  return check(
    commands.map((p) => p.x).join(","),
    toBe("20,10"),
  );
});

test("perspective changes apparent size with depth and preserves screen drag distance", () => {
  const camera = {
    ...frontCamera({ x: 0, y: 0 }),
    perspective: true,
  };
  const near = project(camera)({
    x: 100,
    y: 0,
    z: 200,
  });
  const far = project(camera)({
    x: 100,
    y: 0,
    z: -200,
  });
  const drag = worldDelta(
    camera,
    { x: 20, y: 0 },
    200,
  );
  const moved = project(camera)({
    x: 100 + drag.x,
    y: drag.y,
    z: 200 + drag.z,
  });
  return check(
    near.x > far.x &&
      Math.abs(moved.x - near.x - 20) < 1e-9,
    toBe(true),
  );
});
