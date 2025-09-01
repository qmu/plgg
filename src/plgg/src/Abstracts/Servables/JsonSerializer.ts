import { Datum, JsonReady } from "plgg/index";

/**
 * Provides bidirectional conversion between Datum types and JsonReady representations.
 */
export interface JsonSerializer<
  T extends Datum,
  U extends JsonReady,
> {
  /**
   * Converts a Datum value to its JsonReady representation.
   */
  toJsonReady: (a: T) => U;
  /**
   * Converts a JsonReady representation back to its Datum form.
   */
  fromJsonReady: (a: U) => T;
}
