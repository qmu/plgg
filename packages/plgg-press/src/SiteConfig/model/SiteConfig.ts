import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  asSoftStr,
  asObj,
  forProp,
  forOptionProp,
  asReadonlyArray,
  cast,
} from "plgg";

/**
 * A top-level navigation entry — the flat `text`/`link`
 * pairs the guide's nav bar renders.
 */
export type NavItem = Readonly<{
  text: SoftStr;
  link: SoftStr;
}>;

/**
 * A single sidebar leaf. `link` is optional (a pure
 * grouping header carries none) and `items` lets the
 * tree nest to arbitrary depth.
 */
export type SidebarItem = Readonly<{
  text: SoftStr;
  link: Option<SoftStr>;
  items: ReadonlyArray<SidebarItem>;
}>;

/**
 * A top-level sidebar group: a titled bucket of
 * {@link SidebarItem}s.
 */
export type SidebarGroup = Readonly<{
  text: SoftStr;
  items: ReadonlyArray<SidebarItem>;
}>;

/**
 * A social link shown in the theme chrome (e.g. the
 * GitHub icon).
 */
export type SocialLink = Readonly<{
  icon: SoftStr;
  link: SoftStr;
}>;

/**
 * A call-to-action button on the home hero.
 */
export type HomeAction = Readonly<{
  text: SoftStr;
  link: SoftStr;
}>;

/**
 * A feature card on the home page.
 */
export type HomeFeature = Readonly<{
  title: SoftStr;
  details: SoftStr;
}>;

/**
 * The landing-page DATA, owned by the config rather than
 * parsed from a Markdown `layout: home` frontmatter block
 * (spike decision §6b). The theme renders these fields
 * generically into the hero + feature grid.
 */
export type HomeConfig = Readonly<{
  title: SoftStr;
  tagline: SoftStr;
  actions: ReadonlyArray<HomeAction>;
  features: ReadonlyArray<HomeFeature>;
}>;

/**
 * Dev-server settings. `allowedHosts` lists the extra
 * Host headers the dev server accepts (the guide sets the
 * Cloudflare tunnel hostname here).
 */
export type DevConfig = Readonly<{
  allowedHosts: ReadonlyArray<SoftStr>;
}>;

/**
 * The single information-architecture + home-data
 * contract for the whole facade. Consumed by the theme
 * and the build/dev pipelines, and authored as the
 * guide's `site.config.ts` default export. Pure data —
 * no rendering logic lives here.
 */
export type SiteConfig = Readonly<{
  title: SoftStr;
  description: SoftStr;
  base: SoftStr;
  nav: ReadonlyArray<NavItem>;
  sidebar: ReadonlyArray<SidebarGroup>;
  social: ReadonlyArray<SocialLink>;
  home: Option<HomeConfig>;
  dev: DevConfig;
}>;

/**
 * Boundary caster for a {@link NavItem}.
 */
export const asNavItem = (
  value: unknown,
): Result<NavItem, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("text", asSoftStr),
    forProp("link", asSoftStr),
  );

/**
 * Boundary caster for a {@link SidebarItem}. Recurses
 * through `items` via a deferred self-reference, so the
 * tree validates to any depth without a forward-declared
 * `let`.
 */
export const asSidebarItem = (
  value: unknown,
): Result<SidebarItem, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("text", asSoftStr),
    forOptionProp("link", asSoftStr),
    forProp(
      "items",
      asReadonlyArray((v: unknown) =>
        asSidebarItem(v),
      ),
    ),
  );

/**
 * Boundary caster for a {@link SidebarGroup}.
 */
export const asSidebarGroup = (
  value: unknown,
): Result<SidebarGroup, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("text", asSoftStr),
    forProp(
      "items",
      asReadonlyArray(asSidebarItem),
    ),
  );

/**
 * Boundary caster for a {@link SocialLink}.
 */
export const asSocialLink = (
  value: unknown,
): Result<SocialLink, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("icon", asSoftStr),
    forProp("link", asSoftStr),
  );

/**
 * Boundary caster for a {@link HomeAction}.
 */
export const asHomeAction = (
  value: unknown,
): Result<HomeAction, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("text", asSoftStr),
    forProp("link", asSoftStr),
  );

/**
 * Boundary caster for a {@link HomeFeature}.
 */
export const asHomeFeature = (
  value: unknown,
): Result<HomeFeature, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("title", asSoftStr),
    forProp("details", asSoftStr),
  );

/**
 * Boundary caster for a {@link HomeConfig}.
 */
export const asHomeConfig = (
  value: unknown,
): Result<HomeConfig, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("title", asSoftStr),
    forProp("tagline", asSoftStr),
    forProp(
      "actions",
      asReadonlyArray(asHomeAction),
    ),
    forProp(
      "features",
      asReadonlyArray(asHomeFeature),
    ),
  );

/**
 * Boundary caster for a {@link DevConfig}.
 */
export const asDevConfig = (
  value: unknown,
): Result<DevConfig, InvalidError> =>
  cast(
    value,
    asObj,
    forProp(
      "allowedHosts",
      asReadonlyArray(asSoftStr),
    ),
  );

/**
 * The author-facing shape of a `site.config.ts`: plain
 * `string` (not branded), `ReadonlyArray`, and a genuine
 * optional `?:` wherever the domain {@link SiteConfig}
 * uses `Option` (`home`, a sidebar item's `link`). This
 * is what the editor type-checks a config against, giving
 * autocomplete and misspelled/wrong-typed-key errors at
 * *authoring* time — the ergonomics of Vite's
 * `defineConfig` without giving up runtime validation.
 */
export type NavItemInput = Readonly<{
  text: string;
  link: string;
}>;

export type SocialLinkInput = Readonly<{
  icon: string;
  link: string;
}>;

export type HomeActionInput = Readonly<{
  text: string;
  link: string;
}>;

export type HomeFeatureInput = Readonly<{
  title: string;
  details: string;
}>;

export type SidebarItemInput = Readonly<{
  text: string;
  link?: string;
  items: ReadonlyArray<SidebarItemInput>;
}>;

export type SidebarGroupInput = Readonly<{
  text: string;
  items: ReadonlyArray<SidebarItemInput>;
}>;

export type HomeConfigInput = Readonly<{
  title: string;
  tagline: string;
  actions: ReadonlyArray<HomeActionInput>;
  features: ReadonlyArray<HomeFeatureInput>;
}>;

export type DevConfigInput = Readonly<{
  allowedHosts: ReadonlyArray<string>;
}>;

export type SiteConfigInput = Readonly<{
  title: string;
  description: string;
  base: string;
  nav: ReadonlyArray<NavItemInput>;
  sidebar: ReadonlyArray<SidebarGroupInput>;
  social: ReadonlyArray<SocialLinkInput>;
  home?: HomeConfigInput;
  dev: DevConfigInput;
}>;

/**
 * The public, no-`as` boundary caster: validate an
 * `unknown` value (a loaded config module's default
 * export) into a fully-typed {@link SiteConfig}, or a
 * {@link InvalidError} naming the offending field. This
 * is the one place untrusted config data crosses into
 * the typed core (used by the loader).
 */
export const asSiteConfig = (
  value: unknown,
): Result<SiteConfig, InvalidError> =>
  cast(
    value,
    asObj,
    forProp("title", asSoftStr),
    forProp("description", asSoftStr),
    forProp("base", asSoftStr),
    forProp(
      "nav",
      asReadonlyArray(asNavItem),
    ),
    forProp(
      "sidebar",
      asReadonlyArray(asSidebarGroup),
    ),
    forProp(
      "social",
      asReadonlyArray(asSocialLink),
    ),
    forOptionProp("home", asHomeConfig),
    forProp("dev", asDevConfig),
  );

/**
 * The typed authoring façade over {@link asSiteConfig}:
 * takes a statically-checked {@link SiteConfigInput} so a
 * `site.config.ts` is sound in the editor before the CLI
 * runs, and still returns a validated `Result` (a
 * `SiteConfigInput` is assignable to `unknown`, so the
 * delegation needs no `as`).
 */
export const defineSite = (
  input: SiteConfigInput,
): Result<SiteConfig, InvalidError> =>
  asSiteConfig(input);
