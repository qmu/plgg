# plgg-auth — Integrate sign-in

For an application signing users in through OpenID Connect, use the relying-party functions `beginLogin` and `completeLogin`. Start the authorization request with the first and complete the exchange after the callback with the second.

The provider side manages signing keys, authorization codes, and sessions. For SQL-backed state, prepare the tables with `applyAuthSchema` and pass your [Db](/packages/plgg-sql/) to `sqlStore`.
