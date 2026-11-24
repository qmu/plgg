import { mountSheet } from "plgg-ir-diagram/mountSheet";
import { mountFlow } from "plgg-ir-diagram/flowEditor";
// plgg-bundle exposes the entry module.exports as its ESM default.
module.exports = (
  root: Element,
  props: Readonly<{ code: string; info: string }>,
) => {
  const options = props.info.split(/\s+/);
  return options.includes("fill") ||
    options.includes("dsl")
    ? mountSheet(
        root,
        props.code,
        options.includes("dsl"),
      )
    : mountFlow(root, props.code);
};
