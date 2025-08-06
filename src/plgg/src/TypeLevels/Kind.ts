export interface KindKeytoKind1<A> {}
export interface KindKeytoKind2<A, B> {}
// @ts-ignore will have ReaderTaskResult
export interface KindKeytoKind3<A, B, C> {}

export type KindKeys1 = keyof KindKeytoKind1<unknown>;
export type KindKeys2 = keyof KindKeytoKind2<unknown, unknown>;
export type KindKeys3 = keyof KindKeytoKind3<unknown, unknown, unknown>;

export type Kind1<KindKey extends KindKeys1, A> = KindKeytoKind1<A>[KindKey];
export type Kind2<KindKey extends KindKeys2, A, B> = KindKeytoKind2<
  A,
  B
>[KindKey];
export type Kind3<KindKey extends KindKeys3, A, B, C> = KindKeytoKind3<
  A,
  B,
  C
>[KindKey];
