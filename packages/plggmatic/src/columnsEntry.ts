/**
 * The `plggmatic/columns` subpath: the column strip's
 * LOGIC with nothing to render — the trail and its
 * address, the strip's geometry, where a column comes to
 * rest, and a remembered yes/no.
 *
 * It exists for a product that already draws its own
 * columns and wants the framework's rules under them
 * (corpd, the first to take this back, 2026-11-25). The
 * package root gathers every module of the framework into
 * one file, and a bundler that inlines dependencies whole
 * would carry the scheduler, the forms and the flow
 * interpreter into a page that asked for `foldTrail`.
 * This entry reaches only `plgg` and the framework's own
 * hook names, so it costs a page a few kilobytes.
 *
 * Everything here is also on the root; nothing is defined
 * here. An explicit named barrel (house style).
 */
export {
  type Trail,
  type TrailResolver,
  type TrailColumn,
  resolveTrail,
  settledTrail,
  foldTrail,
  stepFrom,
  restep,
} from "plggmatic/Navigate/model/Trail";
export {
  type StepCodec,
  trailParam,
  stepSeparator,
  encodeTrail,
  decodeTrail,
  trailQuery,
  printSteps,
  parseSteps,
} from "plggmatic/Navigate/usecase/trailUrl";
export {
  type StripMetrics,
  type MenuTrack,
  type StripGeometry,
  stripMetrics,
  stripGeometry,
  stripVar,
  stripStyle,
  visibleColumnStart,
  reachableScroll,
} from "plggmatic/Layout/model/geometry";
export {
  type Span,
  revealTarget,
  glideEase,
} from "plggmatic/Layout/model/reveal";
export {
  type RevealOptions,
  revealOptions,
  revealColumn,
} from "plggmatic/Layout/usecase/revealColumn";
export {
  type PreferenceStore,
  type PreferenceReader,
  type PreferenceWriter,
  readPreference,
  savePreference,
} from "plggmatic/Layout/usecase/preference";
export {
  menuOpenAttr,
  menuCompactAttr,
  phoneAttr,
  programmaticScrollAttr,
  widthAttr,
} from "plggmatic/Meta/model/classHooks";
