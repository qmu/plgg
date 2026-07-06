import { Option, Result } from "plgg";
import { Subject } from "plgg-auth/Oidc/model/Tokens";
import { AccountStore } from "plgg-auth/Account/model/AccountStore";
import { Role } from "plgg-auth/Account/model/Role";
import {
  AccountError,
  liftAccountStore,
} from "plgg-auth/Account/model/AccountError";

/**
 * The membership predicate: which {@link Role} a {@link Subject} may act as
 * (`None` = anonymous authority only). Side-effect-free on read — this is the
 * pure predicate the authorization-boundary route tests (ticket 20) assert
 * against, so it stays store-driven and never mutates.
 */
export const roleOf =
  (store: AccountStore) =>
  (
    subject: Subject,
  ): Promise<Result<Option<Role>, AccountError>> =>
    liftAccountStore(() =>
      store.findRole(subject),
    );
