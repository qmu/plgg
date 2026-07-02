// A fixture module with NO default export — loadConfig
// falls back to the module object itself, which lacks the
// `name` field the spec's caster requires, so it rejects.
export const other = "x";
