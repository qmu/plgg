import { Result } from "plgg";
import { Subject } from "plgg-auth/Oidc/model/Tokens";
import { AccountStore } from "plgg-auth/Account/model/AccountStore";
import {
  AccountError,
  liftAccountStore,
} from "plgg-auth/Account/model/AccountError";

/**
 * Revoke a {@link Subject}'s role — a single `DELETE`. The account survives; only
 * the authority is removed, so revocation is instant (no token to expire).
 */
export const revokeRole =
  (store: AccountStore) =>
  (
    subject: Subject,
  ): Promise<Result<void, AccountError>> =>
    liftAccountStore(() =>
      store.clearRole(subject),
    );
