THE MOST IMPORTANT RULE - `as` `any`, and `ts-ignore` is STRICTLY PROHIBITED as a solution to type errors under any circumstances.

* Fix compilation error with `scripts/tsc-plgg.sh`.
* Test with `scripts/test-plgg.sh`.
* Format with Prettier; every package carries its own `.prettierrc.json` (`printWidth: 50`) — don't hand-pack onto fewer lines.
* House coding style (type-driven design, Option/Result, exhaustive `match`, the no-escape-hatch rule) lives in the `plgg-coding-style` skill — follow it when writing any `packages/` TypeScript.
