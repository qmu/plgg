import { SoftStr, Option } from "plgg";

/**
 * The parsed leading frontmatter, modelled as a flat
 * **layout marker only** (see
 * `docs/plggpress-migration/spike-decisions.md` §6b):
 * the sole corpus frontmatter is `index.md`'s
 * `layout: home`, whose `hero`/`features` content is
 * owned by the `SiteConfig` home data and rendered by
 * the theme — *not* parsed here. So this carries just
 * `layout`: `Some("home")` when the marker is present,
 * `None` otherwise. No nested-YAML parsing.
 */
export type Frontmatter = Readonly<{
  layout: Option<SoftStr>;
}>;

/** Builds a {@link Frontmatter}. */
export const frontmatter = (
  layout: Option<SoftStr>,
): Frontmatter => ({ layout });
