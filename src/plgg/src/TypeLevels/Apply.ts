import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Functor1,
  Functor2,
  Functor3,
} from "plgg/TypeLevels";

export interface Apply1<KindKey extends KindKeys1> extends Functor1<KindKey> {
  ap: <A, B>(
    fab: Kind1<KindKey, (a: A) => B>,
  ) => (fa: Kind1<KindKey, A>) => Kind1<KindKey, B>;
}

export interface Apply2<KindKey extends KindKeys2> extends Functor2<KindKey> {
  ap: <A, B, C>(
    fab: Kind2<KindKey, (a: A) => B, C>,
  ) => (fa: Kind2<KindKey, A, C>) => Kind2<KindKey, B, C>;
}

export interface Apply3<KindKey extends KindKeys3> extends Functor3<KindKey> {
  ap: <A, B, C, D>(
    fab: Kind3<KindKey, (a: A) => B, C, D>,
  ) => (fa: Kind3<KindKey, A, C, D>) => Kind3<KindKey, B, C, D>;
}

