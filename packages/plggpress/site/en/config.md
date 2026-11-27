# Site configuration reference

Default-export a configuration object from `site.config.ts`. For editor feedback, import the `SiteConfigInput` type from `plggpress` and add `satisfies SiteConfigInput` to the object. The CLI also validates the fields when it loads the file.

## Required settings

| Setting | Use |
| --- | --- |
| `title` | Site name shown in the sidebar and page footer. |
| `description` | Description of the site. |
| `base` | Deployment path, such as `/` or `/en/`. |
| `nav` | Array of `{ text, link }` entries. Use `sidebar` for this theme’s navigation. |
| `sidebar` | Array of `{ text, items }` groups. Each child has `{ text, link?, items }`. |
| `social` | Array of `{ icon, link }` entries. Use `[]` for no social links. |
| `dev` | Object with an `allowedHosts` array of additional hostnames. Use `[]` if empty. |

## Navigation and appearance

| Setting | Use |
| --- | --- |
| `sidebarStyle` | `plain` (default) drills into sections. `tree` and `numbered` keep items together. |
| `sidebarGroups` | Use `open` (default) for expanded groups or `toggle` for disclosures in a tree. |
| `controls` | `rail` (default) places controls on the right. `sidebar` moves them below the tree. |
| `contentWidth` | `measure` (default) for prose or `fill` to share the available width. |
| `tagline` | Short line of text in the sidebar. |
| `footerLink` | A `{ text, link }` entry for the sidebar footer. |
| `theme` | Palette with hexadecimal values for the color tokens in both `light` and `dark`. |
| `appearance` | A plggmatic skin. Defaults to `monochrome`. |

## Content and validation

| Setting | Use |
| --- | --- |
| `slugger` | Heading ID convention, either `vitepress` (default) or `github`. |
| `rawHtml` | Set to `true` to pass recognized HTML through in trusted content. HTML is escaped by default. |
| `models` | Array of `{ prefix, model }` bindings for frontmatter validation. |
| `srcExclude` | Route patterns to exclude from the build. |
| `linkIgnore` | Target patterns to skip during link checking. |

In a pattern, `*` matches within one segment, `**` can cross slashes, and `?` matches one character other than a slash. See [Checking links and models](/checks/) for examples.

## Permissions between sites

| Setting | Use |
| --- | --- |
| `partners` | Origins whose pages this site may open as columns. |
| `embedders` | Origins allowed to embed this site’s pages. |
| `frames` | Additional origins used by embedded frames. |

See [Joining sites](/joining/) for the settings on both sides of a link.
