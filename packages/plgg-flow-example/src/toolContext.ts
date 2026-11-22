import type { NodeTemplate } from "plgg-flow/interchange";
import { none, type Option } from "plgg";
import {
  selectNodes,
  selectedNodes,
  type Flow,
  type Graph,
} from "plgg-flow";
export type ToolState = Readonly<{
  layoutPreview?: Readonly<{
    source: Graph;
    proposed: Graph;
    name: string;
  }>;
  presets: readonly ToolPreset[];
  favorites: readonly string[];
  templates: ReadonlyMap<string, NodeTemplate>;
  command: string;
  query: string;
  argument: string;
  document: string;
  fragment: Option<Graph>;
  baseline: Option<Graph>;
  report: string;
}>;
type ToolPreset = Readonly<{
  command: string;
  argument: string;
}>;
const presetKey = "plgg-flow.argument-presets";
const readPresets = (): readonly ToolPreset[] => {
  try {
    const list: unknown = JSON.parse(
      localStorage.getItem(presetKey) ?? "[]",
    );
    return Array.isArray(list)
      ? list.filter(
          (p): p is ToolPreset =>
            p !== null &&
            typeof p === "object" &&
            typeof p.command === "string" &&
            typeof p.argument === "string",
        )
      : [];
  } catch {
    return [];
  }
};
export const togglePreset = (
  presets: readonly ToolPreset[],
  command: string,
  argument: string,
) => {
  const keep = presets.filter(
    (p) =>
      p.command !== command ||
      p.argument !== argument,
  );
  const next =
    keep.length === presets.length
      ? [...keep, { command, argument }]
      : keep;
  try {
    localStorage.setItem(
      presetKey,
      JSON.stringify(next),
    );
  } catch {
    /* The current session still retains the preset. */
  }
  return next;
};
const favoritesKey = "plgg-flow.favorite-tools";
const readFavorites = (): readonly string[] => {
  try {
    const stored: unknown = JSON.parse(
      localStorage.getItem(favoritesKey) ?? "[]",
    );
    return Array.isArray(stored)
      ? [
          ...new Set(
            stored.filter(
              (id): id is string =>
                typeof id === "string",
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
};
export const toggleFavorite = (
  ids: readonly string[],
  id: string,
): readonly string[] => {
  const next = ids.includes(id)
    ? ids.filter((item) => item !== id)
    : [...ids, id];
  try {
    localStorage.setItem(
      favoritesKey,
      JSON.stringify(next),
    );
  } catch {
    /* Keep favorites for this session when storage is unavailable. */
  }
  return next;
};
export const toolState = (): ToolState => ({
  presets: readPresets(),
  favorites: readFavorites(),
  templates: new Map(),
  command: "find",
  query: "",
  argument: "",
  document: "",
  fragment: none(),
  baseline: none(),
  report: "",
});
export type ToolContext = Readonly<{
  flow: Flow;
  tools: ToolState;
}>;
export type ToolEdit = (
  context: ToolContext,
) => ToolContext;
export type Command = Readonly<{
  id: string;
  name: string;
  section: string;
  argument?: string;
  document?: boolean;
  table?: (context: ToolContext) => Readonly<{
    headers: readonly string[];
    rows: readonly (readonly string[])[];
  }>;
  run: ToolEdit;
}>;
export const info = (
  c: ToolContext,
  report: string,
): ToolContext => ({
  ...c,
  tools: { ...c.tools, report },
});
export const apply = (
  c: ToolContext,
  g: Graph,
): ToolContext =>
  info(
    { ...c, flow: { ...c.flow, ...g } },
    g === c.flow ? "変更なし" : "適用しました",
  );
export const choose = (
  c: ToolContext,
  ids: readonly string[],
): ToolContext =>
  info(
    { ...c, flow: selectNodes(ids)(c.flow) },
    ids.length + " 件を選択",
  );
export const ids = (c: ToolContext) =>
  selectedNodes(c.flow);
export const graphCommand = (
  id: string,
  name: string,
  section: string,
  min: number,
  fn: (
    g: Graph,
    ids: readonly string[],
    arg: string,
  ) => Graph,
  argument?: string,
): Command => ({
  id,
  name,
  section,
  ...(argument ? { argument } : {}),
  run: (c) =>
    ids(c).length < min
      ? info(
          c,
          min + " 個以上のノードを選んでください",
        )
      : apply(
          c,
          fn(c.flow, ids(c), c.tools.argument),
        ),
});
