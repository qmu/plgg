import { Option, none, some, DomainError } from "plgg/index";

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
  public parent: Option<DomainError.t | Error> = none();

  /**
   * Constructor
   */
  constructor(detail: string, parent?: DomainError.t | Error) {
    super(detail);
    this.parent = parent ? some(parent) : none();
  }
}
