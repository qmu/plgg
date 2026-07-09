// Public entry for the `plggpress/framework` subpath: the
// generic web-application seam (config loading, router
// builder, static-build orchestration, app-options, the
// pre-organized CLI runner, and the wrapped mid-library
// surfaces) that a dynamic consumer such as plgg-cms
// composes its served app onto. A pure re-export of the
// internal facade — no logic lives here. The output key is
// `frameworkEntry` (not `framework`) so `dist/frameworkEntry.*`
// does not case-collide with the `dist/framework/` declaration
// tree.
export * from "plggpress/framework";
