/**
 * CSR entry — mounts the PoC 1 application (URL-aware:
 * the submitted query lives in `?q=…`) onto `#root`.
 * The only side-effecting line in the browser graph.
 */
import { application } from "plgg-view/client";
import { app } from "./app.ts";

const root = document.getElementById("root");
if (root !== null) {
  application(app)(root);
}
