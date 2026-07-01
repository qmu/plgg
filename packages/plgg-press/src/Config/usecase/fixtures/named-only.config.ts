// A module with no default export — exercises
// loadConfig's pickDefault fallback (the namespace is
// validated and rejected) so config loading reports a
// ConfigLoadError rather than throwing.
export const notADefault = 1;
