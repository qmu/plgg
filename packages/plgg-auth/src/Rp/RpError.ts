import {
  type Box,
  type SoftStr,
  type Option,
  box,
  pattern,
  fromNullable,
} from "plgg";

/**
 * The kind of an {@link RpError}: which relying-party step
 * failed. A closed literal union so a fold over it is
 * exhaustive.
 */
export type RpErrorKind =
  | "StateMismatch"
  | "MissingCode"
  | "TokenExchangeFailed"
  | "InvalidIdToken"
  | "TransportError"
  | "Internal";

/**
 * A failure raised while driving the OIDC relying-party
 * flow. Pure tagged data (a `Box`) so it rides the
 * `Result`/`proc` channel — the RP client NEVER throws.
 */
export type RpError = Box<
  "RpError",
  {
    kind: RpErrorKind;
    message: SoftStr;
    cause: Option<unknown>;
  }
>;

const make =
  (kind: RpErrorKind) =>
  (message: SoftStr, cause?: unknown): RpError =>
    box("RpError")({
      kind,
      message,
      cause: fromNullable(cause),
    });

/** The callback `state` did not match the stashed value (CSRF). */
export const stateMismatch = make("StateMismatch");
/** The callback carried no authorization `code`. */
export const missingCode = make("MissingCode");
/** The token endpoint returned a non-200 / malformed body. */
export const tokenExchangeFailed = make(
  "TokenExchangeFailed",
);
/** The returned `id_token` failed shape or signature/claims validation. */
export const invalidIdToken = make("InvalidIdToken");
/** The transport itself failed (network / driver). */
export const transportError = make("TransportError");
/** An unexpected internal failure (e.g. PKCE compute). */
export const rpInternal = make("Internal");

/** Matcher for folding an {@link RpError}. */
export const rpError$ = () => pattern("RpError")();

/** Reads an {@link RpError}'s kind. */
export const rpErrorKind = (
  e: RpError,
): RpErrorKind => e.content.kind;
