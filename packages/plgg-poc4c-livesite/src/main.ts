/**
 * CSR entry — mounts the PoC 4c SHELL program onto
 * `#root`. The only side-effecting line in the shell's
 * browser graph. (The injected client that runs inside the
 * proxied page has its own entry:
 * `entrypoints/patchMain.ts` → dist/patch.js.)
 */
import { sandbox } from "plgg-view/client";
import { app } from "./app.ts";

const root = document.getElementById("root");
if (root !== null) {
  sandbox(app)(root);
}
