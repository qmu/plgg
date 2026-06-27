import vm from "node:vm";
import { createRequire } from "node:module";

/**
 * Run a self-contained CJS bundle in an isolated VM
 * context and return its `module.exports` enumerable
 * keys (minus `__esModule`), sorted. This is how the
 * ESM emitter learns the exact public surface, since
 * ESM cannot declare exports dynamically. Re-throws
 * with context on failure.
 *
 * Isolated in `src/vendors/` because executing generated
 * code is an effectful boundary, not domain logic. The
 * bundle must be self-contained (no externals) for this
 * to be safe — true for a library entry whose imports
 * are all intra-bundle.
 */
export const readExportNames = (
  cjsCode: string,
): ReadonlyArray<string> => {
  try {
    return keysOf(evalCjs(cjsCode));
  } catch (cause) {
    throw new Error(
      `EvalError: failed to read export surface: ${
        cause instanceof Error
          ? cause.message
          : String(cause)
      }`,
    );
  }
};

/**
 * Evaluate CJS source in a fresh context with a real
 * `require` (for any host fall-through) and an empty
 * `module`/`exports`, returning the populated
 * `module.exports`.
 */
const evalCjs = (code: string): object => {
  const moduleObj: { exports: object } = {
    exports: {},
  };
  const context = vm.createContext({
    module: moduleObj,
    exports: moduleObj.exports,
    require: createRequire(import.meta.url),
    console,
  });
  vm.runInContext(code, context);
  return moduleObj.exports;
};

/**
 * Enumerable own keys of the exports object, dropping
 * the `__esModule` interop marker, sorted for a stable
 * named-export list.
 */
const keysOf = (
  exportsObj: object,
): ReadonlyArray<string> =>
  Object.keys(exportsObj)
    .filter((k) => k !== "__esModule")
    .sort();
