import {
  KindKeys1,
  KindKeys2,
  KindKeys3,
  KindKeys1Rec,
  Apply1,
  Apply2,
  Apply3,
  Apply1Rec,
  Pointed1,
  Pointed2,
  Pointed3,
  Pointed1Rec,
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
 * Applicative functor interface for single-parameter record type constructors.
 * Combines Apply1Rec and Pointed1Rec to provide both function application and record value lifting.
 */
export interface Applicative1Rec<
  KindKey extends KindKeys1Rec,
> extends Apply1Rec<KindKey>,
    Pointed1Rec<KindKey> {}
