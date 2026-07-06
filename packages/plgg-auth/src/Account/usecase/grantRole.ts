import { Result } from "plgg";
import { Subject } from "plgg-auth/Oidc/model/Tokens";
import { AccountStore } from "plgg-auth/Account/model/AccountStore";
import { Role } from "plgg-auth/Account/model/Role";
import {
  AccountError,
  liftAccountStore,
} from "plgg-auth/Account/model/AccountError";

/** Grant (upsert) a {@link Role} to a {@link Subject}. */
export const grantRole =
  (store: AccountStore) =>
  (
    subject: Subject,
    role: Role,
  ): Promise<Result<void, AccountError>> =>
    liftAccountStore(() =>
      store.setRole(subject, role),
    );
