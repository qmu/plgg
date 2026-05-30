import { test, expect } from "vitest";
import { pipe } from "plgg";
import {
  createAdapter,
  type DenoServer,
  type DenoServeImpl,
} from "plgg-server/deno";
import { type Fetch } from "plgg-server/index";

const fakeServer: DenoServer = {
  shutdown: () => Promise.resolve(),
};
const handler: Fetch = async () =>
  new Response("ok");

test("deno adapter forwards port and handler to the impl", () => {
  const calls: Array<{
    options: Parameters<DenoServeImpl>[0];
    handler: Fetch;
  }> = [];
  const impl: DenoServeImpl = (options, h) => {
    calls.push({ options, handler: h });
    return fakeServer;
  };
  const server = pipe(
    handler,
    createAdapter(impl)({ port: 3000 }),
  );
  expect(server).toBe(fakeServer);
  expect(calls).toHaveLength(1);
  expect(calls[0]?.options.port).toBe(3000);
  expect(calls[0]?.options.hostname).toBeUndefined();
  expect(calls[0]?.handler).toBe(handler);
});

test("deno adapter forwards an explicit hostname", () => {
  const calls: Array<Parameters<DenoServeImpl>[0]> =
    [];
  const impl: DenoServeImpl = (options) => {
    calls.push(options);
    return fakeServer;
  };
  createAdapter(impl)({
    port: 3000,
    hostname: "127.0.0.1",
  })(handler);
  expect(calls[0]?.hostname).toBe("127.0.0.1");
});

test("deno adapter invokes onListen after the server starts", () => {
  let listened = 0;
  const impl: DenoServeImpl = () => fakeServer;
  createAdapter(impl)({ port: 0 }, () => {
    listened++;
  })(handler);
  expect(listened).toBe(1);
});

test("deno adapter omits onListen when not provided", () => {
  const impl: DenoServeImpl = () => fakeServer;
  expect(() =>
    createAdapter(impl)({ port: 0 })(handler),
  ).not.toThrow();
});
