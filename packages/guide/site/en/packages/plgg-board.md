# plgg-board — Project coordinates onto a drawing

Create a front-facing camera with `frontCamera`. Pass a point to `project(camera)` to obtain drawing coordinates. Use `orbit` to rotate the view and `pan` to shift it. These calculations run independently of the DOM and are used in [plgg-flow diagrams](https://plgg-flow.qmu.co.jp/en/).

```ts
import { frontCamera, project } from "plgg-board";

const camera = frontCamera({ x: 0, y: 0 });
console.log(project(camera)({ x: 20, y: 10, z: 0 }));
```
