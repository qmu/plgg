import {
  DatumCore,
  Option,
  JsonReadyCore,
  isOption,
  isSome,
  isDatumCore,
  toJsonReadyCore,
  newSome,
  newNone,
  isJsonReady,
} from "plgg/index";

export type OptionalDatum<T extends DatumCore> =
  Option<T>;

export const isOptionalDatum = <
  T extends DatumCore,
>(
  value: unknown,
): value is OptionalDatum<T> =>
  isOption(value) &&
  (isSome(value)
    ? isDatumCore(value.content)
    : true);

export const toJsonReadyOptionalDatum = <
  T extends JsonReadyCore,
>(
  value: OptionalDatum<T>,
): OptionalDatumJsonReady<JsonReadyCore> =>
  isSome(value)
    ? newSome(toJsonReadyCore(value.content))
    : newNone();

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
