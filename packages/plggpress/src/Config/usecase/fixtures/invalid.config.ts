// A malformed site config fixture for loadConfig's spec:
// `title` is a number, so defineSite must reject it and
// loadConfig must surface a ConfigLoadError.
export default {
  title: 123,
  description: "missing the rest",
};
