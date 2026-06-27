import vm from "node:vm";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Run a self-contained CJS bundle in an isolated VM
 * context and return its `module.exports` enumerable
 * keys (minus `__esModule`), sorted. This is how the
 * ESM emitter learns the exact public surface, since
 * ESM cannot declare exports dynamically. Re-throws
 * with context on failure.
 *
 * `resolveBase` is the TARGET package's root: the
 * bundle's external `require("plgg")` / `require("node:*")`
 * must resolve against the target package's own
 * node_modules (not the bundler's), so the require is
 * rooted there. Upstream dists exist in build order, so
 * the externals resolve.
 *
 * Isolated in `src/vendors/` because executing generated
 * code is an effectful boundary, not domain logic.
 */
export const readExportNames = (
  cjsCode: string,
  resolveBase: string,
): ReadonlyArray<string> => {
  try {
    return keysOf(evalCjs(cjsCode, resolveBase));
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
 * Evaluate CJS source in a fresh context with a `require`
 * rooted at the target package, an empty
 * `module`/`exports`, and `console`, returning the
 * populated `module.exports`.
 */
const evalCjs = (
  code: string,
  resolveBase: string,
): object => {
  const moduleObj: { exports: object } = {
    exports: {},
  };
  const context = vm.createContext({
    module: moduleObj,
    exports: moduleObj.exports,
    require: createRequire(
      pathToFileURL(
        join(resolveBase, "package.json"),
      ),
    ),
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
