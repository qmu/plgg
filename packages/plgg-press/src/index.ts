// Public barrel for plgg-press — the facade surface
// consumers (the guide's site.config, the theme, the
// pipelines) import from.
export {
  type NavItem,
  type SidebarItem,
  type SidebarGroup,
  type SocialLink,
  type HomeAction,
  type HomeFeature,
  type HomeConfig,
  type DevConfig,
  type SiteConfig,
  type NavItemInput,
  type SocialLinkInput,
  type HomeActionInput,
  type HomeFeatureInput,
  type SidebarItemInput,
  type SidebarGroupInput,
  type HomeConfigInput,
  type DevConfigInput,
  type SiteConfigInput,
  asNavItem,
  asSidebarItem,
  asSidebarGroup,
  asSocialLink,
  asHomeAction,
  asHomeFeature,
  asHomeConfig,
  asDevConfig,
  asSiteConfig,
  defineSite,
} from "plgg-press/SiteConfig/model/SiteConfig";

export {
  href,
  isExternalHref,
} from "plgg-press/Href/usecase/href";

export {
  type PressOptions,
  type BuildReport,
} from "plgg-press/Press/model/PressOptions";

export {
  type NotImplementedError,
  type ConfigLoadError,
  notImplementedError,
  notImplementedError$,
  configLoadError,
  configLoadError$,
} from "plgg-press/Press/model/PressError";

export {
  type PageLinks,
  type BrokenLink,
  type BrokenLinks,
  pageLinks,
  brokenLink,
  brokenLinks,
  brokenLinks$,
} from "plgg-press/CheckLinks/model/CheckLinks";
export { checkLinks } from "plgg-press/CheckLinks/usecase/checkLinks";
export { collectPageLinks } from "plgg-press/CheckLinks/usecase/collectPageLinks";

export { build } from "plgg-press/build";
export {
  type DevEntryOptions,
  pressDevEntry,
} from "plgg-press/devEntry";
export { loadConfig } from "plgg-press/Config/usecase/loadConfig";
