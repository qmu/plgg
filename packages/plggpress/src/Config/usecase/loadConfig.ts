import {
  type SoftStr,
  type PromisedResult,
} from "plgg";
import { loadConfig as loadAppConfig } from "plggpress/framework";
import {
  type SiteConfig,
  asSiteConfig,
} from "plggpress/SiteConfig/model/SiteConfig";
import { type ConfigLoadError } from "plggpress/Press/model/PressError";

/**
 * Load and validate the consumer's `site.config` from a
 * path: the framework's generic config loader (the dynamic
 * `import` + default-pick + typed-error machinery) bound
 * to the press {@link asSiteConfig} boundary caster. A
 * missing file, an import-time throw, or a validation
 * miss becomes a typed {@link ConfigLoadError} — config
 * loading never throws.
 */
export const loadConfig = (
  path: SoftStr,
): PromisedResult<SiteConfig, ConfigLoadError> =>
  loadAppConfig(path, asSiteConfig);
