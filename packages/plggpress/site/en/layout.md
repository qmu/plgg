# Organize the sidebar and choose an appearance

The sidebar follows the order of `sidebar` in the config. Each top-level group is a section. Its `items` can be pages or nested groups. Omit `link` for a grouping label and give every leaf an empty `items` array.

To add the supplies page to the sidebar in [Your first site](/start/), put this declaration before the default export in `site.config.ts`. Replace the original `sidebar` property with `...navigation`.

```ts
const navigation = {
  sidebarStyle: "tree",
  sidebarGroups: "toggle",
  controls: "sidebar",
  sidebar: [{ text: "Handbook", items: [
    { text: "Home", link: "/", items: [] },
    { text: "Supplies", link: "/supplies/", items: [] },
  ] }],
};
```

Use `tree` for a single sidebar tree and `toggle` for collapsible sections. Choose `numbered` to number the tree, or `plain` to open the selected section in a separate column. Set `controls` to `"sidebar"` to place the light/dark switch and social links at the foot of the sidebar.

## Column width and skins

Keep the default `contentWidth: "measure"` for prose. With `"fill"`, open pages share the available width, which suits diagrams and catalogs. The `theme` setting takes color palettes for `light` and `dark`. The `appearance` setting takes a skin covering typography, corners, spacing, and motion. For instance, add `import { soft } from "plggmatic";` to the config and set `appearance: soft`. Explore the components and layouts in the [plggmatic catalog](https://plggmatic.qmu.co.jp/).

## Publish each language under its own path

This guide keeps identically named files in separate Japanese and English directories. Its config reads `SITE_LOCALE` at build time to select the title, description, sidebar, and `base`. Japanese uses `/` and English uses `/en/`, so authors can use the same internal paths in both editions. The final sidebar entry switches languages. See [Building and publishing](/operations/) for the output layout.
