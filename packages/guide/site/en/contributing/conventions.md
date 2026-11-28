# Contribute and verify a change

The examples import public APIs by package name. After the [workspace build](/getting-started/), open a package’s `README.md` for usage, or look under `src` for implementations and `*.spec.ts` files with sample inputs. For example, run `npm test` in `packages/plgg` to exercise the core types and functions.

## Typecheck and test separately

From the repository root, `sh scripts/tsc-plgg.sh` checks core. Run `node scripts/typecheck.ts plgg-router` for one package, or omit package names for the whole repository. Each package uses its own compiler process. Set the pool size with --jobs N. `sh scripts/test-plgg.sh` runs the core suite. Package `npm test` scripts do not typecheck.

## Verify in dependency order

Place `*.spec.ts` beside the public function and test real inputs and outputs. After changing a core export, run `npm run build` in `packages/plgg` before checking consumers. In `packages/guide` run npm run build. It extracts, typechecks and executes code from both editions, then builds the site and checks links. Run `npm run check:examples` for the examples alone.

## What reviewers check

Use `Option` for absence and `Result` for domain failure. Resolve type errors with guards or casters. Assertions and compiler suppression comments bypass that evidence. Prettier uses a width of 50. Prefer config-first functions and immutable transformations. Explain necessary imperative seams such as a DOM walk in a comment.

`scripts/check-all.sh` is the repository-wide entry point. Its gates check README links, dependencies, vendor import boundaries, framework class names and ad hoc UI, followed by builds and package verification.
