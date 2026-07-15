import {
  type SoftStr,
  type Option,
  none,
  some,
  match,
  matchOption,
  fromNullable,
} from "plgg";
import {
  type YValue,
  type YamlMap,
  yStr$,
  yNum$,
  yBool$,
  ySeq$,
  yMap$,
  yNone$,
} from "plgg-md/Yaml/model/YamlValue";

/**
 * The parsed leading frontmatter (D8). The full `---`
 * block is parsed into a {@link YamlMap} (the YAML SUBSET
 * — see `YamlValue`) carried in `data` (`None` when the
 * page has no fence). `layout` stays for `MarkdownDoc`,
 * the theme, and `notFound` — now DERIVED from the map's
 * `layout` key when it is a string, so those readers keep
 * compiling unchanged. Supersedes the old
 * layout-marker-only model (`spike-decisions.md` §6b was
 * corpus-driven; the CMS vision changed the requirement).
 */
export type Frontmatter = Readonly<{
  layout: Option<SoftStr>;
  data: Option<YamlMap>;
}>;

/** The `layout` string of a map, when present as a string. */
const layoutOf = (
  data: Option<YamlMap>,
): Option<SoftStr> =>
  matchOption<YamlMap, Option<SoftStr>>(
    () => none(),
    (map: YamlMap) =>
      matchOption<
        readonly [SoftStr, YValue],
        Option<SoftStr>
      >(
        () => none(),
        ([, v]: readonly [SoftStr, YValue]) =>
          match(v)(
            [
              yStr$(),
              ({ content }): Option<SoftStr> =>
                some(content),
            ],
            [
              yNum$(),
              (): Option<SoftStr> => none(),
            ],
            [
              yBool$(),
              (): Option<SoftStr> => none(),
            ],
            [
              ySeq$(),
              (): Option<SoftStr> => none(),
            ],
            [
              yMap$(),
              (): Option<SoftStr> => none(),
            ],
            [
              yNone$(),
              (): Option<SoftStr> => none(),
            ],
          ),
      )(
        fromNullable(
          map.find(([k]) => k === "layout"),
        ),
      ),
  )(data);

/**
 * Builds a {@link Frontmatter} from the parsed block
 * (`None` for a fence-less page), deriving `layout`.
 */
export const frontmatter = (
  data: Option<YamlMap>,
): Frontmatter => ({
  data,
  layout: layoutOf(data),
});
