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
  Apply1JsonSerializable,
  Pointed1JsonSerializable,
  KindKeys1JsonSerializable,
} from "plgg/index";

/**
 * Applicative functor interface for single-parameter type constructors.
 * Combines Apply and Pointed capabilities to enable function application in context.
 */
export interface Applicative1<
  KindKey extends KindKeys1,
> extends Apply1<KindKey>,
    Pointed1<KindKey> {}

/**
 * Applicative functor interface for two-parameter type constructors.
 */
export interface Applicative2<
  KindKey extends KindKeys2,
> extends Apply2<KindKey>,
    Pointed2<KindKey> {}

/**
 * Applicative functor interface for three-parameter type constructors.
 */
export interface Applicative3<
  KindKey extends KindKeys3,
> extends Apply3<KindKey>,
    Pointed3<KindKey> {}

/**
 * Combines Apply and Pointed for JsonSerializable single-parameter types.
 */
export interface Applicative1JsonSerializable<
  KindKey extends KindKeys1JsonSerializable,
> extends
  Apply1JsonSerializable<KindKey>,
  Pointed1JsonSerializable<KindKey> {}
