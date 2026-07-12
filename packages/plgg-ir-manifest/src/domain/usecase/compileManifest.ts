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
import { plggIrForm } from "plgg-ir-manifest/domain/usecase/analyzeManifest";
import { manifestOperators } from "plgg-ir-manifest/domain/usecase/operators";
import { manifestStableOrder } from "plgg-ir-manifest/domain/usecase/normalizeManifest";

/**
 * The Domain Manifest language: one dialect — the
 * `plgg-ir` root form, the closed operator
 * vocabulary, and the stable-ordering normalizer.
 * Phase 4 (web semantics) and Phase 5 (dependency
 * semantics) grow this same dialect.
 */
export const manifestLanguage: Language<Module> =
  {
    forms: [plggIrForm],
    operators: manifestOperators,
    expanders: [],
    normalizers: [manifestStableOrder],
  };

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
