/**
 * The `plggmatic/hooks` subpath: the class names of the
 * controls and the property list, with nothing else.
 *
 * It exists for a package that draws its own markup and
 * wants the kit to style it (plgg-ir-diagram's property
 * panel, 2026-11-26). The package root gathers every
 * module of the framework into one file, and a bundler
 * that inlines dependencies whole would carry all of it
 * into a page that asked for a class name. This entry
 * reaches only the hook names.
 *
 * Everything here is also on the root; nothing is defined
 * here. An explicit named barrel (house style).
 */
export {
  btnClass,
  inputClass,
  propsClass,
  propClass,
  propLabelClass,
  propControlClass,
  switchClass,
  switchTrackClass,
  switchThumbClass,
  switchLabelClass,
} from "plggmatic/Meta/model/classHooks";
