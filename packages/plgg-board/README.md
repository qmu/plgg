# plgg-board

> Part of the [plgg monorepo](../../README.md).

Platform-independent 3D drawing and camera geometry. It has no DOM dependency;
[plgg-flow](../plgg-flow/README.md) draws its boards with it.

- `frontCamera`, `orbit`, `pan`, `zoomAt` — move the camera
- `project`, `projectedScale`, `worldDelta` — map world points to the screen and back
- `fit` — frame a set of points
- `projectStroke`, `projectLayer` — project drawn strokes and layers
