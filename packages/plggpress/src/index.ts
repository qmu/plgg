// Public barrel for plggpress — the facade surface
// consumers (the guide's site.config, the theme, the
// pipelines) import from.
export {
  type NavItem,
  type SidebarItem,
  type SidebarGroup,
  type SocialLink,
  type DevConfig,
  type SiteConfig,
  type NavItemInput,
  type SocialLinkInput,
  type SidebarItemInput,
  type SidebarGroupInput,
  type DevConfigInput,
  type SiteConfigInput,
  asNavItem,
  asSidebarItem,
  asSidebarGroup,
  asSocialLink,
  asDevConfig,
  asSiteConfig,
  defineSite,
} from "plggpress/SiteConfig/model/SiteConfig";

// Content models (D8) — the typed custom-attributes surface
// a `site.config` declares: field builders, the model/
// binding builders, the boundary casters, the frontmatter
// caster, and the build-time model check. This is the only
// surface `site.config.ts` can reach.
export {
  type ScalarKind,
  type FieldType,
  type Field,
  type ContentModel,
  type ContentModelBinding,
  textField,
  numberField,
  booleanField,
  listField,
  groupField,
  contentModel,
  bindModel,
} from "plggpress/ContentModel/model/ContentModel";
export {
  type ModelViolation,
  type ModelViolations,
  modelViolations,
  modelViolations$,
} from "plggpress/ContentModel/model/ModelViolation";
export {
  casterOf,
  asFieldType,
  asField,
  asContentModel,
  asContentModelBinding,
  asBindings,
} from "plggpress/ContentModel/usecase";
export {
  type Page,
  checkModels,
} from "plggpress/ContentModel/usecase/checkModels";

export {
  href,
  isExternalHref,
} from "plggpress/Href/usecase/href";

// The content router builder + the build spec factory —
// the public SSG-engine surface a dynamic consumer
// (plgg-cms) composes its served app onto, alongside the
// `plggpress/framework` seam.
export { pressRouter } from "plggpress/router/pressRouter";
export { buildSpecOf } from "plggpress/Press/usecase/appSpecs";

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
