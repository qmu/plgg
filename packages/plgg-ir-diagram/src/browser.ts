import { mountDiagram } from "plgg-ir-diagram/editor";
// plgg-bundle exposes the entry module.exports as its ESM default.
module.exports = (
  root: Element,
  props: Readonly<{ code: string; info: string }>,
) => mountDiagram(root, props.code, false);
