/**
 * Process/module boundary for child execution and loader
 * registration. Consumer compiler resolution lives only
 * in consumerCompiler.ts.
 */
export { spawnSync } from "node:child_process";
export { register } from "node:module";
