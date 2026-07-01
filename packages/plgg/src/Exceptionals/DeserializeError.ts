import {
  Box,
  SoftStr,
  box,
  pattern,
} from "plgg/index";

/**
 * Deserialization failure as pure tagged data — a `Box`, not an `Error`
 * subclass.
 */
export type DeserializeError = Box<
  "DeserializeError",
  { message: SoftStr }
>;

/**
 * Constructs a {@link DeserializeError}. Object-arg so call sites migrate by
 * dropping `new`.
 */
export const deserializeError = ({
  message,
}: {
  message: SoftStr;
}): DeserializeError =>
  box("DeserializeError")({ message });

/**
 * Pattern matcher for folding a {@link DeserializeError} with `match` by tag.
 */
export const deserializeError$ = () =>
  pattern("DeserializeError")();
