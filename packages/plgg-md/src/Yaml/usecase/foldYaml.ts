import {
  type SoftStr,
  type Option,
  some,
  none,
  match,
  matchOption,
  pipe,
} from "plgg";
import {
  type YScalar,
  type YValue,
  type YEntry,
  type YamlMap,
  yStr$,
  yNum$,
  yBool$,
  ySeq$,
  yMap$,
  yNone$,
} from "plgg-md/Yaml/model/YamlValue";

type Prim = string | number | boolean;

/** Collapses a scalar to its plain JS value. */
const foldScalar = (s: YScalar): Prim =>
  match(s)(
    [yStr$(), ({ content }): Prim => content],
    [yNum$(), ({ content }): Prim => content],
    [yBool$(), ({ content }): Prim => content],
  );

/**
 * Collapses a value to the plain data it denotes, or
 * `None` for a `YNone` — the bare `key:` whose folded form
 * is not a value at all but the ABSENCE of the key. Every
 * other arm always produces something, so the `Option` is
 * carried only to let {@link foldYaml} drop the entry.
 */
const foldValue = (v: YValue): Option<unknown> =>
  match(v)(
    [
      yStr$(),
      ({ content }): Option<unknown> =>
        some(content),
    ],
    [
      yNum$(),
      ({ content }): Option<unknown> =>
        some(content),
    ],
    [
      yBool$(),
      ({ content }): Option<unknown> =>
        some(content),
    ],
    [
      ySeq$(),
      ({ content }): Option<unknown> =>
        some(content.map(foldScalar)),
    ],
    [
      yMap$(),
      ({ content }): Option<unknown> =>
        some(
          Object.fromEntries(
            content.map(
              ([k, s]: YEntry<YScalar>) => [
                k,
                foldScalar(s),
              ],
            ),
          ),
        ),
    ],
    [yNone$(), (): Option<unknown> => none()],
  );

/**
 * The ONE-TRUTH bridge (D8): collapses a parsed
 * {@link YamlMap} to plain JSON-ish data (a record of
 * string/number/boolean/array/record) so the ORDINARY
 * plgg casters (`cast`/`asObj`/`forProp`/…) validate
 * frontmatter with the SAME vocabulary that validates
 * `site.config`. That shared validation is what "both
 * layers, one truth" cashes out to.
 *
 * A `YNone` key (`commit_hash:`) is OMITTED rather than
 * folded to a present `null`/`undefined`. That is what
 * makes the bridge hold: the house wire convention is that
 * an absent field is missing, never `null` — `forOptionProp`
 * FAILS on a present `null` — so omitting is precisely what
 * lets `forOptionProp("commit_hash", asStr)` read a bare
 * `commit_hash:` as `None` with no YAML-specific handling
 * at the caster layer.
 */
export const foldYaml = (
  document: YamlMap,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    document.flatMap(([k, v]: YEntry<YValue>) =>
      pipe(
        foldValue(v),
        matchOption<
          unknown,
          ReadonlyArray<
            readonly [SoftStr, unknown]
          >
        >(
          () => [],
          (folded: unknown) => [[k, folded]],
        ),
      ),
    ),
  );
