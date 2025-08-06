import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
} from "plgg/TypeLevels";

export interface Functor1<KindKey extends KindKeys1> {
  readonly KindKey: KindKey;
  map: <A, B>(f: (a: A) => B) => (fa: Kind1<KindKey, A>) => Kind1<KindKey, B>;
}

export interface Functor2<KindKey extends KindKeys2> {
  readonly KindKey: KindKey;
  map: <A, B, C>(
    f: (a: A) => B,
  ) => (fa: Kind2<KindKey, A, C>) => Kind2<KindKey, B, C>;
}

export interface Functor3<KindKey extends KindKeys3> {
  readonly KindKey: KindKey;
  map: <A, B, C, D>(
    f: (a: A) => B,
  ) => (fa: Kind3<KindKey, A, C, D>) => Kind3<KindKey, B, C, D>;
}
