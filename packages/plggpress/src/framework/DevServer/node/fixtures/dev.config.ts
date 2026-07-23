// A minimal well-formed site config for the dev-server
// integration spec. Authored as a plain default-exported
// object (the shape a consumer's site.config produces) so it
// loads through Node's native type-stripping with no alias
// resolution. Base is root, so served links need no prefix.
export default {
  title: "Dev Fixture",
  description: "Dev-server integration fixture",
  base: "/",
  nav: [],
  sidebar: [],
  social: [],
  dev: { allowedHosts: [] },
};
