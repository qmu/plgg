/**
 * The path anti-corruption layer for plgg-bundle — the ONLY
 * place the build usecases reach `node:path`. Re-exported to
 * preserve exact node types; confining the import here is what
 * keeps the domain free of `node:` specifiers (the
 * vendor-boundary gate).
 */
export {
  join,
  dirname,
  relative,
  basename,
  resolve,
  isAbsolute,
} from "node:path";
