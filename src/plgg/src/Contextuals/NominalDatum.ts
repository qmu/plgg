import {
  Box,
  DatumCore,
  JsonReadyCore,
  isDatumCore,
  isJsonReady,
  toJsonReadyCore,
  isBox,
} from "plgg/index";

/**
 * Nominal type wrapper for DatumCore using Box.
 * Provides not-zero-cost nominal typing by wrapping values in a Box structure.
 */
export type NominalDatum<
  BRAND extends string,
  T extends DatumCore,
> = Box<BRAND, T>;

/**
 * Creates a nominal datum with the specified brand.
 */
export const createNominalDatum = <
  BRAND extends string,
  T extends DatumCore,
>(
  brand: BRAND,
  value: T,
): NominalDatum<BRAND, T> => ({
  __tag: brand,
  content: value,
});

/**
 * Type guard to check if a value is a nominal datum with a specific brand.
 */
export const isNominalDatum = <
  T extends DatumCore,
>(
  value: unknown,
): value is NominalDatum<string, T> =>
  isBox(value) && isDatumCore(value.content);

/**
 * Extracts the underlying value from a nominal datum.
 */
export const unwrapNominalDatum = <
  BRAND extends string,
  T extends DatumCore,
>(
  nominalDatum: NominalDatum<BRAND, T>,
): T => nominalDatum.content;

/**
 * Maps a function over the content of a nominal datum.
 */
export const mapNominalDatum =
  <
    BRAND extends string,
    T extends DatumCore,
    U extends DatumCore,
  >(
    fn: (value: T) => U,
  ) =>
  (
    nominalDatum: NominalDatum<BRAND, T>,
  ): NominalDatum<BRAND, U> => ({
    __tag: nominalDatum.__tag,
    content: fn(nominalDatum.content),
  });

// --------------------------------
// JsonReady
// --------------------------------

/**
 * JsonReady version of NominalDatum.
 */
export type NominalDatumJsonReady<
  BRAND extends string,
  T extends JsonReadyCore,
> = Box<BRAND, T>;

/**
 * Converts a NominalDatum to its JsonReady equivalent.
 */
export const toJsonReadyNominalDatum = <
  BRAND extends string,
  T extends DatumCore,
>(
  nominalDatum: NominalDatum<BRAND, T>,
): NominalDatumJsonReady<
  BRAND,
  JsonReadyCore
> => ({
  __tag: nominalDatum.__tag,
  content: toJsonReadyCore(nominalDatum.content),
});

/**
 * Type guard for JsonReady nominal datum.
 */
export const isJsonReadyNominalDatum = <
  T extends JsonReadyCore,
>(
  value: unknown,
): value is NominalDatumJsonReady<string, T> =>
  isBox(value) && isJsonReady(value.content);
