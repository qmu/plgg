import { test, check, toBe } from "plgg-test";
import {
  render,
  coveredFractions,
  pick,
  toSvg,
  frontCamera,
  box,
  quad,
  type Scene,
  type Point3,
} from "plgg-board/index";
const p = (
  x: number,
  y: number,
  z: number,
): Point3 => ({ x, y, z });
const scene: Scene = {
  solids: [],
  sheets: [],
  lines: [],
  marks: [],
  labels: [],
};
const camera = frontCamera({ x: 0, y: 0 });
const light = { direction: p(1, 0, -1) };
const sheet = (id: string, tilt: number) =>
  quad(
    p(-8, -8, -tilt),
    p(8, -8, tilt),
    p(8, 8, tilt),
    p(-8, 8, -tilt),
    { id, style: id, receives: true },
  );
test("intersecting sheets exchange depth across the cut", () => {
  const d = render(
    {
      ...scene,
      sheets: [sheet("a", 4), sheet("b", -4)],
    },
    camera,
    light,
  );
  return check(
    [
      pick(d, p(-3, 0, 0)),
      pick(d, p(3, 0, 0)),
      d.fills.length,
    ].join(),
    toBe("b,a,3"),
  );
});
test("a wire enters and leaves the silhouette at exact screen coordinates", () => {
  const d = render(
    {
      ...scene,
      solids: [box(p(0, 0, 0), p(4, 4, 4))],
      lines: [
        {
          id: "wire",
          style: "ink",
          points: [p(-5, 0, -4), p(5, 0, -4)],
        },
      ],
    },
    camera,
    light,
  );
  return check(
    d.strokes
      .filter((s) => s.id === "wire")
      .map((s) =>
        [
          s.kind,
          ...s.points.map((p) => p.x),
        ].join(),
      )
      .join("|"),
    toBe("line,-5,-2|hidden,-2,2|line,2,5"),
  );
});
test("piercings, crossings and lying text carry plane geometry", () => {
  const axes = { u: p(2, 1, 0), v: p(-1, 2, 0) };
  const d = render(
    {
      ...scene,
      sheets: [sheet("paper", 0)],
      lines: [
        {
          id: "through",
          style: "ink",
          points: [p(-6, 0, -2), p(6, 0, 2)],
        },
        {
          id: "over",
          style: "ink",
          points: [p(3, -5, 3), p(3, 5, 3)],
        },
      ],
      labels: [
        {
          id: "text",
          style: "ink",
          point: p(0, 0, -1),
          text: "A&B",
          axes,
          size: { x: 4, y: 2 },
        },
      ],
    },
    camera,
    light,
  );
  const hole = d.marks.find(
      (m) => m.kind === "hole",
    ),
    gap = d.marks.find((m) => m.kind === "gap"),
    label = d.labels[0];
  return check(
    [
      hole?.point.x,
      gap?.id,
      gap?.point.x,
      label?.covered,
      label?.matrix.join(),
      label?.box.right,
      toSvg(d).includes("A&amp;B"),
    ].join("|"),
    toBe("0|through|3|true|2,1,-1,2,0,0|10|true"),
  );
});
test("shadow stops at receiver boundary and nearer occluder", () => {
  const d = render(
    {
      ...scene,
      sheets: [
        sheet("paper", 0),
        quad(
          p(3, -8, 1),
          p(5, -8, 1),
          p(5, 8, 1),
          p(3, 8, 1),
          { id: "mask", style: "mask" },
        ),
      ],
      solids: [
        box(p(4, 0, 3), p(6, 4, 2), {
          id: "caster",
          style: "ink",
          casts: true,
        }),
      ],
    },
    camera,
    light,
  );
  return check(
    d.shadows.length > 0 &&
      d.shadows.every(
        (s) =>
          s.receiver === "paper" &&
          s.points.every(
            (q) =>
              q.x >= 5 - 1e-7 && q.x <= 8 + 1e-7,
          ),
      ),
    toBe(true),
  );
});
test("moving one solid preserves the prior drawing and updates picking", () => {
  const fixed = box(p(-12, 0, 0), p(4, 4, 4), {
    id: "fixed",
    style: "ink",
  });
  const initial = {
    ...scene,
    solids: [fixed, box(p(5, 0, 0), p(4, 4, 4))],
  };
  const first = render(initial, camera, light);
  const next = render(
    {
      ...initial,
      solids: [
        fixed,
        box(p(15, 0, 0), p(4, 4, 4)),
      ],
    },
    camera,
    light,
  );
  return check(
    [
      pick(first, p(5, 0, 0)),
      pick(next, p(5, 0, 0)),
      pick(next, p(15, 0, 0)),
      pick(next, p(-12, 0, 0)),
    ].join(),
    toBe("box,,box,fixed"),
  );
});
test("perspective wire meets a sheet at its projected world intersection", () => {
  const d = render(
    {
      ...scene,
      sheets: [sheet("sheet", 0)],
      lines: [
        {
          id: "wire",
          style: "ink",
          points: [p(-4, 0, -250), p(4, 0, 250)],
        },
      ],
    },
    { ...camera, perspective: true },
    light,
  );
  const visible = d.strokes.find(
    (s) => s.id === "wire" && s.kind === "line",
  );
  return check(
    !!visible &&
      Math.abs(visible.points[0].x) < 1e-7 &&
      visible.points[1].x > 5,
    toBe(true),
  );
});

test("a line crossing a closed solid has two holes and a hidden interior", () => {
  const d = render(
    {
      ...scene,
      solids: [box(p(0, 0, 0), p(8, 4, 6))],
      lines: [
        {
          id: "drop",
          style: "ink",
          points: [p(-9, 0, 0), p(9, 0, 0)],
        },
      ],
    },
    camera,
    light,
  );
  const line = d.strokes.filter(
    (s) => s.id === "drop",
  );
  return check(
    [
      line.map((s) => s.kind).join(),
      line[1]?.points.map((q) => q.x).join(),
      d.marks
        .filter((m) => m.kind === "hole")
        .map((m) => m.point.x)
        .sort((a, b) => a - b)
        .join(),
    ].join("|"),
    toBe("line,hidden,line|-4,4|-4,4"),
  );
});
test("opaque solids interrupt board-hidden ink and suppress covered captions", () => {
  const d = render(
    {
      ...scene,
      solids: [
        box(p(0, 0, 0), p(4, 4, 4), {
          id: "node",
          style: "node",
          opaqueInk: true,
        }),
      ],
      sheets: [sheet("board", 0)],
      lines: [
        {
          id: "wire",
          style: "wire",
          points: [p(-12, 0, -5), p(12, 0, -5)],
        },
      ],
      labels: [
        {
          id: "behind",
          style: "caption",
          point: p(0, 0, -5),
          text: "behind",
        },
      ],
    },
    camera,
    light,
  );
  return check(
    d.labels.length === 0 &&
      d.strokes
        .filter(
          (s) =>
            s.id === "wire" &&
            s.kind === "hidden",
        )
        .map((s) =>
          s.points.map((q) => q.x).join(),
        )
        .join("|") === "-8,-2|2,8",
    toBe(true),
  );
});
test("clear lettering leaves a two pixel margin in a crossing stroke", () => {
  const drawing = render(
    {
      ...scene,
      labels: [
        {
          id: "text",
          style: "caption",
          clear: true,
          point: p(0, 0, 0),
          text: "X",
          size: { x: 8, y: 12 },
        },
      ],
      lines: [
        {
          id: "wire",
          style: "ink",
          points: [p(-12, -4, 4), p(20, -4, 4)],
        },
      ],
    },
    camera,
    light,
  );
  return check(
    drawing.strokes
      .map((s) => s.points.map((q) => q.x).join())
      .join("|") === "-12,-2|10,20",
    toBe(true),
  );
});

test("two aligned solids cover half of the rear silhouette", () => {
  const d = render(
    {
      ...scene,
      solids: [
        box(p(0, 0, 0), p(20, 20, 2), {
          id: "rear",
          style: "node",
        }),
        box(p(10, 0, 8), p(20, 20, 2), {
          id: "front",
          style: "node",
        }),
      ],
    },
    camera,
    light,
  );
  const coverage = coveredFractions(d);
  return check(
    coverage.find((f) => f.id === "rear")
      ?.fraction === 0.5 &&
      coverage.find((f) => f.id === "front")
        ?.fraction === 0,
    toBe(true),
  );
});
