import {
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Apply1,
  Apply2,
  Apply3,
  Pointed1,
  Pointed2,
  Pointed3,
} from "plgg/index";

/**
 * Applicative functor interface for single-parameter type constructors.
 * Combines Apply (lift functions) and Pointed (pure/of) capabilities.
 *
 * Applicative laws:
 * - Identity: ap(of(id), v) === v
 * - Composition: ap(ap(ap(of(compose), u), v), w) === ap(u, ap(v, w))
 * - Homomorphism: ap(of(f), of(x)) === of(f(x))
 * - Interchange: ap(u, of(y)) === ap(of(f => f(y)), u)
 *
 * @template KindKey - The kind identifier for this applicative
 */
export interface Applicative1<
  KindKey extends KindKeys1,
> extends Apply1<KindKey>,
    Pointed1<KindKey> {}

/**
 * Applicative functor interface for two-parameter type constructors.
 *
 * @template KindKey - The kind identifier for this applicative
 */
export interface Applicative2<
  KindKey extends KindKeys2,
> extends Apply2<KindKey>,
    Pointed2<KindKey> {}

/**
 * Applicative functor interface for three-parameter type constructors.
 *
 * @template KindKey - The kind identifier for this applicative
 */
export interface Applicative3<
  KindKey extends KindKeys3,
> extends Apply3<KindKey>,
    Pointed3<KindKey> {}
