import {
  DatumCore,
  Option,
  JsonReadyCore,
  isOption,
  isSome,
  isNone,
  isDatumCore,
  toJsonReadyCore,
  some,
  none,
  isJsonReady,
} from "plgg/index";

export type OptionalDatum<T extends DatumCore> =
  Option<T>;

export const isOptionalDatum = <
  T extends DatumCore,
>(
  value: unknown,
): value is OptionalDatum<T> =>
  isSome(value)
    ? isDatumCore(value.content)
    : isNone(value);

export const toJsonReadyOptionalDatum = <
  T extends DatumCore,
>(
  value: OptionalDatum<T>,
): OptionalDatumJsonReady<JsonReadyCore> =>
  isSome(value)
    ? some(toJsonReadyCore(value.content))
    : none();

// --------------------------------
// JsonReady
// --------------------------------

export type OptionalDatumJsonReady<
  T extends JsonReadyCore,
> = Option<T>;

export const isJsonReadyOptionalDatum = <
  T extends JsonReadyCore,
>(
  value: unknown,
): value is OptionalDatumJsonReady<T> =>
  isOption(value) &&
  (isSome(value)
    ? isJsonReady(value.content)
    : true);
