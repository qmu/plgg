import type { JoiningPolicy } from "plggmatic/Joining/model/policy";
type Message = Readonly<{
  protocol: "plggmatic.join";
  version: 1;
  kind: "hello" | "ready" | "accept";
  nonce: string;
  path: string;
}>;
export const message = (
  kind: Message["kind"],
  nonce: string,
  path: string,
): Message => ({
  protocol: "plggmatic.join",
  version: 1,
  kind,
  nonce,
  path,
});
export const isJoiningMessage = (
  v: unknown,
): v is Message =>
  typeof v === "object" &&
  v !== null &&
  "protocol" in v &&
  v.protocol === "plggmatic.join" &&
  "version" in v &&
  v.version === 1 &&
  "kind" in v &&
  (v.kind === "hello" ||
    v.kind === "ready" ||
    v.kind === "accept") &&
  "nonce" in v &&
  typeof v.nonce === "string" &&
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(
    v.nonce,
  ) &&
  "path" in v &&
  typeof v.path === "string";

export const matchesConnection =
  (
    kind: Message["kind"],
    nonce: string,
    path: string,
  ) =>
  (data: unknown): boolean =>
    isJoiningMessage(data) &&
    data.kind === kind &&
    data.nonce === nonce &&
    data.path === path;

export const mayAnswer =
  (sender: string, href: string, path: string) =>
  (policy: JoiningPolicy): boolean =>
    policy.embedders.some(
      (p) => p.origin === sender,
    ) &&
    policy.routes.some(
      (r) =>
        r.access === "public" && r.path === path,
    ) &&
    href === policy.origin + path + "?pm-embed=1";
