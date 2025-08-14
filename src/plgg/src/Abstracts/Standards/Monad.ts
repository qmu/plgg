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
} from "plgg/index";

/**
 * Monad interface for single-parameter type constructors.
 * Combines Chain (flatMap/bind) and Applicative (pure + apply) capabilities.
 *
 * Monad laws:
 * - Left Identity: chain(of(a), f) === f(a)
 * - Right Identity: chain(m, of) === m
 * - Associativity: chain(chain(m, f), g) === chain(m, x => chain(f(x), g))
 *
 */
export interface Monad1<KindKey extends KindKeys1>
  extends Chain1<KindKey>,
    Applicative1<KindKey> {}

/**
 * Monad interface for two-parameter type constructors.
 *
 */
export interface Monad2<KindKey extends KindKeys2>
  extends Chain2<KindKey>,
    Applicative2<KindKey> {}

/**
 * Monad interface for three-parameter type constructors.
 *
 */
export interface Monad3<KindKey extends KindKeys3>
  extends Chain3<KindKey>,
    Applicative3<KindKey> {}
