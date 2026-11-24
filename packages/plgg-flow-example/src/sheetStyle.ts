import { el, text } from "plgg-view";
import { sheetCss } from "plgg-ir-diagram/flowSheet";
export const demoSheetStyle = el<never>(
  "style",
  [],
  [text(sheetCss)],
);
