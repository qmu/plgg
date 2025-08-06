import { Option, none, some } from "plgg/index";

/**
 * Base Error
 */
export class BaseError extends Error {
  /**
   * Name
   */
  public name = "BaseError";

  /**
   * Brand
   */
  public __ = "PlggError";

  /**
   * Detail
   */
  public detail: Option<string> = none();

  /**
   * Parent
   */
  public parent: Option<BaseError | Error> = none();

  /**
   * Constructor
   */
  constructor(message: string, parent?: BaseError | Error) {
    super(message);
    this.parent = parent ? some(parent) : none();
  }
}
