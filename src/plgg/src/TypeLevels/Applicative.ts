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
} from "plgg/TypeLevels";

export interface Applicative1<KindKey extends KindKeys1> extends Apply1<KindKey>, Pointed1<KindKey> {}

export interface Applicative2<KindKey extends KindKeys2> extends Apply2<KindKey>, Pointed2<KindKey> {}

export interface Applicative3<KindKey extends KindKeys3> extends Apply3<KindKey>, Pointed3<KindKey> {}
