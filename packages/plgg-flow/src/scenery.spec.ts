import { test, check, toBe } from "plgg-test";
import { some } from "plgg";
import { renderToString } from "plgg-view";
import {
  createFlow,
  movePointer,
  selectNodes,
  type Drag,
} from "plgg-flow/model";
import { drawFlow } from "plgg-flow/viewport";
const p = { x: 0, y: 0, z: 0 };
test("ordinary sheets paint scenery around the graph", () => {
  const q = { ...p, x: 25 },
    r = { ...q, y: 25 },
    s = { ...p, y: 25 };
  const html = renderToString(
    drawFlow({
      ...createFlow({
        nodes: [
          { id: "n", label: "N", position: p },
        ],
        edges: [],
      }),
      scenery: [
        {
          kind: "plane",
          layer: "behind",
          points: [p, q, r, s],
          fill: "pink",
          opacity: 0.45,
          tone: "red",
        },
        {
          kind: "line",
          layer: "sorted",
          points: [p, r],
          dotted: true,
          tone: "orange",
        },
        {
          kind: "label",
          layer: "front",
          anchor: r,
          offset: { x: 1, y: 2 },
          text: "End mark",
          size: 9,
          weight: 400,
          tone: "blue",
        },
      ],
    }),
  );
  return check(
    html.includes("fill:pink") &&
      html.indexOf("fill:pink") <
        html.indexOf("data-node=") &&
      html.includes("stroke:orange") &&
      html.indexOf("End mark") >
        html.indexOf("data-node="),
    toBe(true),
  );
});
test("a standard drag respects a flat confinement box", () => {
  const flow = selectNodes(["n"])(
    createFlow({
      nodes: [
        {
          id: "n",
          label: "N",
          position: p,
          within: {
            min: p,
            max: { x: 15, y: 20, z: 0 },
          },
        },
      ],
      edges: [],
    }),
  );
  const moved = movePointer(
    { x: 100, y: 100 },
    1,
  )({
    ...flow,
    drag: some<Drag>({
      mode: "node",
      node: "n",
      pointer: 1,
      last: p,
    }),
  }).nodes[0]!.position;
  return check(
    moved.x === 15 &&
      moved.y === 20 &&
      moved.z === 0,
    toBe(true),
  );
});
