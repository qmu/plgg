import type { Graph } from "./model";
import { simplifyTrace } from "plgg-flow/polyline";
import { err, ok, type Result } from "plgg";
import type { Point3 } from "plgg-board";
export type Stroke = Readonly<{
  kind: "stroke";
  id: string;
  points: readonly Point3[];
}>;
export type Review = Readonly<{
  kind: "review";
  id: string;
  position: Point3;
  node?: string;
  messages: readonly string[];
  resolved: boolean;
  assignee?: string;
}>;
export type Mark = Stroke | Review;
export const markId = (
  marks: readonly Mark[],
  prefix: string,
) => {
  const used = new Set(marks.map((m) => m.id));
  let i = 1;
  while (used.has(prefix + i)) i++;
  return prefix + i;
};
export const annotate = (
  marks: readonly Mark[],
  position: Point3,
  message: string,
  node?: string,
): readonly Mark[] =>
  message.trim()
    ? [
        ...marks,
        {
          kind: "review",
          id: markId(marks, "note-"),
          position,
          messages: [message],
          resolved: false,
          ...(node ? { node } : {}),
        },
      ]
    : marks;
export const reply = (
  marks: readonly Mark[],
  id: string,
  message: string,
): readonly Mark[] =>
  marks.map((m) =>
    m.kind === "review" &&
    m.id === id &&
    message.trim()
      ? {
          ...m,
          messages: [...m.messages, message],
        }
      : m,
  );
export const assignReview = (
  marks: readonly Mark[],
  id: string,
  name: string,
): readonly Mark[] => {
  const assignee = name.trim();
  return marks.map((m) => {
    if (m.kind !== "review" || m.id !== id)
      return m;
    const { assignee: previous, ...rest } = m;
    return assignee
      ? { ...rest, assignee }
      : rest;
  });
};
export const resolve = (
  marks: readonly Mark[],
  id: string,
): readonly Mark[] =>
  marks.map((m) =>
    m.kind === "review" && m.id === id
      ? { ...m, resolved: !m.resolved }
      : m,
  );
const obj = (
  v: unknown,
): v is Record<string, unknown> =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v);
const point = (v: unknown): v is Point3 =>
  obj(v) &&
  [v.x, v.y, v.z].every(
    (x) =>
      typeof x === "number" && Number.isFinite(x),
  );
export const decodeMarks = (
  v: unknown,
): Result<readonly Mark[], string> => {
  if (!Array.isArray(v) || v.length > 10000)
    return err("Invalid annotations");
  const marks: Mark[] = [],
    used = new Set<string>();
  for (const raw of v) {
    if (
      !obj(raw) ||
      typeof raw.id !== "string" ||
      !raw.id ||
      used.has(raw.id)
    )
      return err("Invalid annotation identity");
    used.add(raw.id);
    if (
      raw.kind === "stroke" &&
      Array.isArray(raw.points) &&
      raw.points.length > 0 &&
      raw.points.length <= 16000 &&
      raw.points.every(point)
    ) {
      marks.push({
        kind: "stroke",
        id: raw.id,
        points: raw.points,
      });
    } else if (
      raw.kind === "review" &&
      point(raw.position) &&
      typeof raw.resolved === "boolean" &&
      (raw.assignee === undefined ||
        typeof raw.assignee === "string") &&
      (raw.node === undefined ||
        typeof raw.node === "string") &&
      Array.isArray(raw.messages) &&
      raw.messages.length > 0 &&
      raw.messages.every(
        (m) => typeof m === "string",
      )
    ) {
      marks.push({
        kind: "review",
        id: raw.id,
        position: raw.position,
        resolved: raw.resolved,
        ...(typeof raw.assignee === "string" &&
        raw.assignee.trim()
          ? { assignee: raw.assignee.trim() }
          : {}),
        messages: raw.messages,
        ...(typeof raw.node === "string"
          ? { node: raw.node }
          : {}),
      });
    } else return err("Invalid annotation");
  }
  return ok(marks);
};

export const simplifyInk = (
  marks: readonly Mark[],
  tolerance: number,
): readonly Mark[] =>
  marks.map((m) => {
    if (m.kind !== "stroke") return m;
    const points = simplifyTrace(
      m.points,
      tolerance,
    );
    return points === m.points
      ? m
      : { ...m, points };
  });

/** Retain the thread identity and history when moving its anchor. Detaching
 * freezes the pin at its current world position, including after a node move. */
export const reanchorReview = (
  graph: Graph,
  marks: readonly Mark[],
  id: string,
  target?: string,
): Result<readonly Mark[], string> => {
  const review = marks.find(
    (m) => m.id === id && m.kind === "review",
  );
  if (review?.kind !== "review")
    return err("レビューを選択してください");
  const anchor =
    target === undefined ? review.node : target;
  const node =
    anchor === undefined
      ? undefined
      : graph.nodes.find((n) => n.id === anchor);
  if (target !== undefined && !node)
    return err("移動先のカードがありません");
  const { node: previous, ...thread } = review;
  const next: Review = {
    ...thread,
    position: node?.position ?? review.position,
    ...(target === undefined
      ? {}
      : { node: target }),
  };
  return ok(
    marks.map((m) => (m === review ? next : m)),
  );
};

/** Store live anchor positions so a thread can also be read on a drawing
 * that does not contain its original card. */
export const exportReviews = (
  graph: Graph,
  marks: readonly Mark[],
): string => {
  const positions = new Map(
    graph.nodes.map((n) => [n.id, n.position]),
  );
  return JSON.stringify({
    format: "plgg-flow-reviews",
    version: 1,
    reviews: marks.flatMap((m) =>
      m.kind === "review"
        ? [
            {
              ...m,
              position:
                (m.node &&
                  positions.get(m.node)) ||
                m.position,
            },
          ]
        : [],
    ),
  });
};
export const importReviews = (
  graph: Graph,
  marks: readonly Mark[],
  source: string,
): Result<
  {
    marks: readonly Mark[];
    added: number;
    skipped: number;
  },
  string
> => {
  if (source.length > 8_000_000)
    return err("レビュー記録が大きすぎます");
  let doc: unknown;
  try {
    doc = JSON.parse(source);
  } catch {
    return err("レビュー記録の JSON が不正です");
  }
  if (
    !obj(doc) ||
    doc.format !== "plgg-flow-reviews" ||
    doc.version !== 1
  )
    return err("レビュー記録の形式が不正です");
  const decoded = decodeMarks(doc.reviews);
  if (decoded.__tag === "Err") return decoded;
  const used = new Set(marks.map((m) => m.id)),
    nodes = new Set(graph.nodes.map((n) => n.id)),
    added: Review[] = [];
  let skipped = 0;
  for (const m of decoded.content) {
    if (m.kind !== "review")
      return err(
        "レビュー以外の注釈が含まれています",
      );
    if (used.has(m.id)) {
      skipped++;
      continue;
    }
    const { node, ...free } = m;
    added.push(
      node !== undefined && !nodes.has(node)
        ? free
        : m,
    );
  }
  if (marks.length + added.length > 10000)
    return err("注釈数の上限を超えています");
  return ok({
    marks: [...marks, ...added],
    added: added.length,
    skipped,
  });
};

/** Review coverage counts leaf cards once regardless of how many discussions
 * they have. Group-level discussions also contribute to outstanding work. */
export const groupReviewCoverage = (
  graph: Graph,
  marks: readonly Mark[],
) => {
  const rows = new Map(
    graph.nodes.map((n) => [
      n.id,
      {
        id: n.id,
        cards: 0,
        reviewed: 0,
        open: 0,
        unassigned: 0,
      },
    ]),
  );
  const children = new Map<string, string[]>(),
    order: string[] = [];
  for (const n of graph.nodes) {
    if (
      n.parent === undefined ||
      !rows.has(n.parent)
    )
      order.push(n.id);
    else {
      const list = children.get(n.parent);
      if (list) list.push(n.id);
      else children.set(n.parent, [n.id]);
    }
  }
  const groups = new Set(
    graph.nodes
      .filter(
        (n) => n.group || children.has(n.id),
      )
      .map((n) => n.id),
  );
  for (const row of rows.values())
    if (!groups.has(row.id)) row.cards = 1;
  for (const mark of marks) {
    if (
      mark.kind !== "review" ||
      mark.node === undefined
    )
      continue;
    const row = rows.get(mark.node);
    if (!row) continue;
    row.reviewed = row.cards;
    if (!mark.resolved) {
      row.open++;
      if (!mark.assignee) row.unassigned++;
    }
  }
  const parent = new Map(
    graph.nodes.map((n) => [n.id, n.parent]),
  );
  for (let i = 0; i < order.length; i++)
    for (const id of children.get(order[i]!) ??
      [])
      order.push(id);
  for (let i = order.length - 1; i >= 0; i--) {
    const row = rows.get(order[i]!)!,
      p = parent.get(row.id),
      owner =
        p === undefined ? undefined : rows.get(p);
    if (owner) {
      owner.cards += row.cards;
      owner.reviewed += row.reviewed;
      owner.open += row.open;
      owner.unassigned += row.unassigned;
    }
  }
  return [...rows.values()].filter((r) =>
    groups.has(r.id),
  );
};
