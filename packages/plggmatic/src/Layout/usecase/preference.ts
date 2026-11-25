import {
  type SoftStr,
  pipe,
  tryCatch,
  matchResult,
} from "plgg";

/**
 * Where a yes/no preference is kept. `Storage`'s two
 * methods, taken as a function so a test hands in a map
 * and a browser hands in `localStorage` — and because
 * merely touching `localStorage` can throw (a private
 * window, a blocked site), which is why it is reached
 * late and inside a guard.
 */
export type PreferenceStore = () => Pick<
  Storage,
  "getItem" | "setItem"
>;
/** The reading half of a {@link PreferenceStore}. */
export type PreferenceReader = () => Pick<
  Storage,
  "getItem"
>;
/** The writing half of a {@link PreferenceStore}. */
export type PreferenceWriter = () => Pick<
  Storage,
  "setItem"
>;

/**
 * A remembered yes/no — a menu folded to its rail, a panel
 * minimised. Absent, unreadable or anything but `"1"`
 * reads as no: a preference is a convenience, and the page
 * must lay out without it.
 */
export const readPreference = (
  key: SoftStr,
  store: PreferenceReader = () => localStorage,
): boolean =>
  pipe(
    tryCatch(() => store().getItem(key) === "1")(
      undefined,
    ),
    matchResult(
      (): boolean => false,
      (value: boolean): boolean => value,
    ),
  );

/**
 * Remember a yes/no as `"1"`/`"0"`. A store that refuses
 * is ignored: the choice still holds for this page.
 */
export const savePreference = (
  key: SoftStr,
  on: boolean,
  store: PreferenceWriter = () => localStorage,
): boolean =>
  pipe(
    tryCatch(() => {
      store().setItem(key, on ? "1" : "0");
      return true;
    })(undefined),
    matchResult(
      (): boolean => false,
      (saved: boolean): boolean => saved,
    ),
  );
