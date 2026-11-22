import { mountDiagram } from "plgg-ir-diagram/editor";
const root = document.querySelector(
  "[data-diagram-root]",
);
const source =
  root?.querySelector("code")?.textContent;
if (
  root &&
  source !== undefined &&
  source !== null
)
  mountDiagram(root, source, false);
