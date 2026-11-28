# plgg-bundle — Bundle a library

Set the entry points and formats in the package’s `bundle.config.ts`. Run `npx plgg-bundle` in that directory to emit JavaScript according to the config. Library builds support ES modules, CommonJS, and type declarations. Use an app target for a browser bundle.

External dependencies are derived from package.json.

## Working with the API

`build(config: BundleConfig) → ReadonlyArray<string>`

build runs synchronously and returns relative output paths. Downstream libraries also read the emitted declarations. The bundler builds into a staging directory before swapping it into place to minimize partial output exposure.

## Read a library configuration

Open packages/plgg-http/bundle.config.ts in this checkout to see how source files map to output names. Each entry input is relative to rootDir. An import from a declared dependency’s public subpath stays external for the consumer to resolve. If a build reports an undeclared dependency, check `package.json` first.
