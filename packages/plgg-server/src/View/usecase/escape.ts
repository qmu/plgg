/**
 * HTML escaping and the safe-attribute-name guard live in plgg-view (the one
 * home, shared by its SSR string renderer and client DOM renderer). plgg-server
 * re-exports them so server-side markup assembly (e.g. {@link htmlDocument})
 * escapes through the same functions the view layer does — no second copy to
 * drift out of sync.
 */
export {
  escapeText,
  escapeAttr,
  isSafeAttrName,
} from "plgg-view";
