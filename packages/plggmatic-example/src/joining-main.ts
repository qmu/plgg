import { mapResult, none, pipe } from "plgg";
import {
  a,
  attr,
  href,
  managedHost,
  text,
  type Html,
} from "plgg-view";
import { makeRenderer } from "plgg-view/client";
import {
  attachJoining,
  type JoiningPolicy,
  shellPageClass,
  documentColumn,
  strip,
  shareClass,
  kitSystemCss,
  kitAppearanceCss,
} from "plggmatic";
import { defaultTheme } from "plggmatic/style";
import {
  childOrigin,
  childPolicy,
  parentPolicy,
  viewPath,
} from "./joining-policy.ts";

const root = document.body;
if (location.origin === childOrigin) {
  pipe(
    childPolicy,
    mapResult((policy: JoiningPolicy) =>
      attachJoining(root, policy, {}),
    ),
  );
} else {
  const style = document.createElement("style");
  style.textContent =
    kitSystemCss(defaultTheme) +
    kitAppearanceCss(defaultTheme);
  document.head.append(style);
  const target = childOrigin + viewPath;
  const render = makeRenderer<never>(
    root,
    () => {},
  );
  const paint = (
    columns: readonly Html<never>[],
  ) =>
    render(
      strip(
        [shareClass],
        [
          documentColumn(
            "/",
            none(),
            [shellPageClass],
            [
              a(
                [href(target)],
                [
                  text(
                    "Open the plggpress guide",
                  ),
                ],
              ),
            ],
          ),
          ...columns,
        ],
      ),
    );
  paint([]);
  pipe(
    parentPolicy,
    mapResult((policy: JoiningPolicy) =>
      attachJoining(root, policy, {
        mount: (url, frame) => {
          paint([
            documentColumn(
              url,
              none(),
              [shellPageClass],
              [
                a(
                  [
                    href(url),
                    attr("target", "_blank"),
                    attr("rel", "noopener"),
                  ],
                  [
                    text(
                      "Open directly · " +
                        childOrigin,
                    ),
                  ],
                ),
                managedHost(url, [], {
                  mount: (node) => {
                    node.append(frame);
                    return () => frame.remove();
                  },
                  update: () => {},
                }),
              ],
            ),
          ]);
          return () => paint([]);
        },
      }),
    ),
  );
}
