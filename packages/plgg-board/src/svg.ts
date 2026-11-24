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
  const gaps = marks.filter(
    (m) => m.kind === "gap",
  );
  const batches: {
    id: string;
    style: string;
    kind: string;
    d: string;
  }[] = [];
  for (const [index, s] of strokes.entries()) {
    const [a, b] = s.points,
      dx = b.x - a.x,
      dy = b.y - a.y,
      length = Math.hypot(dx, dy);
    const cuts =
      s.kind === "line"
        ? gaps
            .filter(
              (g) =>
                g.strokeIndex === index &&
                Math.abs(
                  dx * (g.point.y - a.y) -
                    dy * (g.point.x - a.x),
                ) <
                  1e-6 * length,
            )
            .map(
              (g) =>
                ((g.point.x - a.x) * dx +
                  (g.point.y - a.y) * dy) /
                (length * length),
            )
            .filter((t) => t > 0 && t < 1)
            .sort((a, b) => a - b)
        : [];
    let d = "",
      cursor = 0;
    for (const t of cuts) {
      const start = t - 2 / length;
      if (start > cursor)
        d += path([
          mix(a, b, cursor),
          mix(a, b, start),
        ]);
      cursor = Math.max(cursor, t + 2 / length);
    }
    if (cursor < 1)
      d += path([mix(a, b, cursor), b]);
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
