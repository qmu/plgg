// Fixture: a config module that throws a NON-Error value
// at evaluation, so `loadConfig`'s dynamic import rejects
// with a non-Error `reason` — exercising the
// `String(reason)` arm of its error-message formatting.
export {};
throw "boom at config eval";
