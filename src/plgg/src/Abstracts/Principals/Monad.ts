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
  Chain1JsonSerializable,
  Applicative1JsonSerializable,
  KindKeys1JsonSerializable,
} from "plgg/index";

/**
 * Combines Chain and Applicative capabilities for single-parameter type constructors.
 */
export interface Monad1<KindKey extends KindKeys1>
  extends Chain1<KindKey>,
    Applicative1<KindKey> {}

/**
 * Combines Chain and Applicative capabilities for two-parameter type constructors.
 */
export interface Monad2<KindKey extends KindKeys2>
  extends Chain2<KindKey>,
    Applicative2<KindKey> {}

/**
 * Combines Chain and Applicative capabilities for three-parameter type constructors.
 */
export interface Monad3<KindKey extends KindKeys3>
  extends Chain3<KindKey>,
    Applicative3<KindKey> {}

/**
 * Combines Chain and Applicative capabilities for JsonSerializable single-parameter type constructors.
 */
export interface Monad1JsonSerializable<
  KindKey extends KindKeys1JsonSerializable,
> extends
  Chain1JsonSerializable<KindKey>,
  Applicative1JsonSerializable<KindKey> {}
