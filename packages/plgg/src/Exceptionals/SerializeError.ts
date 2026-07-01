import {
  Box,
  SoftStr,
  box,
  pattern,
} from "plgg/index";

/**
 * Serialization failure as pure tagged data — a `Box`, not an `Error` subclass.
 */
export type SerializeError = Box<
  "SerializeError",
  { message: SoftStr }
>;

/**
 * Constructs a {@link SerializeError}. Object-arg so call sites migrate by
 * dropping `new`.
 */
export const serializeError = ({
  message,
}: {
  message: SoftStr;
}): SerializeError =>
  box("SerializeError")({ message });

/**
 * Pattern matcher for folding a {@link SerializeError} with `match` by tag.
 */
export const serializeError$ = () =>
  pattern("SerializeError")();
