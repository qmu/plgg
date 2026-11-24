import type { Point } from "plgg-board/index";
import type { Drawing } from "plgg-board/drawing";
import { mix } from "plgg-board/geometry";
import { bounds } from "plgg-board/visibility";
const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const path = (points: readonly Point[]) =>
  "M" +
  points.map((p) => p.x + " " + p.y).join("L");
/** SVG centrelines with the engine's crossing gaps cut from the farther stroke. */
export const strokePath = (drawing: Drawing) => {
  const gaps = new Map<number, Point[]>();
  for (const m of drawing.marks)
    if (m.strokeIndex !== undefined) {
      const points =
        gaps.get(m.strokeIndex) ?? [];
      points.push(m.point);
      gaps.set(m.strokeIndex, points);
    }
  return (index: number) => {
    const s = drawing.strokes[index]!;
    const cuts = gaps.get(index);
    if (!cuts) return path(s.points);
    const [a, b] = s.points,
      len = Math.hypot(b.x - a.x, b.y - a.y);
    let d = "",
      cursor = 0;
    for (const t of cuts
      .map(
        (p) =>
          Math.hypot(p.x - a.x, p.y - a.y) / len,
      )
      .sort((a, b) => a - b)) {
      const start = t - 2 / len;
      if (start > cursor)
        d += path([
          mix(a, b, cursor),
          mix(a, b, start),
        ]);
      cursor = Math.max(cursor, t + 2 / len);
    }
    if (cursor < 1)
      d += path([mix(a, b, cursor), b]);
    return d;
  };
};
export const toSvg = (
  drawing: Drawing,
  styles: Readonly<Record<string, string>> = {},
) => {
  const {
    fills,
    strokes,
    shadows,
    marks,
    labels,
  } = drawing;
  const paths: string[] = [];
  const shape = (
    id: string,
    style: string,
    kind: string,
    d: string,
  ) =>
    '<path data-id="' +
    escape(id) +
    '" class="' +
    escape(style + " " + kind) +
    '" d="' +
    d +
    '"/>';
  for (const f of fills)
    paths.push(
      shape(
        f.id,
        f.style,
        f.tone,
        path(f.points) + "Z",
      ),
    );
  for (const s of shadows)
    paths.push(
      shape(
        s.id,
        s.style,
        "shadow",
        path(s.points) + "Z",
      ),
    );
  const stroke = strokePath(drawing);
  const batches: {
    id: string;
    style: string;
    kind: string;
    d: string;
  }[] = [];
  for (const [index, s] of strokes.entries()) {
    const d = stroke(index);
    const last = batches[batches.length - 1];
    if (
      last &&
      last.id === s.id &&
      last.style === s.style &&
      last.kind === s.kind
    )
      last.d += d;
    else
      batches.push({
        id: s.id,
        style: s.style,
        kind: s.kind,
        d,
      });
  }
  for (const b of batches)
    paths.push(shape(b.id, b.style, b.kind, b.d));
  for (const m of marks)
    if (!m.covered && m.kind !== "gap")
      paths.push(
        '<circle data-id="' +
          escape(m.id) +
          '" class="' +
          escape(m.style + " " + m.kind) +
          '" transform="matrix(' +
          m.matrix.join(" ") +
          ')" r="2"/>',
      );
  for (const l of labels)
    paths.push(
      '<text data-id="' +
        escape(l.id) +
        '" class="' +
        escape(
          l.style +
            (l.covered ? " covered" : " visible"),
        ) +
        '" transform="matrix(' +
        l.matrix.join(" ") +
        ')">' +
        escape(l.text) +
        "</text>",
    );
  const box = bounds([
    ...fills.flatMap((f) => f.points),
    ...strokes.flatMap((s) => s.points),
    ...marks.map((m) => m.point),
    ...labels.flatMap((l) => [
      { x: l.box.left, y: l.box.top },
      { x: l.box.right, y: l.box.bottom },
    ]),
  ]);
  const view = Number.isFinite(box.left)
    ? [
        box.left - 3,
        box.top - 3,
        box.right - box.left + 6,
        box.bottom - box.top + 6,
      ]
    : [0, 0, 1, 1];
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
    view.join(" ") +
    '"><style>' +
    escape(
      Object.entries(styles)
        .map(
          ([name, css]) =>
            "." + name + "{" + css + "}",
        )
        .join(""),
    ) +
    "</style>" +
    paths.join("") +
    "</svg>"
  );
};
