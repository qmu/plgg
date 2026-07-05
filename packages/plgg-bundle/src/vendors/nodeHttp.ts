/**
 * The HTTP anti-corruption layer for plgg-bundle's DEV server —
 * the ONLY place the node:http ⇄ Web-standard bridge reaches
 * `node:http`. Confined here so the dev orchestration stays
 * `node:`-free (the vendor-boundary gate); a plgg-free
 * reimplementation of `serve` (the toolchain must not import a
 * library it builds).
 */
export {
  createServer,
  type IncomingMessage,
  type ServerResponse,
  type Server,
} from "node:http";
