// A malformed fixture config module: `name` is the wrong
// type, so the spec's caster rejects it into a
// ConfigLoadError.
export default {
  name: 42,
};
