import { mountFlow } from "plgg-ir-diagram/flowEditor";
const root = document.querySelector(
  "[data-flow-root]",
);
const source =
  root?.querySelector("code")?.textContent;
if (root && typeof source === "string")
  mountFlow(root, source);
