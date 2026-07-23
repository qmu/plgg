// Fixture: a spec that throws at module-evaluation time (before any
// test registers). The runner must surface this as a single failed
// result, never a silent green. Loaded by Runner.spec.ts.
throw new Error("intentional load-time failure");
