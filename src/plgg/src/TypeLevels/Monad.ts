import {
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Chain1,
  Chain2,
  Chain3,
  Applicative1,
  Applicative2,
  Applicative3,
} from "plgg/TypeLevels";

/**
 * Monad interface for single-parameter type constructors.
 * Combines Chain (flatMap/bind) and Applicative (pure + apply) capabilities.
 * 
 * Monad laws:
 * - Left Identity: chain(of(a), f) === f(a)
 * - Right Identity: chain(m, of) === m
 * - Associativity: chain(chain(m, f), g) === chain(m, x => chain(f(x), g))
 * 
 * @template KindKey - The kind identifier for this monad
 * @example
 * // Option implements Monad1
 * const optionMonad: Monad1<"Option"> = {
 *   KindKey: "Option",
 *   map: (f) => (opt) => isSome(opt) ? some(f(opt.content)) : none(),
 *   of: (a) => some(a),
 *   ap: (optF) => (optA) => isSome(optF) && isSome(optA) ? some(optF.content(optA.content)) : none(),
 *   chain: (f) => (opt) => isSome(opt) ? f(opt.content) : none()
 * };
 */
export interface Monad1<KindKey extends KindKeys1>
  extends Chain1<KindKey>,
    Applicative1<KindKey> {}

/**
 * Monad interface for two-parameter type constructors.
 * 
 * @template KindKey - The kind identifier for this monad
 */
export interface Monad2<KindKey extends KindKeys2>
  extends Chain2<KindKey>,
    Applicative2<KindKey> {}

/**
 * Monad interface for three-parameter type constructors.
 * 
 * @template KindKey - The kind identifier for this monad
 */
export interface Monad3<KindKey extends KindKeys3>
  extends Chain3<KindKey>,
    Applicative3<KindKey> {}
