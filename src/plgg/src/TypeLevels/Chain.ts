import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
  Apply1,
  Apply2,
  Apply3,
} from "plgg/TypeLevels";

export interface Chain1<KindKey extends KindKeys1> extends Apply1<KindKey> {
  chain: <A, B>(
    f: (a: A) => Kind1<KindKey, B>,
  ) => (fa: Kind1<KindKey, A>) => Kind1<KindKey, B>;
}

export interface Chain2<KindKey extends KindKeys2> extends Apply2<KindKey> {
  chain: <A, B, C>(
    f: (a: A) => Kind2<KindKey, B, C>,
  ) => (fa: Kind2<KindKey, A, C>) => Kind2<KindKey, B, C>;
}

export interface Chain3<KindKey extends KindKeys3> extends Apply3<KindKey> {
  chain: <A, B, C, D>(
    f: (a: A) => Kind3<KindKey, B, C, D>,
  ) => (fa: Kind3<KindKey, A, C, D>) => Kind3<KindKey, B, C, D>;
}

