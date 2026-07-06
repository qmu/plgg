import {
  Box,
  SoftStr,
  Option,
  Result,
  box,
  ok,
  err,
  pattern,
  fromNullable,
  foldThrown,
  tryCatch,
} from "plgg";

/**
 * The closed kinds of an {@link AccountError}. `StoreFailure` — the account
 * store rejected; `HashFailure` — a WebCrypto operation threw; `DecodeFailure` —
 * a stored value (a password hash) could not be parsed; `InvalidInvite` — an
 * invite is unknown, expired, or already redeemed (one outward reason, so no
 * token-existence oracle leaks).
 */
export type AccountErrorKind =
  | "StoreFailure"
  | "HashFailure"
  | "DecodeFailure"
  | "InvalidInvite";

/**
 * A failure in the account domain. Pure tagged data (a `Box`, not an `Error`
 * subclass), so it rides the `Result` channel like every plgg error and never
 * carries a plaintext secret in its `message`.
 */
export type AccountError = Box<
  "AccountError",
  {
    kind: AccountErrorKind;
    message: SoftStr;
    cause: Option<unknown>;
  }
>;

const make =
  (kind: AccountErrorKind) =>
  (
    message: SoftStr,
    cause?: unknown,
  ): AccountError =>
    box("AccountError")({
      kind,
      message,
      cause: fromNullable(cause),
    });

/** The account store rejected an operation. */
export const storeFailure = make("StoreFailure");

/** A WebCrypto (PBKDF2 / digest) operation failed. */
export const hashFailure = make("HashFailure");

/** A stored password hash could not be parsed. */
export const decodeFailure = make(
  "DecodeFailure",
);

/** An invite is unknown, expired, or already redeemed. */
export const invalidInvite = make(
  "InvalidInvite",
);

/** Pattern matcher for folding an {@link AccountError} by tag. */
export const accountError$ = () =>
  pattern("AccountError")();

/** The discriminating kind of an {@link AccountError}. */
export const accountErrorKind = (
  e: AccountError,
): AccountErrorKind => e.content.kind;

/** Fold a rejected store promise's cause into a `StoreFailure`. */
const toStoreFailure = (
  cause: unknown,
): AccountError =>
  foldThrown<AccountError>(
    (e) => storeFailure(e.message, e),
    () =>
      storeFailure(
        "account store operation failed",
      ),
  )(cause);

/** Fold a thrown WebCrypto cause into a `HashFailure`. */
const toHashFailure = (
  cause: unknown,
): AccountError =>
  foldThrown<AccountError>(
    (e) => hashFailure(e.message, e),
    () =>
      hashFailure("crypto operation failed"),
  )(cause);

/**
 * Run a store operation, folding a rejected promise into a value-level
 * `StoreFailure` — the account-domain twin of plgg-auth's `liftStore`. Store
 * methods throw (through their `run`/`rows` helpers); usecases wrap each call
 * `await liftAccountStore(() => store.x())` and guard with `isErr`.
 */
export const liftAccountStore = <T>(
  op: () => Promise<T>,
): Promise<Result<T, AccountError>> =>
  op().then(
    (value): Result<T, AccountError> =>
      ok(value),
    (cause): Result<T, AccountError> =>
      err(toStoreFailure(cause)),
  );

/**
 * Run a WebCrypto operation, folding a thrown value into a `HashFailure` — the
 * account-domain twin of the Jose layer's `liftJose`, built on plgg's async
 * `tryCatch`.
 */
export const liftCrypto = <T>(
  op: () => Promise<T>,
): Promise<Result<T, AccountError>> =>
  tryCatch(
    (f: () => Promise<T>): Promise<T> => f(),
    (cause): AccountError => toHashFailure(cause),
  )(op);
