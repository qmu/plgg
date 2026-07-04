// Twin of the Text link page's code fence. An `external`
// link opens in a new tab and announces it — a
// no-surprise default.
import { textLink } from "plggmatic";

export const repoLink = textLink({
  label: "plggmatic on GitHub",
  to: "https://github.com/qmu/plggmatic",
  external: true,
});

export const docsLink = textLink({
  label: "Getting started",
  to: "/getting-started",
  external: false,
});
