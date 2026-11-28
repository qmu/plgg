# plgg-auth — Integrate sign-in

For an application signing users in through OpenID Connect, use the relying-party functions `beginLogin` and `completeLogin`. Start the authorization request with the first and complete the exchange after the callback with the second.

The provider side manages signing keys, authorization codes, and sessions. For SQL-backed state, prepare the tables with `applyAuthSchema` and pass your [Db](/packages/plgg-sql/) to `sqlStore`.

## Working with the API

`beginLogin(config)() → Promise<Result<LoginStart, RpError>>`

Redirect the browser to authorizeUrl and retain verifier, state and nonce for this login attempt. Restarting `beginLogin` at callback time creates different values. Pass the callback query and stashed LoginStart to `completeLogin`(config, transport).

```ts
import { asClientId } from "plgg-auth";

console.log(
  asClientId("").__tag,
  asClientId("library").__tag,
);
```

## Locate a callback failure

`completeLogin` checks the stashed state first, then looks for the code and exchanges it using the saved verifier. A successful exchange still requires signature, issuer, audience and nonce validation before accepting the subject. The configured clock supplies Unix seconds.
