/**
 * The filesystem anti-corruption layer for plgg-bundle — the
 * ONLY place the bundler's build usecases reach `node:fs`, kept
 * under `vendors/` so the domain speaks these named operations,
 * not the driver. Re-exported (not re-wrapped) to preserve the
 * exact node types; plgg-bundle's throw-at-the-boundary error
 * model (see BundleConfig) means a failed fs call surfaces as a
 * thrown Error the entrypoint catches — the seam is the import
 * chokepoint, so the vendor-boundary gate holds unexempted.
 */
export {
  writeFileSync,
  mkdirSync,
  rmSync,
  renameSync,
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  watch,
  type FSWatcher,
} from "node:fs";
