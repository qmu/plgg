import { test, expect } from "vitest";
import { pipe } from "plgg";
import {
  createAdapter,
  type BunServer,
  type BunServeImpl,
} from "plgg-server/bun";
import { type Fetch } from "plgg-server/index";

const fakeServer: BunServer = { stop: () => {} };
const handler: Fetch = async () =>
  new Response("ok");

test("bun adapter forwards port and handler to the impl", () => {
  const calls: Array<Parameters<BunServeImpl>[0]> =
    [];
  const impl: BunServeImpl = (options) => {
    calls.push(options);
    return fakeServer;
  };
  const server = pipe(
    handler,
    createAdapter(impl)({ port: 3000 }),
  );
  expect(server).toBe(fakeServer);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.port).toBe(3000);
  expect(calls[0]?.hostname).toBeUndefined();
  expect(calls[0]?.fetch).toBe(handler);
});

test("bun adapter forwards an explicit hostname", () => {
  const calls: Array<Parameters<BunServeImpl>[0]> =
    [];
  const impl: BunServeImpl = (options) => {
    calls.push(options);
    return fakeServer;
  };
  createAdapter(impl)({
    port: 3000,
    hostname: "127.0.0.1",
  })(handler);
  expect(calls[0]?.hostname).toBe("127.0.0.1");
});

test("bun adapter invokes onListen after the server starts", () => {
  let listened = 0;
  const impl: BunServeImpl = () => fakeServer;
  createAdapter(impl)({ port: 0 }, () => {
    listened++;
  })(handler);
  expect(listened).toBe(1);
});

test("bun adapter omits onListen when not provided", () => {
  const impl: BunServeImpl = () => fakeServer;
  expect(() =>
    createAdapter(impl)({ port: 0 })(handler),
  ).not.toThrow();
});
