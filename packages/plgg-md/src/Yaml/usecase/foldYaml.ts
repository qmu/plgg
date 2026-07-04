import { match } from "plgg";
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
} from "plgg-md/Yaml/model/YamlValue";

type Prim = string | number | boolean;

/** Collapses a scalar to its plain JS value. */
const foldScalar = (s: YScalar): Prim =>
  match(s)(
    [yStr$(), ({ content }): Prim => content],
    [yNum$(), ({ content }): Prim => content],
    [yBool$(), ({ content }): Prim => content],
  );

/** Collapses a value (scalar, seq of scalars, or map). */
const foldValue = (v: YValue): unknown =>
  match(v)(
    [yStr$(), ({ content }): unknown => content],
    [yNum$(), ({ content }): unknown => content],
    [yBool$(), ({ content }): unknown => content],
    [
      ySeq$(),
      ({ content }): unknown =>
        content.map(foldScalar),
    ],
    [
      yMap$(),
      ({ content }): unknown =>
        Object.fromEntries(
          content.map(
            ([k, s]: YEntry<YScalar>) => [
              k,
              foldScalar(s),
            ],
          ),
        ),
    ],
  );

/**
 * The ONE-TRUTH bridge (D8): collapses a parsed
 * {@link YamlMap} to plain JSON-ish data (a record of
 * string/number/boolean/array/record) so the ORDINARY
 * plgg casters (`cast`/`asObj`/`forProp`/…) validate
 * frontmatter with the SAME vocabulary that validates
 * `site.config`. That shared validation is what "both
 * layers, one truth" cashes out to.
 */
export const foldYaml = (
  document: YamlMap,
): Readonly<Record<string, unknown>> =>
  Object.fromEntries(
    document.map(
      ([k, v]: YEntry<YValue>) => [
        k,
        foldValue(v),
      ],
    ),
  );
