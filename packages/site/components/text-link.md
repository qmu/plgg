# Text link

`textLink` is the navigation component: a real `<a>` carrying an `href`.

## Recorded rule

Navigation is always a real `<a>` with an `href`, with a standing underline so a link is identifiable without relying on color alone. An `external` link opens in a new tab **and** announces it — `target="_blank"`, `rel="noopener noreferrer"`, a visible `↗` affordance, and an extended accessible label — so the user is never surprised (a no-dark-patterns default). It carries the shared focus ring and hover feedback.

## Usage

```ts
import { textLink } from "plggmatic";

const repoLink = textLink({
  label: "plggmatic on GitHub",
  to: "https://github.com/qmu/plggmatic",
  external: true,
});

const docsLink = textLink({
  label: "Getting started",
  to: "/getting-started",
  external: false,
});
```

An internal link carries none of the external machinery — no `target`, no new-tab announcement.
