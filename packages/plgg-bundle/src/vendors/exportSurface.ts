import ts from "typescript";

/**
 * The public runtime export names of a library entry
 * module, derived STATICALLY from its TypeScript source —
 * the ESM emitter needs this exact list because ESM
 * cannot declare its exports dynamically.
 *
 * Previously the surface was discovered by EXECUTING the
 * emitted CJS bundle in a `node:vm` and reading
 * `module.exports` keys; executing a bundle to learn its
 * shape needs the target's `node_modules` resolvable and
 * runs arbitrary module top-level code. Instead we ask the
 * TypeScript checker for the entry module's exports —
 * which resolves `export * from` re-exports transitively —
 * and keep only those with a runtime VALUE meaning
 * (dropping type-only exports, `default`, and the
 * `__esModule` interop marker), sorted, matching the
 * sorted `__esModule`-free key list the vm path returned.
 *
 * `aliasPrefix`/`aliasSrcRoot` reproduce the package's own
 * tsconfig `paths` (`"<prefix>/*": ["<srcRoot>/*"]`) so
 * the checker resolves the barrel's self-alias re-exports
 * (`export * from "plgg/Atomics"`).
 *
 * Effectful use of the TS compiler API, so it lives at the
 * vendor boundary.
 */
export const deriveExportNames = (args: {
  entryFile: string;
  root: string;
  aliasPrefix: string;
  aliasSrcRoot: string;
}): ReadonlyArray<string> => {
  const program = ts.createProgram(
    [args.entryFile],
    {
      module: ts.ModuleKind.ESNext,
      moduleResolution:
        ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2021,
      baseUrl: args.root,
      paths: {
        [`${args.aliasPrefix}/*`]: [
          `${args.aliasSrcRoot}/*`,
        ],
      },
      noEmit: true,
      allowJs: false,
      skipLibCheck: true,
    },
  );
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(
    args.entryFile,
  );
  if (source === undefined) {
    throw new Error(
      `ExportSurfaceError: cannot load entry ${args.entryFile}`,
    );
  }
  const moduleSymbol =
    checker.getSymbolAtLocation(source);
  if (moduleSymbol === undefined) {
    return [];
  }
  const names = checker
    .getExportsOfModule(moduleSymbol)
    .filter((sym) => isValueExport(checker, sym))
    .map((sym) => sym.getName())
    .filter(
      (name) =>
        name !== "default" &&
        name !== "__esModule",
    );
  return [...new Set(names)].sort();
};

/**
 * Whether an export symbol carries a runtime value (a
 * const/function/class/enum/value-namespace, or a
 * re-export of one) as opposed to a type-only export
 * (`type`/`interface`). Re-exports arrive as aliases, so
 * the alias is resolved to its target before its meaning
 * is read.
 */
const isValueExport = (
  checker: ts.TypeChecker,
  sym: ts.Symbol,
): boolean =>
  (resolveAlias(checker, sym).flags &
    ts.SymbolFlags.Value) !==
  0;

/**
 * Resolve an alias symbol (a re-export) to the symbol it
 * points at; a non-alias symbol is returned unchanged.
 */
const resolveAlias = (
  checker: ts.TypeChecker,
  sym: ts.Symbol,
): ts.Symbol =>
  (sym.flags & ts.SymbolFlags.Alias) !== 0
    ? checker.getAliasedSymbol(sym)
    : sym;
