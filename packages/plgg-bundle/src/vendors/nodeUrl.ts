/**
 * The URL anti-corruption layer for plgg-bundle's dev server —
 * the ONLY place `node:url` is reached (turning a filesystem
 * path into a `file://` URL for the module runner).
 */
export { pathToFileURL } from "node:url";
