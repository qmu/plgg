---
title: Observability Policy
description: Logging practices, metrics collection, tracing, monitoring, and alerting for the plgg monorepo.
category: developer
modified_at: 2026-02-26T03:27:33+00:00
commit_hash: ddbb696
---

[English](observability.md) | [Japanese](observability_ja.md)

# Observability Policy

This document describes the observability practices implemented in the plgg monorepo. The repository consists of three published packages (`plgg`, `plgg-foundry`, `plgg-kit`) and an `example` package. All claims are grounded in observable artifacts. Areas with no codebase evidence are marked as "not observed."

## Logging Practices

The project provides two pipeline-level logging utilities exported from the `plgg` core package.

`debug` is a pass-through function that calls `console.debug` with the input value and returns the value unchanged. It is intended for use inside functional pipelines where a value must be inspected without interrupting the chain. It is implemented in `src/plgg/src/Functionals/debug.ts` and exported publicly from `src/plgg/src/Functionals/index.ts`.

`tap` is a higher-order pass-through function that accepts any side-effect function and returns a function that applies the side effect to a value and returns that value unchanged. Its documented use case includes logging within processing pipelines, as shown in test cases where `console.log` and custom logger functions are passed as the side-effect argument. It is implemented in `src/plgg/src/Functionals/tap.ts` and exported publicly from `src/plgg/src/Functionals/index.ts`.

`printPlggError` is a formatted error reporting function in `src/plgg/src/Exceptionals/PlggError.ts`. It collects the chain of nested `PlggError` instances and prints each to `console.error` using ANSI color codes: red for the outermost error constructor name, gray for call-site location and nested error names. This function is the designated mechanism for presenting domain error chains to a console.

There is no structured logging framework (e.g., Winston, Pino, Bunyan) in any package. Log calls are exclusively to the native `console` API (`console.debug`, `console.error`, `console.log`). No log levels beyond what the native `console` API provides are defined. No log formatting middleware or transport configuration exists.

The `plgg-kit` package includes a file `src/plgg-kit/TodoFoundry.ts` that calls `console.log` from inside a processor's side-effect function. This is a development-time example artifact, not a production logging convention.

The `plgg-foundry` package configures its vitest environment to load a `.env` file via `dotenv` (`src/plgg-foundry/vite.config.ts`), making environment variables (including potential API keys) available to tests. No logging configuration is influenced by environment variables in the observed codebase.

## Metrics Collection

Code coverage metrics are collected for the `plgg` package using vitest's v8 coverage provider. The reporters configured are `text`, `lcov`, and `html` (`src/plgg/vite.config.ts`). Coverage is collected for all files not excluded by the configured exclude list (node_modules, dist, coverage, spec files, index files, and the vite config itself). Enforced thresholds are 90% for statements, branches, functions, and lines.

Coverage metrics are uploaded as a CI artifact implicitly through the workflow step output in `run-tests.yml`. The CI step "Run tests with coverage" runs `npm run coverage` and will fail the workflow when any threshold is not met.

For `plgg-foundry` and `plgg-kit`, `coverage: { all: true }` is set in their respective `vite.config.ts` files but no thresholds are configured. Coverage can be generated for these packages manually but no CI step collects or enforces it.

No application performance metrics, request counters, latency histograms, or runtime instrumentation are implemented. No metrics backend (e.g., Prometheus, Datadog, StatsD) is configured.

## Tracing and Monitoring

No distributed tracing is implemented. No OpenTelemetry, Jaeger, Zipkin, or equivalent tracing library is present in any package's dependencies or source files.

No application performance monitoring (APM) agent is configured. No Sentry, New Relic, Datadog APM, or equivalent runtime monitoring integration exists.

No uptime monitoring, synthetic monitoring, or health-check endpoints are observed. The project is a library, not a server application, which limits the applicability of endpoint-level monitoring. No health-check design pattern is implemented for library consumers.

CI pipeline execution is observable through GitHub Actions workflow runs for `run-tests.yml`, `prepare-release.yml`, `release.yml`, and `start-pull-request.yml`. These workflows produce structured pass/fail status visible in the GitHub repository UI, which constitutes the project's primary observable runtime signal.

## Alerting

No explicit alerting thresholds beyond CI workflow failures are configured. When the `run-tests.yml` workflow fails (due to compilation errors, test failures, build failures, or coverage threshold violations), GitHub notifies the PR author via the platform's standard notification mechanism. No threshold configuration, alert routing, PagerDuty integration, Slack webhook, or equivalent alerting tool is present.

The CI workflow is the effective alerting mechanism: a failed step on a PR or push to `main` is the project's only observable alert signal.

## Observations

The project's observability posture reflects its nature as a small, experimental TypeScript library. The two logging utilities (`debug` and `tap`) are functional pipeline accessories rather than a logging framework. The error reporting function (`printPlggError`) provides ANSI-formatted console output for domain error chains, which is the most structured form of output in the codebase.

Code coverage is the only quantitative metric enforced. The 90% threshold gate in CI for `plgg` is the primary observable quality signal. The coverage reporters (`text`, `lcov`, `html`) generate artifacts locally but the HTML and lcov reports are not published to any dashboard or artifact store by the CI workflow.

The project relies entirely on native `console` API calls with no structured log format, no log routing, and no level-based filtering at the library layer.

## Gaps

The following observability areas have no codebase evidence:

- **Structured logging framework**: Not observed. No Winston, Pino, Bunyan, or equivalent. All log output uses the native `console` API.
- **Log levels beyond native console**: Not observed. No log level abstraction (e.g., `DEBUG`, `INFO`, `WARN`, `ERROR`) is implemented.
- **Log transport or aggregation**: Not observed. No log shipping to a centralized store (e.g., Elastic, Splunk, CloudWatch) is configured.
- **Distributed tracing**: Not observed. No tracing library or instrumentation exists.
- **APM or runtime monitoring**: Not observed. No Sentry, Datadog, New Relic, or equivalent agent is configured.
- **Metrics backend**: Not observed. No Prometheus, StatsD, or metrics endpoint is implemented.
- **Alerting integration**: Not observed. No Slack webhook, PagerDuty, email routing, or alerting rule configuration exists beyond GitHub's native CI failure notifications.
- **Coverage report publishing**: Not observed. The lcov and HTML coverage reports are generated locally but not uploaded to any coverage tracking service (e.g., Codecov, Coveralls).
- **Coverage enforcement for plgg-foundry and plgg-kit**: Not observed. These packages have `coverage: { all: true }` configured but no thresholds and no CI step.
