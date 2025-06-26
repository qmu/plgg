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
  public __ = "DomainError";

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
  constructor(detail: string, parent?: BaseError | Error) {
    super(detail);
    this.parent = parent ? some(parent) : none();
  }
}
