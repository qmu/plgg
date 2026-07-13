/**
 * CSR entry — mounts the PoC 4b program onto `#root`.
 * The only side-effecting line in the browser graph.
 */
import { sandbox } from "plgg-view/client";
import { app } from "./app.ts";

const root = document.getElementById("root");
if (root !== null) {
  sandbox(app)(root);
}
