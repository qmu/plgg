import {
  Kind1,
  Kind2,
  Kind3,
  KindKeys1,
  KindKeys2,
  KindKeys3,
} from "plgg/TypeLevels";

export interface Pointed1<KindKey extends KindKeys1> {
  readonly KindKey: KindKey;
  of: <A>(a: A) => Kind1<KindKey, A>;
}

export interface Pointed2<KindKey extends KindKeys2> {
  readonly KindKey: KindKey;
  of: <A = never, B = never>(a: A) => Kind2<KindKey, A, B>;
}

export interface Pointed3<KindKey extends KindKeys3> {
  readonly KindKey: KindKey;
  of: <A = never, B = never, C = never>(a: A) => Kind3<KindKey, A, B, C>;
}