/**
 * The process/module anti-corruption layer for plgg-bundle —
 * the ONLY place the `.d.ts` emitter reaches `node:child_process`
 * (to spawn the target's own `tsc`) and `node:module` (to
 * resolve it against the target's node_modules). Confined here so
 * the domain stays `node:`-free.
 */
export { spawnSync } from "node:child_process";
export {
  createRequire,
  register,
} from "node:module";
