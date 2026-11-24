import { sheetToolNames } from "plgg-ir-diagram/flowSheet";
import { mountSheet } from "plgg-ir-diagram/mountSheet";
import { mountFlow } from "plgg-ir-diagram/flowEditor";
// plgg-bundle exposes the entry module.exports as its ESM default.
module.exports = (
  root: Element,
  props: Readonly<{ code: string; info: string }>,
) => {
  const options = props.info.split(/\s+/);
  const names = sheetToolNames(props.info);
  return names.length ||
    options.includes("fill") ||
    options.includes("dsl")
    ? mountSheet(
        root,
        props.code,
        options.includes("dsl"),
        names,
      )
    : mountFlow(root, props.code);
};
