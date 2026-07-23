import {
  Option,
  SoftStr,
  pipe,
  chainOption,
  fromNullable,
} from "plgg";
import {
  TokenLang,
  TOKEN_LANG_ALIAS,
} from "plgg-highlight/Lang/model/TokenLang";

/**
 * Normalize a raw code-fence language token (the
 * `Option<SoftStr>` plgg-md hands the {@link Highlighter},
 * `None` when the fence is unlabeled) to its
 * {@link TokenLang}. Trimmed and lowercased before the
 * alias lookup (`spike-decisions.md` §2 is
 * case-insensitive); an empty, unlabeled, or unknown token
 * yields `None`, which the highlighter reads as "take the
 * plain fallback". Pure, never throws.
 */
export const normalizeLang = (
  lang: Option<SoftStr>,
): Option<TokenLang> =>
  pipe(
    lang,
    chainOption((raw: SoftStr) =>
      fromNullable(
        TOKEN_LANG_ALIAS[raw.trim().toLowerCase()],
      ),
    ),
  );
