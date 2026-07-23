import { Dialect } from "plgg-ir-language";
import { Module } from "plgg-ir-manifest/domain/model/Module";
import { plggIrForm } from "plgg-ir-manifest/domain/usecase/analyzeManifest";
import { manifestOperators } from "plgg-ir-manifest/domain/usecase/operators";
import { manifestStableOrder } from "plgg-ir-manifest/domain/usecase/normalizeManifest";

/**
 * The Domain Manifest vocabulary as one composable
 * dialect — design.md §24's `domainDialect`. A
 * consumer composes its own dialect ALONGSIDE it
 * (`compose(mapDialect(embed)(manifestDialect),
 * viewDialect)`): a composed dialect adds forms and
 * may reference the domain's declarations through the
 * composition's scope, but it never extends a domain
 * type — the vocabulary stays closed (§36.3), and the
 * `view`/`policy` definitions stay in the consumer
 * (§25). Phase 4 (web semantics) and Phase 5
 * (dependency semantics) grow this same dialect.
 */
export const manifestDialect: Dialect<Module> = {
  name: "domain",
  forms: [plggIrForm],
  operators: manifestOperators,
  expanders: [],
  normalizers: [manifestStableOrder],
};
