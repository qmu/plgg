// Fixture: a directory whose only module is `index.ts`, so a
// bare-directory self-alias (`plgg-bundle/Dev/fixtures/aliasDir`)
// has an index to resolve to. Exercised by
// ../../usecase/selfAliasResolve.spec.ts to guard the loader
// hook against resolving to the directory itself (EISDIR).
export const marker = "aliasDir/index.ts";
