// Twin of the workbench page's code fence: the column
// stack is derived per render, the geometry composed.
import { row, column } from "plggmatic";
import { basis } from "plggmatic/style";
import { type Html } from "plgg-view";

declare const sectionsPanes: ReadonlyArray<
  Html<never>
>;
declare const pushed: ReadonlyArray<Html<never>>;

export const stack = row(
  [],
  [
    column([basis("220px")], sectionsPanes),
    ...pushed,
  ],
);
