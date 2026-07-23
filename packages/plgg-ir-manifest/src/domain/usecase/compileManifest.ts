import {
  SoftStr,
  Result,
  ok,
  err,
  pipe,
  chainResult,
} from "plgg";
import {
  sourcePos,
  sourceRange,
} from "plgg-ir-syntax";
import {
  SemDiagnostic,
  Language,
  Compiled,
  compileSource,
  semError,
} from "plgg-ir-language";
import { Module } from "plgg-ir-manifest/domain/model/Module";
import { codeBadRoot } from "plgg-ir-manifest/domain/model/ManifestCode";
import { manifestDialect } from "plgg-ir-manifest/domain/usecase/manifestDialect";

/**
 * The Domain Manifest language: exactly
 * {@link manifestDialect}, finished — derived, so the
 * two exports cannot drift.
 */
export const manifestLanguage: Language<Module> =
  manifestDialect;

/**
 * What compiling a manifest source produces: the
 * verified {@link Module} model plus the canonical
 * text — deterministic, versioned, and ready for
 * consumers such as plggmatic (design.md §33).
 */
export type CompiledManifest = Readonly<{
  module: Module;
  canonical: SoftStr;
}>;

/**
 * Compiles one Domain Manifest source through the
 * canonical pipeline
 * `parse → expand → analyze/verify → normalize`
 * (design.md §32). Exactly one
 * `(plgg-ir 1 (module ...))` root is required; every
 * diagnostic of every stage comes back in one list.
 */
export const compileManifest = (
  source: SoftStr,
): Result<
  CompiledManifest,
  ReadonlyArray<SemDiagnostic>
> =>
  pipe(
    compileSource(manifestLanguage)(source),
    chainResult(
      (
        compiled: Compiled<Module>,
      ): Result<
        CompiledManifest,
        ReadonlyArray<SemDiagnostic>
      > =>
        compiled.nodes.length === 1
          ? compiled.nodes
              .map(
                (
                  module: Module,
                ): CompiledManifest => ({
                  module,
                  canonical: compiled.canonical,
                }),
              )
              .reduce<
                Result<
                  CompiledManifest,
                  ReadonlyArray<SemDiagnostic>
                >
              >(
                (_, m) => ok(m),
                err([wrongRootCount(1)]),
              )
          : err([
              wrongRootCount(
                compiled.nodes.length,
              ),
            ]),
    ),
  );

/**
 * The diagnostic for a source without exactly one
 * `(plgg-ir ...)` root.
 */
const wrongRootCount = (
  found: number,
): SemDiagnostic =>
  semError(
    codeBadRoot,
    `a manifest source needs exactly one (plgg-ir ...) root, found ${found}`,
    sourceRange(
      sourcePos(0, 1, 1),
      sourcePos(0, 1, 1),
    ),
  );
