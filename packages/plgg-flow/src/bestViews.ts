import {
  box,
  render,
  coveredFractions,
  crossesFill,
  slab,
  project,
  type Point,
  type Camera,
} from "plgg-board";
import type { Classification } from "./classify";
import { planSpace } from "plgg-flow/space";
import {
  roles,
  defaultView,
  type Role,
  type View,
} from "plgg-flow/spaceView";
import {
  nodeSize,
  labelWidth,
} from "plgg-flow/nodeSize";
import {
  bodyDepth,
  captionTagged,
  corners,
} from "plgg-flow/nodeBody";

export const bestViews = (
  data: Classification,
  frame: Point,
  fixed?: View,
  mark: readonly string[] = data.mark,
) => {
  const base = fixed ?? defaultView(data.axes);
  const views = [base];
  if (
    !fixed &&
    data.cells.some((c) => c.nodes.length)
  ) {
    // Rank role assignments by their rough footprint before routing the
    // finalists. Sparse cells, including pinned slices, retain their slots.
    const attributes = data.axes
      .slice(0, roles.length)
      .map((a) => a.attribute);
    const assign = (
      i: number,
      available: readonly Role[],
      view: View,
    ): View[] =>
      i === attributes.length
        ? [view]
        : available.flatMap((role) =>
            assign(
              i + 1,
              available.filter((r) => r !== role),
              { ...view, [role]: attributes[i]! },
            ),
          );
    const count = new Map(
      data.axes.map((a) => [
        a.attribute,
        a.values.length,
      ]),
    );
    const candidates = assign(0, roles, {
      pins: base.pins,
    })
      .map((view) => {
        const span = (
          r: (typeof roles)[number],
        ) => count.get(view[r] ?? "") ?? 1;
        const width =
          span("x") * span("column") * 144 +
          span("z") * span("row") * 80;
        const height =
          span("y") * 256 +
          span("z") * span("row") * 64;
        const score =
          Math.abs(
            Math.log(
              (width * frame.y) /
                (height * frame.x),
            ),
          ) -
          Number(
            /層|階|layer|tier|storey/i.test(
              view.y ?? "",
            ),
          ) *
            0.5;
        return { view, score };
      })
      .sort((a, b) => a.score - b.score);
    for (const { view } of candidates) {
      if (
        views.every((v) =>
          roles.some((r) => v[r] !== view[r]),
        )
      )
        views.push(view);
      if (views.length === 3) break;
    }
  }
  const ranked: {
    view: View;
    camera: Camera;
    score: number;
  }[] = [];
  for (const view of views) {
    const space = planSpace(data, view);
    const nodes = data.cells
      .flatMap((c) => c.nodes)
      .flatMap((n) => {
        const p = space.place(n);
        return p ? [{ ...n, position: p }] : [];
      });
    const solids = nodes.map((n) => {
      const { width, height } = nodeSize(n);
      return box(
        n.position,
        {
          x: width,
          y: height,
          z: 2 * bodyDepth(n),
        },
        {
          id: n.id,
          style: "node",
          opaqueInk: false,
        },
      );
    });
    const ids = new Set(nodes.map((n) => n.id));
    if (data.axes.length === 1 && view.y)
      for (const block of space.blocks)
        for (const cell of block.cells)
          solids.push(
            slab(
              {
                x: cell.min.x,
                z: cell.min.z,
                width: cell.max.x - cell.min.x,
                depth: cell.max.z - cell.min.z,
              },
              cell.max.y,
              6,
              {
                id: "board:" + cell.values[1],
                style: "board",
              },
            ),
          );
    const lines = data.edges.flatMap((e, i) => {
      const points = space.routes.get(e.id ?? i);
      return points
        ? [
            {
              id: e.source + " -> " + e.target,
              style: "wire",
              label: e.label,
              source: e.source,
              target: e.target,
              points,
            },
          ]
        : [];
    });
    const scene = {
      solids,
      lines,
      sheets: [],
      marks: [],
      labels: [],
    };
    const blockCorners = space.blocks.flatMap(
      (b) => corners(b.min, b.max),
    );
    const weight = (id: string) =>
      mark.includes(id) ? 3 : 1;
    for (const [yaw, pitch] of [
      [-0.52, -0.55],
      [0.22, -0.2],
      [0.22, -1.05],
      [1.3, -0.2],
    ] satisfies [number, number][]) {
      const camera = {
        yaw,
        pitch,
        scale: 1,
        origin: { x: 0, y: 0 },
        perspective: false,
      };
      const drawing = render(
        scene,
        camera,
        { direction: { x: 1, y: 0, z: -1 } },
        { deferLabelClear: true },
      );
      const at = project(camera);
      const bounds = [
        ...blockCorners.map(at),
        ...drawing.fills.flatMap((f) => f.points),
        ...drawing.strokes.flatMap(
          (s) => s.points,
        ),
      ];
      const xs = bounds.map((p) => p.x),
        ys = bounds.map((p) => p.y);
      const left = xs.length
          ? Math.min(...xs)
          : 0,
        top = ys.length ? Math.min(...ys) : 0;
      const width = Math.max(
          1,
          Math.max(...xs) - left,
        ),
        height = Math.max(
          1,
          Math.max(...ys) - top,
        );
      const scale = Math.min(
        frame.x / width,
        frame.y / height,
      );
      let score =
        1 -
        (width * height * scale * scale) /
          (frame.x * frame.y);
      for (const f of coveredFractions(drawing))
        if (ids.has(f.id))
          score += 5 * weight(f.id) * f.fraction;
      const crossings = new Set<string>();
      const fills = drawing.fills
        .filter((f) => f.style === "node")
        .map((f) => {
          const xs = f.points.map((p) => p.x),
            ys = f.points.map((p) => p.y);
          return {
            ...f,
            left: Math.min(...xs),
            right: Math.max(...xs),
            top: Math.min(...ys),
            bottom: Math.max(...ys),
          };
        });
      for (const [i, line] of lines.entries()) {
        const path = line.points.map(at);
        const a = path[0]!,
          b = path[path.length - 1]!;
        score +=
          weight(line.id) *
          (Number(b.x < a.x) + Number(b.y < a.y));
        for (const [j, end] of path.entries()) {
          if (!j) continue;
          const start = path[j - 1]!;
          const left = Math.min(start.x, end.x),
            right = Math.max(start.x, end.x),
            top = Math.min(start.y, end.y),
            bottom = Math.max(start.y, end.y);
          for (const f of fills) {
            if (
              left >= f.right ||
              right <= f.left ||
              top >= f.bottom ||
              bottom <= f.top
            )
              continue;
            if (
              line.source === f.id ||
              line.target === f.id
            )
              continue;
            if (
              crossesFill(
                path[j - 1]!,
                end,
                f.points,
              )
            ) {
              const key = i + " " + f.id;
              if (!crossings.has(key))
                score +=
                  3 *
                  Math.max(
                    weight(line.id),
                    weight(f.id),
                  );
              crossings.add(key);
            }
          }
        }
      }
      for (const m of drawing.marks)
        if (m.kind === "gap")
          score +=
            3 *
            Math.max(
              weight(m.id),
              weight(m.receiver ?? ""),
            );
      const tags = captionTagged(camera);
      const labels = nodes.map((n, i) => {
        const projected =
          solids[i]!.vertices.map(at);
        const centre = at({
          ...n.position,
          z: n.position.z + bodyDepth(n),
        });
        const w =
          labelWidth(n.label) *
          (tags
            ? 1
            : scale * Math.abs(Math.cos(yaw)));
        const h =
          16 *
          (tags
            ? 1
            : scale * Math.abs(Math.cos(pitch)));
        const y = tags
          ? Math.min(
              ...projected.map((p) => p.y),
            ) *
              scale -
            10 -
            h / 2
          : centre.y * scale;
        return {
          id: n.id,
          left: centre.x * scale - w / 2,
          right: centre.x * scale + w / 2,
          top: y - h / 2,
          bottom: y + h / 2,
        };
      });
      for (const line of lines) {
        if (!line.label) continue;
        const p = at(
          line.points[
            Math.floor(line.points.length / 2)
          ]!,
        );
        const half = labelWidth(line.label) / 2;
        labels.push({
          id: line.id,
          left: p.x * scale - half,
          right: p.x * scale + half,
          top: p.y * scale - 8,
          bottom: p.y * scale + 8,
        });
      }
      for (const [i, l] of labels.entries())
        for (const o of labels.slice(0, i))
          if (
            l.left < o.right &&
            o.left < l.right &&
            l.top < o.bottom &&
            o.top < l.bottom
          )
            score +=
              2 *
              Math.max(
                weight(l.id),
                weight(o.id),
              );
      ranked.push({
        view,
        score,
        camera: {
          ...camera,
          scale,
          origin: {
            x:
              (frame.x - width * scale) / 2 -
              left * scale,
            y:
              (frame.y - height * scale) / 2 -
              top * scale,
          },
        },
      });
    }
  }
  return ranked
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
};
