import {
  SoftStr,
  pipe,
  fromNullable,
  getOr,
} from "plgg";

/** FNV-1a 64-bit offset basis. */
const OFFSET = 0xcbf29ce484222325n;

/** FNV-1a 64-bit prime. */
const PRIME = 0x100000001b3n;

/** 64-bit wrap mask. */
const MASK = 0xffffffffffffffffn;

/**
 * A deterministic 16-hex-digit fingerprint of a string, via FNV-1a (64-bit).
 * Pure and dependency-free (no `node:crypto`, so it stays inside the vendor
 * boundary), and stable — the same input always yields the same digest — which
 * is what lets a domain's structural fingerprint identify a generation
 * reproducibly. It is a structural identity, not a cryptographic hash.
 */
export const fingerprint = (
  text: SoftStr,
): SoftStr =>
  Array.from(text)
    .reduce(
      (h, ch) =>
        ((h ^
          BigInt(
            pipe(
              fromNullable(ch.codePointAt(0)),
              getOr(0),
            ),
          )) *
          PRIME) &
        MASK,
      OFFSET,
    )
    .toString(16)
    .padStart(16, "0");
