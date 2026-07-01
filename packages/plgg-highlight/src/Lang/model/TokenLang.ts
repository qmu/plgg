import { SoftStr } from "plgg";

/**
 * A normalized fence language in the **TS-scanner set** —
 * the closed enum of tokens that route to the
 * TypeScript-based highlighter (`spike-decisions.md` §2).
 * A bounded string union (like `plgg-view`'s `Color`),
 * not a `Box`, because it carries no payload: it is a
 * dispatch label, and every member routes to the same TS
 * highlighter today.
 */
export type TokenLang =
  | "ts"
  | "tsx"
  | "js"
  | "jsx"
  | "json";

/**
 * The case-insensitive alias map from a raw fence token to
 * its {@link TokenLang}, transcribed from the corpus spike
 * inventory (`spike-decisions.md` §2): `typescript`/`ts`
 * → `ts`, `javascript`/`js` → `js`, and the forward-compat
 * `tsx`/`jsx`/`json` rows. Any token absent from this map
 * (`bash`, `sh`, `text`, unlabeled, …) has no TS route and
 * takes the plain fallback. A plain record so an unknown
 * key reads as `undefined` (lifted to `None` by the
 * caster), never throws.
 */
export const TOKEN_LANG_ALIAS: Readonly<
  Record<SoftStr, TokenLang>
> = {
  typescript: "ts",
  ts: "ts",
  javascript: "js",
  js: "js",
  tsx: "tsx",
  jsx: "jsx",
  json: "json",
};
