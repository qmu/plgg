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

export interface Monad1<KindKey extends KindKeys1>
  extends Chain1<KindKey>,
    Applicative1<KindKey> {}

export interface Monad2<KindKey extends KindKeys2>
  extends Chain2<KindKey>,
    Applicative2<KindKey> {}

export interface Monad3<KindKey extends KindKeys3>
  extends Chain3<KindKey>,
    Applicative3<KindKey> {}
