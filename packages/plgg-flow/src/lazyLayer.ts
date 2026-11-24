import { lazy, type Html } from "plgg-view";
import type { Change } from "./model";

const render = (build: () => Html<Change>) =>
  build();
export const lazyLayer = () => {
  const cache = new WeakMap<
    object,
    {
      inputs: readonly unknown[];
      html: Html<Change>;
    }
  >();
  return (
    owner: object,
    inputs: readonly unknown[],
    build: () => Html<Change>,
  ) => {
    const old = cache.get(owner);
    if (
      old &&
      old.inputs.length === inputs.length &&
      inputs.every((v, i) => v === old.inputs[i])
    )
      return old.html;
    const html = lazy(render, build);
    cache.set(owner, { inputs, html });
    return html;
  };
};
