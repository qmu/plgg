import {
  Option,
  SoftStr,
  none,
  some,
} from "plgg/index";

/**
 * Base error class for all Plgg errors.
 */
export class BaseError extends Error {
  /**
   * Error name identifier.
   */
  public name = "BaseError";

  /**
   * Brand identifier for Plgg error types.
   */
  public __ = "PlggError";

  /**
   * Optional additional detail about the error.
   */
  public detail: Option<string> = none();

  /**
   * Optional parent error for error chaining.
   */
  public parent: Option<BaseError | Error> =
    none();

  /**
   * Box content — a structured payload object, so a plgg error satisfies the
   * `Box` shape (`{ __tag, content }`) and folds through `match`. Object-shaped
   * (not the bare message string) because error content is heterogeneous and
   * richer variants carry more fields; subclasses widen this payload. A
   * non-enumerable getter, so it does not change enumeration or JSON output;
   * each subclass also supplies the discriminating `__tag`.
   */
  public get content(): Readonly<{ message: SoftStr }> {
    return { message: this.message };
  }

  /**
   * Creates a new BaseError instance.
   */
  constructor(
    message: string,
    parent?: BaseError | Error,
  ) {
    super(message);
    this.parent = parent ? some(parent) : none();
  }
}
