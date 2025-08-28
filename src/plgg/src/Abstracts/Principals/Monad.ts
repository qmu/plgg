import {
  KindKeys1,
  KindKeys2,
  KindKeys3,
  KindKeys1Rec,
  Chain1,
  Chain2,
  Chain3,
  Chain1Rec,
  Applicative1,
  Applicative2,
  Applicative3,
  Applicative1Rec,
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
 * Combines Chain1Rec and Applicative1Rec capabilities for single-parameter record type constructors.
 */
export interface Monad1Rec<
  KindKey extends KindKeys1Rec,
> extends Chain1Rec<KindKey>,
    Applicative1Rec<KindKey> {}
