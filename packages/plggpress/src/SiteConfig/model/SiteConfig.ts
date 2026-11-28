import {
  type SoftStr,
  type Option,
  type Result,
  type InvalidError,
  asSoftStr,
  asBool,
  asObj,
  forProp,
  forOptionProp,
  asReadonlyArray,
  cast,
  ok,
  err,
  isErr,
  invalidError,
} from "plgg";
import {
  type Theme,
  pragmaticThemeWithPalette,
} from "plggmatic/style";
import {
  type Appearance,
  asOrigin,
  publicDocumentJoining,
  asAppearance,
} from "plggmatic";
import { type ContentModelBinding } from "plggpress/ContentModel/model/ContentModel";
import { asBindings } from "plggpress/ContentModel/usecase/asContentModel";

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
 * Dev-server settings. `allowedHosts` lists the extra
 * Host headers the dev server accepts (the guide sets the
 * Cloudflare tunnel hostname here).
 */
export type DevConfig = Readonly<{
  allowedHosts: ReadonlyArray<SoftStr>;
}>;

/**
 * Which heading-slug algorithm the render boundary uses —
 * declarative DATA (not a raw function), so it stays
 * JSON-validatable and introspectable. `"vitepress"` is
 * the `@mdit-vue/shared`-exact default (the guide's
 * anchors were born on it); `"github"` is the
 * github-slugger/`rehype-slug` scheme a site whose anchor
 * history came from GitHub/Astro opts into. plggpress maps
 * each to the matching plgg-md base slugger.
 */
export type SluggerKind = "vitepress" | "github";

/**
 * The single information-architecture contract for the
 * whole facade. Consumed by the theme and the build/dev
 * pipelines, and authored as the guide's `site.config.ts`
 * default export. Pure data — no rendering logic lives
 * here.
 */
export type SiteConfig = Readonly<{
  title: SoftStr;
  description: SoftStr;
  base: SoftStr;
  nav: ReadonlyArray<NavItem>;
  sidebar: ReadonlyArray<SidebarGroup>;
  sidebarStyle?: Option<
    "plain" | "tree" | "numbered"
  >;
  /**
   * `toggle` renders each top-level sidebar group as a
   * disclosure, open only where the current page lives.
   */
  sidebarGroups?: Option<"open" | "toggle">;
  /**
   * Where the appearance toggle and the social links
   * stand: `rail` (the default) is a narrow column of its
   * own at the far right; `sidebar` puts them at the foot
   * of the sidebar, gives the sidebar's head a control
   * that folds the sidebar to a narrow strip, and leaves
   * the strip with no rail column at all.
   */
  controls?: Option<"rail" | "sidebar">;
  /**
   * How wide a page column is: `measure` (the default) is
   * a reading measure; `fill` shares the whole width
   * right of the sidebar among the open pages, so one
   * page fills it and a second halves it.
   */
  contentWidth?: Option<"measure" | "fill">;
  tagline?: Option<string>;
  footerLink?: Option<NavItem>;
  social: ReadonlyArray<SocialLink>;
  dev: DevConfig;
  // Optional content models (D8) — `None` ⇒ no
  // frontmatter validation, so every existing config
  // remains valid unchanged.
  models: Option<
    ReadonlyArray<ContentModelBinding>
  >;
  // Opt-in raw-HTML passthrough — `None` ⇒ the spike
  // default (angle brackets escape as text), so the guide
  // is byte-identical. `Some(true)` renders recognized
  // HTML blocks/spans verbatim.
  rawHtml: Option<boolean>;
  // Which heading slugger the render boundary uses —
  // `None` ⇒ the VitePress-exact default, so the guide's
  // anchors are unchanged.
  slugger: Option<SluggerKind>;
  // Glob patterns (matched against ROUTES, e.g.
  // `/drafts/**`) whose pages are NOT built — the
  // VitePress `srcExclude` role for drafts, fixtures, and
  // redirect stubs. `None` ⇒ nothing excluded.
  srcExclude: Option<ReadonlyArray<SoftStr>>;
  // Glob patterns of internal link targets the dead-link
  // checker SKIPS — a page linking to an existing non-page
  // file the pure checker cannot see (a download, a
  // co-located data file at an extensionless path). `None`
  // ⇒ nothing ignored.
  linkIgnore: Option<ReadonlyArray<SoftStr>>;
  // COLUMNS ACROSS SITES. `partners` are the other sites
  // whose pages this site opens as columns; `embedders`
  // are the sites allowed to open this site's pages as
  // columns. Each is an exact origin (`https://host`).
  // A partner's page is shown in a frame of its own, and
  // the build writes a `_headers` file that lets only the
  // embedders frame this site. `None` ⇒ no site is
  // joined, and every link out leaves as before.
  partners?: Option<ReadonlyArray<SoftStr>>;
  embedders?: Option<ReadonlyArray<SoftStr>>;
  // With partners named, every page says which origins it
  // may hold in a frame: itself, its partners, and the
  // ones listed here (a third-party widget the site
  // already embeds). The browser then refuses any other —
  // so a partner's page cannot hand its column on to a
  // stranger by redirecting.
  frames?: Option<ReadonlyArray<SoftStr>>;
  // The resolved theme (palette + geometry) the doc site
  // renders through — a validated override layered onto
  // plggmatic's monochrome default. `None` ⇒ the B&W qmu
  // default, so every existing config is unchanged. The
  // config author supplies a `palette` OBJECT (schemes ×
  // color tokens); it is validated through plggmatic's
  // `pragmaticThemeWithPalette` into this `Theme`, naming
  // the offending path (e.g. `dark.danger-border`) on a
  // bad palette rather than silently.
  theme: Option<Theme>;
  /**
   * How the site LOOKS: a plggmatic `Appearance` — type,
   * rules, corners, marks, density, motion. Absent ⇒ the
   * framework's default (monochrome). The palette
   * (`theme`) says what colour each role is; this says
   * which role draws what, and everything else.
   */
  appearance?: Option<Appearance>;
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
 * Boundary caster for a {@link SluggerKind}: an `unknown`
 * config value validated by exact string match into the
 * closed set, or an {@link InvalidError} — no `as`.
 */
export const asSluggerKind = (
  value: unknown,
): Result<SluggerKind, InvalidError> =>
  value === "vitepress" || value === "github"
    ? ok(value)
    : err(
        invalidError({
          message: `slugger must be 'vitepress' | 'github', got ${JSON.stringify(
            value,
          )}`,
        }),
      );

export { asOrigin } from "plggmatic";

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
 * uses `Option` (a sidebar item's `link`). This
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

export type SidebarItemInput = Readonly<{
  text: string;
  link?: string;
  items: ReadonlyArray<SidebarItemInput>;
}>;

export type SidebarGroupInput = Readonly<{
  text: string;
  items: ReadonlyArray<SidebarItemInput>;
}>;

export type DevConfigInput = Readonly<{
  allowedHosts: ReadonlyArray<string>;
}>;

/**
 * The author-facing palette override: each scheme
 * (`light`/`dark`) maps its color tokens to hex strings.
 * Plain `string` hexes for authoring ergonomics — the
 * caster validates every cell through plggmatic's
 * `asPalette` (a bad hex fails naming its path).
 */
export type PaletteInput = Readonly<{
  light: Readonly<Record<string, string>>;
  dark: Readonly<Record<string, string>>;
}>;

export type SiteConfigInput = Readonly<{
  title: string;
  description: string;
  base: string;
  nav: ReadonlyArray<NavItemInput>;
  sidebar: ReadonlyArray<SidebarGroupInput>;
  sidebarStyle?: "plain" | "tree" | "numbered";
  sidebarGroups?: "open" | "toggle";
  controls?: "rail" | "sidebar";
  contentWidth?: "measure" | "fill";
  tagline?: string;
  footerLink?: NavItemInput;
  social: ReadonlyArray<SocialLinkInput>;
  dev: DevConfigInput;
  models?: ReadonlyArray<ContentModelBinding>;
  rawHtml?: boolean;
  slugger?: SluggerKind;
  srcExclude?: ReadonlyArray<string>;
  linkIgnore?: ReadonlyArray<string>;
  partners?: ReadonlyArray<string>;
  embedders?: ReadonlyArray<string>;
  frames?: ReadonlyArray<string>;
  // Optional palette override — absent ⇒ the B&W qmu
  // default. Validated into a `Theme` at load.
  theme?: PaletteInput;
  appearance?: Appearance;
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
): Result<SiteConfig, InvalidError> => {
  // two passes: `cast` composes at most twenty steps
  const read = cast(
    value,
    asObj,
    forProp("title", asSoftStr),
    forProp("description", asSoftStr),
    forProp("base", asSoftStr),
    forProp("nav", asReadonlyArray(asNavItem)),
    forProp(
      "sidebar",
      asReadonlyArray(asSidebarGroup),
    ),
    forProp(
      "social",
      asReadonlyArray(asSocialLink),
    ),
    forProp("dev", asDevConfig),
    forOptionProp(
      "sidebarStyle",
      (
        value: unknown,
      ): Result<
        "plain" | "tree" | "numbered",
        InvalidError
      > =>
        value === "plain" ||
        value === "tree" ||
        value === "numbered"
          ? ok(value)
          : err(
              invalidError({
                message:
                  "sidebarStyle must be plain, tree or numbered",
              }),
            ),
    ),
    forOptionProp(
      "controls",
      (
        value: unknown,
      ): Result<
        "rail" | "sidebar",
        InvalidError
      > =>
        value === "rail" || value === "sidebar"
          ? ok(value)
          : err(
              invalidError({
                message:
                  "controls must be rail or sidebar",
              }),
            ),
    ),
    forOptionProp(
      "contentWidth",
      (
        value: unknown,
      ): Result<
        "measure" | "fill",
        InvalidError
      > =>
        value === "measure" || value === "fill"
          ? ok(value)
          : err(
              invalidError({
                message:
                  "contentWidth must be measure or fill",
              }),
            ),
    ),
    forOptionProp(
      "sidebarGroups",
      (
        value: unknown,
      ): Result<
        "open" | "toggle",
        InvalidError
      > =>
        value === "open" || value === "toggle"
          ? ok(value)
          : err(
              invalidError({
                message:
                  "sidebarGroups must be open or toggle",
              }),
            ),
    ),
    forOptionProp("tagline", asSoftStr),
    forOptionProp("footerLink", asNavItem),
    forOptionProp("models", asBindings),
    forOptionProp("rawHtml", asBool),
    forOptionProp("slugger", asSluggerKind),
    forOptionProp(
      "srcExclude",
      asReadonlyArray(asSoftStr),
    ),
    forOptionProp(
      "linkIgnore",
      asReadonlyArray(asSoftStr),
    ),
    // The optional palette override: a `theme` object of
    // schemes × color tokens, validated through plggmatic's
    // `pragmaticThemeWithPalette` into a full `Theme`. A
    // malformed palette fails here naming the path (e.g.
    // `dark.danger-border`); absent ⇒ `None` (the B&W
    // default), so no config edit is forced.
    forOptionProp(
      "theme",
      pragmaticThemeWithPalette,
    ),
  );
  return isErr(read)
    ? err(read.content)
    : cast(
        read.content,
        forOptionProp("appearance", asAppearance),
        forOptionProp(
          "partners",
          asReadonlyArray(asOrigin),
        ),
        forOptionProp(
          "embedders",
          asReadonlyArray(asOrigin),
        ),
        forOptionProp(
          "frames",
          asReadonlyArray(asOrigin),
        ),
      );
};

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

const origins = (
  list: SiteConfig["partners"],
): readonly string[] =>
  list?.__tag === "Some" ? list.content : [];

export const siteJoining = (config: SiteConfig) =>
  publicDocumentJoining(
    origins(config.partners),
    origins(config.embedders),
    origins(config.frames),
  );
