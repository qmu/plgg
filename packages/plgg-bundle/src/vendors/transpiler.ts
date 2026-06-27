import ts from "typescript";

/**
 * Anti-corruption layer over the TypeScript compiler's
 * single-file transpile. Translation + delegation only:
 * TS source in, plain CommonJS JavaScript out; a thrown
 * compiler error is re-thrown with file context. No
 * bundling logic lives here — the graph walk and emit
 * are the in-house domain.
 *
 * CommonJS is the target because the in-house
 * module-registry runtime (domain/usecase/emitBundle)
 * wraps each module body as `(module, exports, require)
 * => {...}`; TS lowers `export`/`import`/`export *` to
 * the `exports.x = ` / `require(...)` forms the runtime
 * rewrites and links. `removeComments` is the free size
 * trim that stands in for a (rejected) minifier
 * dependency.
 */
export const transpileToCjs = (
  file: string,
  source: string,
): string => {
  try {
    return ts.transpileModule(source, {
      fileName: file,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2021,
        esModuleInterop: false,
        isolatedModules: true,
        verbatimModuleSyntax: false,
        removeComments: true,
      },
    }).outputText;
  } catch (cause) {
    throw new Error(
      `TranspileError: ${file}: ${messageOf(cause)}`,
    );
  }
};

/**
 * The message of an unknown thrown value, without
 * assuming it is an `Error`.
 */
const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);
