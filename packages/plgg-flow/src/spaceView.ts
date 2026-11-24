import type { Axis } from "./classify";
export const roles: readonly (
  | "x"
  | "y"
  | "z"
  | "column"
  | "row"
)[] = ["x", "y", "z", "column", "row"];
export type Role = (typeof roles)[number];
export type View = Partial<
  Record<Role, string>
> & { pins: Readonly<Record<string, string>> };
export const defaultView = (
  axes: readonly Axis[],
): View => {
  const pins: Record<string, string> = {};
  const view: View = { pins };
  axes.forEach((a, i) => {
    const role = roles[i];
    if (role) view[role] = a.attribute;
    else pins[a.attribute] = a.values[0] ?? "—";
  });
  return view;
};
