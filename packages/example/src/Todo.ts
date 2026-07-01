import type { SoftStr } from "plgg";

/**
 * A single to-do item — pure client-side data. This demo keeps todos in the
 * Elm-Architecture `Model` (no server/persistence); an HTTP-backed variant waits
 * for a future plgg-view `Cmd`/effects phase.
 */
export type Todo = Readonly<{
  id: number;
  title: SoftStr;
  completed: boolean;
}>;
