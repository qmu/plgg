import type { Flow } from "plgg-flow";

export type Travel =
  | "first"
  | "back"
  | "next"
  | "last";
export type History<T> = Readonly<{
  opening: T;
  before: readonly T[];
  after: readonly T[];
}>;
export const history = <T>(
  opening: T,
): History<T> => ({
  opening,
  before: [],
  after: [],
});
export const record = <T>(
  h: History<T>,
  previous: T,
): History<T> => ({
  opening: h.opening,
  before: [...h.before, previous],
  after: [],
});
export const travel = <T>(
  h: History<T>,
  current: T,
  way: Travel,
) => {
  const forward =
    way === "next" || way === "last";
  const stack = forward ? h.after : h.before;
  const count =
    way === "first" || way === "last"
      ? stack.length
      : Math.min(1, stack.length);
  if (!count) return { history: h, current };
  const at = stack.length - count;
  const passed = [
    current,
    ...stack.slice(at + 1).reverse(),
  ];
  return {
    current:
      way === "first" ? h.opening : stack[at]!,
    history: forward
      ? {
          ...h,
          before: [...h.before, ...passed],
          after: stack.slice(0, at),
        }
      : {
          ...h,
          after: [...h.after, ...passed],
          before: stack.slice(0, at),
        },
  };
};
export const sheetEdited = (a: Flow, b: Flow) =>
  a.nodes !== b.nodes ||
  a.edges !== b.edges ||
  a.snap !== b.snap ||
  a.rooms !== b.rooms ||
  a.layered !== b.layered ||
  a.marks !== b.marks ||
  a.bookmarks !== b.bookmarks ||
  a.sets !== b.sets ||
  a.spatial !== b.spatial;
