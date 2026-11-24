import { roomViews } from "plgg-flow/roomCamera";
import { project } from "plgg-board";
import {
  projectNodeBody,
  portPosition,
  bodyDepth,
} from "plgg-flow/nodeBody";
import { test, check, toBe } from "plgg-test";
import { some } from "plgg";
import { engineView } from "plgg-flow/engineView";
import {
  wireGraph,
  type Side,
} from "plgg-flow/wiring";
import { renderToString, text } from "plgg-view";
import {
  orbitByDrag,
  settleOrbit,
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
test("captions switch between the front face and an upright tag with hysteresis", () => {
  const flow = createFlow({
    nodes: [
      {
        id: "caption",
        label: "Caption",
        position: p,
      },
    ],
    edges: [],
  });
  const draw = (yaw: number, pitch: number) =>
    renderToString(
      drawFlow({
        ...flow,
        camera: { ...flow.camera, yaw, pitch },
      }),
    );
  return check(
    [0, 0.9, 1.4].every((yaw) =>
      [0, 0.8, 1.3].every(
        (pitch) =>
          draw(yaw, pitch).includes(
            'data-node-caption="tag"',
          ) === (yaw !== 0 || pitch !== 0),
      ),
    ) &&
      draw(1.4, 0).includes(
        'data-node-caption="tag"',
      ) &&
      draw(Math.acos(0.72), 0).includes(
        'data-node-caption="tag"',
      ) &&
      !draw(Math.acos(0.76), 0).includes(
        'data-node-caption="tag"',
      ) &&
      !draw(Math.acos(0.72), 0).includes(
        'data-node-caption="tag"',
      ),
    toBe(true),
  );
});

test("front tags clear one another after every box at the side and top views", () => {
  const flow = createFlow({
    nodes: ["Near", "Far"].map((id) => ({
      id,
      label: id,
      position: p,
    })),
    edges: [],
  });
  return check(
    [
      [Math.PI / 2, 0],
      [-Math.PI / 2, 0],
      [0.22, -1.05],
    ].every(([yaw, pitch]) => {
      const html = renderToString(
        drawFlow({
          ...flow,
          camera: {
            ...flow.camera,
            yaw: yaw!,
            pitch: pitch!,
          },
        }),
      );
      const tags = html
        .split('data-node-caption="tag"')
        .slice(1);
      const heights = tags.map((tag) =>
        Number(
          tag.match(
            /translate\([^ ]+ ([^)]*)\)/,
          )?.[1],
        ),
      );
      return (
        tags.length === 2 &&
        html.lastIndexOf("data-node-face") <
          html.indexOf(
            'data-node-caption="tag"',
          ) &&
        Math.abs(heights[0]! - heights[1]!) >
          20 &&
        html.includes('class="leader"')
      );
    }),
    toBe(true),
  );
});
test("the rear caption reads left to right on the visible back", () => {
  const node = {
      id: "rear",
      label: "Rear",
      position: p,
    },
    flow = createFlow({
      nodes: [node],
      edges: [],
    });
  const body = projectNodeBody(node, {
    ...flow.camera,
    yaw: (5 * Math.PI) / 6,
  });
  return check(
    body.visible.some((f) => f.side === "back") &&
      !body.tagged &&
      Number(body.caption?.[0]) > 0,
    toBe(true),
  );
});
test("drag orbit centres the drawing in the uncovered frame and preserves manual zoom on release", () => {
  const flow = createFlow({
    nodes: [
      {
        id: "offset",
        label: "Offset",
        position: { x: 80, y: 100, z: 20 },
        width: 64,
        height: 32,
      },
    ],
    edges: [],
  });
  const rotated = orbitByDrag(
    100,
    20,
  )({
    ...flow,
    frame: { x: 500, y: 320 },
    cover: 180,
    scenery: [
      {
        kind: "line",
        layer: "behind",
        tone: "gray",
        points: [{ x: 800, y: 300, z: 60 }],
      },
    ],
  });
  const centre = project(rotated.camera)({
    x: (48 + 800) / 2,
    y: (84 + 300) / 2,
    z: (20 - bodyDepth(flow.nodes[0]!) + 60) / 2,
  });
  return check(
    Math.abs(centre.x - 160) < 1e-8 &&
      Math.abs(centre.y - 160) < 1e-8 &&
      settleOrbit(rotated).camera.scale <
        rotated.camera.scale &&
      settleOrbit({
        ...rotated,
        manualZoom: true,
      }).camera.scale === rotated.camera.scale,
    toBe(true),
  );
});

test("an opaque cover changes the same wire, outline and caption together", () => {
  const flow = createFlow({
    nodes: [
      {
        id: "a",
        label: "A",
        position: { x: -120, y: 0, z: 0 },
      },
      {
        id: "b",
        label: "B",
        position: { x: 120, y: 0, z: 0 },
      },
      { id: "c", label: "Covered", position: p },
    ],
    edges: [
      {
        source: "a",
        target: "b",
        path: [
          { x: -88, y: 0, z: 0 },
          { x: 88, y: 0, z: 0 },
        ],
      },
    ],
  });
  const scenery = [
    {
      kind: "plane",
      layer: "sorted",
      tone: "black",
      fill: "white",
      opacity: 1,
      points: [
        { x: -64, y: -32, z: 40 },
        { x: 64, y: -32, z: 40 },
        { x: 64, y: 32, z: 40 },
        { x: -64, y: 32, z: 40 },
      ],
    },
  ] satisfies NonNullable<typeof flow.scenery>;
  const draw = (hidden: "lines" | "none") =>
    renderToString(
      drawFlow({ ...flow, scenery, hidden }),
    );
  const lines = draw("lines"),
    opaque = draw("none");
  return check(
    [
      "wire hidden",
      "node hidden",
      "caption covered",
    ].every(
      (c) =>
        lines.includes('class="' + c + '"') &&
        !opaque.includes('class="' + c + '"'),
    ) && opaque.includes('class="wire line"'),
    toBe(true),
  );
});

test("wire tips and flank dots clear their caption in named and turned views", () => {
  const flow = selectNodes(["a", "b"])(
    createFlow({
      nodes: [
        { id: "a", label: "Orders", position: p },
        {
          id: "b",
          label: "Auth",
          position: { x: 320, y: 48, z: 80 },
        },
      ],
      edges: [{ source: "a", target: "b" }],
    }),
  );
  const wires = wireGraph(flow);
  const views = [
    ...roomViews.map(([, yaw, pitch]) => [
      yaw,
      pitch,
    ]),
    [0, 0],
    [Math.PI / 2, 0],
    [0, Math.PI / 2],
    [Math.PI, 0],
    ...Array.from({ length: 12 }, (_, i) => [
      (i * Math.PI) / 6,
      0.5 * Math.cos(i),
    ]),
  ];
  for (const [yaw, pitch] of views) {
    const camera = {
      ...flow.camera,
      yaw: yaw!,
      pitch: pitch!,
    };
    const { drawing } = engineView(
      { ...flow, camera },
      flow.nodes,
      flow.edges.map((edge) => ({
        edge,
        original: edge,
      })),
      wires,
      (n) => text(n.label),
    );
    for (const node of flow.nodes) {
      const caption = drawing.labels.find(
        (l) => l.id === "node:" + node.id,
      );
      if (!caption) continue;
      const sockets = (
        [
          "left",
          "right",
          "top",
          "bottom",
        ] satisfies Side[]
      ).map((side) =>
        portPosition(node, side, 0),
      );
      for (const world of [
        ...sockets,
        ...wires.flatMap((w) =>
          node.id === w.edge.source
            ? [w.source]
            : [w.target],
        ),
      ]) {
        const q = project(camera)(world),
          b = caption.box;
        if (
          q.x >= b.left &&
          q.x <= b.right &&
          q.y >= b.top &&
          q.y <= b.bottom
        )
          throw Error(
            "socket inside caption " +
              node.id +
              " at " +
              yaw +
              "," +
              pitch,
          );
      }
    }
  }
  return check(true, toBe(true));
});
