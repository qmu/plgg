/**
 * Hosts the dev server always accepts, on top of the
 * config-supplied allowlist. Loopback is implicit so local
 * development needs no configuration.
 */
const DEFAULT_HOSTS: ReadonlyArray<string> = [
  "localhost",
  "127.0.0.1",
];

/**
 * The bare host name (any `:port` suffix stripped) of a
 * `Host`-header value. A value with no colon is returned
 * unchanged. `indexOf`/`slice` (not `split(":")[0]`) so
 * there is no unreachable `undefined` case to branch on.
 */
export const hostName = (
  host: string,
): string => {
  const colon = host.indexOf(":");
  return colon === -1
    ? host
    : host.slice(0, colon);
};

/**
 * The Host allowlist check (data-last): loopback plus the
 * config-supplied `allowedHosts`. Reproduces the tunnel
 * safety plggpress's dev server gave — the guide adds its
 * `*.qmu.dev` tunnel host so the Cloudflare tunnel is
 * accepted while arbitrary Host headers are refused.
 */
export const isAllowedHost =
  (allowedHosts: ReadonlyArray<string>) =>
  (host: string): boolean =>
    [
      ...DEFAULT_HOSTS,
      ...allowedHosts,
    ].includes(hostName(host));
