// A well-formed site config fixture for loadConfig's
// spec. Authored as a plain default-exported object (the
// shape a consumer's site.config produces) so it loads
// through Node's native type-stripping without any alias
// resolution.
export default {
  title: "plgg",
  description:
    "The official guide for plgg.",
  base: "/plgg/",
  nav: [
    { text: "Guide", link: "/getting-started" },
    {
      text: "GitHub",
      link: "https://github.com/qmu/plgg",
    },
  ],
  sidebar: [
    {
      text: "Guide",
      items: [
        {
          text: "Getting started",
          link: "/getting-started",
          items: [],
        },
      ],
    },
  ],
  social: [
    {
      icon: "github",
      link: "https://github.com/qmu/plgg",
    },
  ],
  home: {
    title: "plgg",
    tagline:
      "Web development as one typed pipeline.",
    actions: [
      {
        text: "Get started",
        link: "/getting-started",
      },
    ],
    features: [
      {
        title: "Option, not null",
        details:
          "Absence is a value you must handle.",
      },
    ],
  },
  dev: {
    allowedHosts: ["plgg-guide.qmu.dev"],
  },
};
