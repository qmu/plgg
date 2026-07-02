// Public barrel for plggpress — the facade surface
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
} from "plggpress/SiteConfig/model/SiteConfig";

export {
  href,
  isExternalHref,
} from "plggpress/Href/usecase/href";

export {
  type PressOptions,
  type BuildReport,
} from "plggpress/Press/model/PressOptions";

export {
  type NotImplementedError,
  type ConfigLoadError,
  notImplementedError,
  notImplementedError$,
  configLoadError,
  configLoadError$,
} from "plggpress/Press/model/PressError";

export {
  type PageLinks,
  type BrokenLink,
  type BrokenLinks,
  pageLinks,
  brokenLink,
  brokenLinks,
  brokenLinks$,
} from "plggpress/CheckLinks/model/CheckLinks";
export { checkLinks } from "plggpress/CheckLinks/usecase/checkLinks";
export { collectPageLinks } from "plggpress/CheckLinks/usecase/collectPageLinks";

export { build } from "plggpress/build";
export {
  type DevEntryOptions,
  pressDevEntry,
} from "plggpress/devEntry";
export { loadConfig } from "plggpress/Config/usecase/loadConfig";
