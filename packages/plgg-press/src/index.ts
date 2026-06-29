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
  asNavItem,
  asSidebarItem,
  asSidebarGroup,
  asSocialLink,
  asHomeAction,
  asHomeFeature,
  asHomeConfig,
  asDevConfig,
  defineSite,
} from "plgg-press/SiteConfig/model/SiteConfig";

export {
  href,
  isExternalHref,
} from "plgg-press/Href/usecase/href";

export {
  type PressOptions,
  type BuildReport,
  type DevServer,
} from "plgg-press/Press/model/PressOptions";

export {
  type NotImplementedError,
  type ConfigLoadError,
  notImplementedError,
  notImplementedError$,
  configLoadError,
  configLoadError$,
} from "plgg-press/Press/model/PressError";

export { build } from "plgg-press/build";
export { dev } from "plgg-press/dev";
export { loadConfig } from "plgg-press/Config/usecase/loadConfig";
