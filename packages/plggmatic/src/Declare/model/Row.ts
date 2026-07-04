import { type SoftStr } from "plgg";

/**
 * One labelled cell of a {@link Row}'s detail. `label`
 * may be empty (a body paragraph has a value but no
 * caption) — the emptiness is presentation, so the value
 * is a plain string, not an `Option`.
 */
export type Field = Readonly<{
  label: SoftStr;
  value: SoftStr;
}>;

/**
 * The presentation-neutral projection of a collection
 * item — the ONLY item shape the scheduled model and the
 * renderer seam ever see (a typed `T` lives only at the
 * {@link Collection} boundary, captured by its `toRow`).
 * `label` is what a list shows; `fields` is what a detail
 * shows; `id` is the item identity used as the URL and
 * selection key. Mirrors the oracle's discipline: the
 * model holds ids, never the domain objects.
 */
export type Row = Readonly<{
  id: SoftStr;
  label: SoftStr;
  fields: ReadonlyArray<Field>;
}>;

/** Constructs a {@link Field}. */
export const field = (
  label: SoftStr,
  value: SoftStr,
): Field => ({ label, value });

/** Constructs a {@link Row}. */
export const row = (
  id: SoftStr,
  label: SoftStr,
  fields: ReadonlyArray<Field> = [],
): Row => ({ id, label, fields });
