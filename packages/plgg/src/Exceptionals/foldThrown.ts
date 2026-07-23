/**
 * Folds an unknown thrown value by whether it
 * is a real `Error`: `onError` receives the
 * narrowed `Error`, `onOther` receives every
 * other value. The single place the
 * `value instanceof Error` narrowing lives, so
 * adapters that lift a caught value into a
 * domain error stop re-deriving the fork by
 * hand.
 */
export const foldThrown =
  <R>(
    onError: (e: Error) => R,
    onOther: (v: unknown) => R,
  ) =>
  (value: unknown): R =>
    value instanceof Error
      ? onError(value)
      : onOther(value);
